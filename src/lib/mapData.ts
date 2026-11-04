// Build-time data for the map: one record per even election year, Senate
// and House, read from data/processed/. Everything the browser needs to
// switch years is in here, so the island never fetches anything.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseCsv, loadChamberControl, loadIndependents, PARTY_NAME,
  type Party, type ChamberControl, type Independent,
} from './data';

const ROOT = process.cwd();
const readCsv = (rel: string) => parseCsv(readFileSync(join(ROOT, rel), 'utf8'));
const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : Number(v));
const bool = (v: string | undefined) => v === 'True' || v === 'true';
const party = (v: string | undefined) => ((v ?? '').trim() || null) as Party | null;

export const FIRST_MAP_YEAR = 2000;
export const PROVISIONAL_YEAR = 2026;

/** Fill class of a state in the Senate view. */
export type SenateFill = 'dem' | 'gop' | 'ind' | 'other' | 'dem-lead' | 'gop-lead' | 'ind-lead' | 'pending' | 'no-race';

export interface SenateRace {
  special: boolean;
  /** As printed by the source, with "LAST, FIRST" turned round. */
  winnerName: string | null;
  winnerParty: Party | null;
  winnerCaucus: Party | null;
  runnerUpParty: Party | null;
  winnerPct: number | null;
  runnerUpPct: number | null;
  margin: number | null;
  /** Seat moved to the other caucus (AP convention, against the holder). */
  flipped: boolean | null;
  holderParty: Party | null;
  holderCaucus: Party | null;
  /** Party label changed but the caucus did not (e.g. Sinema to Gallego). */
  labelOnly: boolean;
  provisional: boolean;
  /** Only meaningful for provisional rows; null when the data has no call. */
  called: boolean | null;
}

export interface SenateStateYear {
  races: SenateRace[];
  fill: SenateFill;
  flipped: boolean;
}

export interface Balance {
  dem: number | null;
  gop: number | null;
  indDem: number;
  indGop: number;
  indUnknown: number;
  other: number;
  vacant: number;
}

export interface SenateYear {
  year: number;
  provisional: boolean;
  seatsUp: number;
  flips: number;
  /** Races with a winner entered. */
  decided: number;
  states: Record<string, SenateStateYear>;
  /** Senate at the opening of the Congress this election chose. */
  balance: Balance;
  congress: number;
  controlNote: string;
  headline: string;
}

export interface HouseStateYear {
  seats: number;
  dem: number | null;
  gop: number | null;
  indDem: number;
  indGop: number;
  indUnknown: number;
  other: number;
  vacant: number;
  demShare: number | null;
  gopShare: number | null;
  note: string;
  provisional: boolean;
  /** Seats won two years earlier, when the state had the same number of seats. */
  prev: { year: number; dem: number; gop: number } | null;
}

export interface HouseYear {
  year: number;
  provisional: boolean;
  /** Same key = same seats per state, so the squares keep their places. */
  apportionment: string;
  states: Record<string, HouseStateYear>;
  totals: Balance & { seats: number };
  headline: string;
}

export interface MapData {
  years: number[];
  senate: Record<number, SenateYear>;
  house: Record<number, HouseYear>;
  /** Seats per state for each apportionment key. */
  apportionments: Record<string, Record<string, number>>;
  stateNames: Record<string, string>;
}

const SUFFIX = /^(JR\.?|SR\.?|II|III|IV)$/i;
/** "MURKOWSKI, LISA" -> "LISA MURKOWSKI"; "ROBERT P. CASEY, JR." is left alone. */
export function displayName(raw: string): string {
  const m = raw.match(/^([^,]+),\s*(.+)$/);
  if (!m || SUFFIX.test(m[2].trim())) return raw.trim();
  return `${m[2].trim()} ${m[1].trim()}`;
}

const caucusOf = (inds: Independent[], chamber: 'house' | 'senate', congress: number, state: string) =>
  inds.find((i) => i.chamber === chamber && i.congress === congress && i.state === state)?.caucusesWith ?? null;

const congressFor = (year: number) => (year - 1786) / 2;

function senateFill(races: SenateRace[]): SenateFill {
  const fills = races.map((r): SenateFill => {
    if (!r.winnerParty) return 'pending';
    const p = r.winnerParty === 'DEM' ? 'dem' : r.winnerParty === 'GOP' ? 'gop' : r.winnerParty === 'IND' ? 'ind' : 'other';
    // Provisional and not called: the tint for "leading".
    if (r.provisional && r.called !== true && p !== 'other') return `${p}-lead` as SenateFill;
    return p;
  });
  const unique = [...new Set(fills)];
  if (unique.length > 1) {
    // Never happens through 2026. If it does, the map needs a split fill.
    throw new Error(`Two Senate races in one state with different results: ${JSON.stringify(races)}`);
  }
  return unique[0];
}

function balanceFrom(row: ChamberControl | undefined, inds: Independent[], chamber: 'house' | 'senate'): Balance {
  if (!row || row.dem === null || row.gop === null) {
    return { dem: null, gop: null, indDem: 0, indGop: 0, indUnknown: 0, other: 0, vacant: 0 };
  }
  const own = inds.filter((i) => i.chamber === chamber && i.congress === row.congress);
  const indDem = own.filter((i) => i.caucusesWith === 'DEM').length;
  const indGop = own.filter((i) => i.caucusesWith === 'GOP').length;
  return {
    dem: row.dem, gop: row.gop, indDem, indGop,
    indUnknown: Math.max((row.ind ?? 0) - indDem - indGop, 0),
    other: row.other ?? 0, vacant: row.vacant ?? 0,
  };
}

const many = (p: Party | null) => (p ? PARTY_NAME[p].many : 'No party');
const seatsWord = (n: number) => `${n} ${n === 1 ? 'seat' : 'seats'}`;

function senateHeadline(year: number, after: ChamberControl | undefined, before: ChamberControl | undefined,
  states: Record<string, SenateStateYear>): string {
  const all = Object.values(states).flatMap((s) => s.races);
  if (!all.some((r) => r.winnerParty)) return `The ${year} Senate results are not yet entered`;
  const aMaj = after ? after.majorityMostOfCongress ?? after.majorityParty : null;
  const bMaj = before ? before.majorityMostOfCongress ?? before.majorityParty : null;
  const flipsTo = (p: Party) => all.filter((r) => r.flipped && r.winnerCaucus === p).length;
  if (!aMaj) return `No party won control of the Senate in ${year}`;
  const other: Party = aMaj === 'DEM' ? 'GOP' : 'DEM';
  const won = flipsTo(aMaj);
  const lost = flipsTo(other);
  if (aMaj !== bMaj) {
    return `${many(aMaj)} took the Senate in ${year}, flipping ${seatsWord(won)}` +
      (lost ? ` and losing ${lost}` : '');
  }
  if (won === lost) {
    return won === 0
      ? `${many(aMaj)} kept the Senate in ${year} and no seat changed hands`
      : `${many(aMaj)} kept the Senate in ${year}, with ${won} seats flipping each way`;
  }
  return won > lost
    ? `${many(aMaj)} kept the Senate in ${year} and gained ${seatsWord(won - lost)}`
    : `${many(aMaj)} kept the Senate in ${year} despite losing ${seatsWord(lost - won)}`;
}

function houseHeadline(year: number, t: HouseYear['totals'], prev: HouseYear['totals'] | null): string {
  if (t.dem === null || t.gop === null) return `The ${year} House results are not yet entered`;
  const demSide = t.dem + t.indDem;
  const gopSide = t.gop + t.indGop;
  const maj: Party | null = demSide >= 218 ? 'DEM' : gopSide >= 218 ? 'GOP' : null;
  if (!maj) return `No party won a House majority in ${year}`;
  if (!prev || prev.dem === null || prev.gop === null) return `${many(maj)} won the House in ${year}`;
  const prevMaj: Party | null = prev.dem + prev.indDem >= 218 ? 'DEM' : prev.gop + prev.indGop >= 218 ? 'GOP' : null;
  const change = maj === 'DEM' ? t.dem - prev.dem : t.gop - prev.gop;
  if (maj !== prevMaj) return `${many(maj)} gained ${seatsWord(change)} and took the House in ${year}`;
  if (change === 0) return `${many(maj)} kept the House in ${year} with the same number of seats`;
  return change > 0
    ? `${many(maj)} kept the House in ${year} and gained ${seatsWord(change)}`
    : `${many(maj)} kept the House in ${year} despite losing ${seatsWord(-change)}`;
}

export function loadMapData(): MapData {
  const control = loadChamberControl();
  const inds = loadIndependents();
  const senateRows = readCsv('data/processed/senate_results_by_state.csv');
  const houseRows = readCsv('data/processed/house_delegations_by_state.csv');

  const stateNames: Record<string, string> = {};
  for (const r of [...senateRows, ...houseRows]) stateNames[r.state_po] = r.state;

  const years: number[] = [];
  for (let y = FIRST_MAP_YEAR; y <= PROVISIONAL_YEAR; y += 2) years.push(y);

  const row = (chamber: 'house' | 'senate', y: number) =>
    control.find((c) => c.chamber === chamber && c.electionYear === y);

  // ---- Senate ----
  const senate: Record<number, SenateYear> = {};
  for (const year of years) {
    const byState: Record<string, SenateRace[]> = {};
    for (const r of senateRows.filter((r) => Number(r.year) === year)) {
      const flipped = r.flipped_vs_holder === '' ? null : bool(r.flipped_vs_holder);
      (byState[r.state_po] ??= []).push({
        special: bool(r.special),
        winnerName: r.winner_name ? displayName(r.winner_name) : null,
        winnerParty: party(r.winner_party),
        winnerCaucus: party(r.winner_caucus),
        runnerUpParty: party(r.runner_up_party),
        winnerPct: num(r.winner_pct),
        runnerUpPct: num(r.runner_up_pct),
        margin: num(r.margin_pts),
        flipped,
        holderParty: party(r.holder_party),
        holderCaucus: party(r.holder_caucus),
        labelOnly: bool(r.party_changed) && flipped === false,
        provisional: bool(r.is_provisional),
        called: 'called' in r && r.called !== '' ? bool(r.called) : null,
      });
    }
    const states: Record<string, SenateStateYear> = {};
    for (const [st, races] of Object.entries(byState)) {
      races.sort((a, b) => Number(a.special) - Number(b.special));
      states[st] = { races, fill: senateFill(races), flipped: races.some((r) => r.flipped === true) };
    }
    const all = Object.values(states).flatMap((s) => s.races);
    const after = row('senate', year);
    senate[year] = {
      year,
      provisional: all.some((r) => r.provisional),
      seatsUp: all.length,
      flips: all.filter((r) => r.flipped === true).length,
      decided: all.filter((r) => r.winnerParty).length,
      states,
      balance: balanceFrom(after, inds, 'senate'),
      congress: congressFor(year),
      controlNote: after?.majorityNote ?? '',
      headline: senateHeadline(year, after, row('senate', year - 2), states),
    };
    if (all.length < 32 || all.length > 38) throw new Error(`Senate ${year}: ${all.length} races, expected 33 to 37`);
  }

  // ---- House ----
  const house: Record<number, HouseYear> = {};
  const apportionments: Record<string, Record<string, number>> = {};
  const apportionmentByKey = new Map<string, string>();
  for (const year of years) {
    const congress = congressFor(year);
    const states: Record<string, HouseStateYear> = {};
    for (const r of houseRows.filter((r) => Number(r.year) === year)) {
      const ind = num(r.ind) ?? 0;
      const caucus = ind ? caucusOf(inds, 'house', congress, r.state_po) : null;
      states[r.state_po] = {
        seats: Number(r.seats),
        dem: num(r.dem), gop: num(r.gop),
        indDem: caucus === 'DEM' ? ind : 0,
        indGop: caucus === 'GOP' ? ind : 0,
        indUnknown: caucus ? 0 : ind,
        other: num(r.other) ?? 0,
        vacant: num(r.vacant) ?? 0,
        demShare: num(r.dem_vote_share),
        gopShare: num(r.gop_vote_share),
        note: r.note,
        provisional: bool(r.is_provisional),
        prev: null,
      };
    }
    if (Object.keys(states).length !== 50) throw new Error(`House ${year}: ${Object.keys(states).length} states`);

    const seats = Object.fromEntries(Object.entries(states).map(([s, v]) => [s, v.seats]));
    const key = Object.entries(seats).sort().map(([s, n]) => `${s}${n}`).join('');
    let apportionment = apportionmentByKey.get(key);
    if (!apportionment) {
      apportionment = String(year);
      apportionmentByKey.set(key, apportionment);
      apportionments[apportionment] = seats;
    }

    const vals = Object.values(states);
    const sum = (f: (s: HouseStateYear) => number | null) => {
      const xs = vals.map(f);
      return xs.some((x) => x === null) ? null : (xs as number[]).reduce((a, b) => a + b, 0);
    };
    const totals = {
      seats: sum((s) => s.seats)!,
      dem: sum((s) => s.dem), gop: sum((s) => s.gop),
      indDem: sum((s) => s.indDem)!, indGop: sum((s) => s.indGop)!, indUnknown: sum((s) => s.indUnknown)!,
      other: sum((s) => s.other)!, vacant: sum((s) => s.vacant)!,
    };
    if (totals.seats !== 435) throw new Error(`House ${year}: ${totals.seats} seats, expected 435`);
    house[year] = {
      year,
      provisional: vals.some((s) => s.provisional),
      apportionment,
      states,
      totals,
      headline: '',
    };
  }
  for (const year of years) {
    const h = house[year];
    const p = house[year - 2];
    h.headline = houseHeadline(year, h.totals, p ? p.totals : null);
    if (!p) continue;
    for (const [st, s] of Object.entries(h.states)) {
      const q = p.states[st];
      if (q && q.seats === s.seats && q.dem !== null && q.gop !== null) s.prev = { year: year - 2, dem: q.dem, gop: q.gop };
    }
  }

  return { years, senate, house, apportionments, stateNames };
}
