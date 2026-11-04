// Build-time access to data/processed/. Runs in Node during `astro build`;
// nothing here ships to the browser.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

type Row = Record<string, string>;

/** Parse RFC 4180 CSV (quoted fields, doubled quotes, commas and newlines inside quotes). */
export function parseCsv(text: string): Row[] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      record.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      records.push(record); record = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || record.length) { record.push(field); records.push(record); }

  const [header, ...body] = records.filter((r) => r.length > 1 || r[0] !== '');
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ''])));
}

function readCsv(relPath: string): Row[] {
  return parseCsv(readFileSync(join(ROOT, relPath), 'utf8'));
}

/** Empty string means missing. Never turn it into zero. */
function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const bool = (v: string | undefined) => v === 'True' || v === 'true';

export type Party = 'DEM' | 'GOP' | 'IND' | 'OTHER';
export type Chamber = 'house' | 'senate';

export interface ChamberControl {
  congress: number;
  electionYear: number;
  yearsServed: string;
  chamber: Chamber;
  totalSeats: number;
  dem: number | null;
  gop: number | null;
  ind: number | null;
  other: number | null;
  vacant: number | null;
  majorityParty: Party | null;
  majorityMostOfCongress: Party | null;
  majorityNote: string;
  majorityThreshold: number;
  president: string;
  presidentParty: Party;
  isMidterm: boolean;
  isProvisional: boolean;
  sourceId: string;
}

export interface Independent {
  chamber: Chamber;
  congress: number;
  name: string;
  state: string;
  caucusesWith: Party | null;
  verified: boolean;
}

export interface MidtermSwing {
  year: number;
  president: string;
  presidentParty: Party;
  chamber: Chamber;
  seatsBefore: number | null;
  seatsAfter: number | null;
  change: number | null;
  isProvisional: boolean;
  flag: string;
}

/**
 * The name a reader would use for a president. The data keeps the source's
 * formal name; copy uses the common one ("Bill Clinton", not "William J. Clinton").
 */
const COMMON_NAMES: Record<string, string> = {
  'Donald J. Trump': 'Donald Trump',
  'Dwight D. Eisenhower': 'Dwight Eisenhower',
  'Gerald R. Ford': 'Gerald Ford',
  'Harry S. Truman': 'Harry Truman',
  'Joseph R. Biden Jr.': 'Joe Biden',
  'Lyndon B. Johnson': 'Lyndon Johnson',
  'Richard M. Nixon': 'Richard Nixon',
  'William J. Clinton': 'Bill Clinton',
};
export const commonName = (name: string) => COMMON_NAMES[name] ?? name;

export function loadChamberControl(): ChamberControl[] {
  return readCsv('data/processed/chamber_control.csv').map((r) => ({
    congress: Number(r.congress),
    electionYear: Number(r.election_year),
    yearsServed: r.years_served,
    chamber: r.chamber as Chamber,
    totalSeats: Number(r.total_seats),
    dem: num(r.dem),
    gop: num(r.gop),
    ind: num(r.ind),
    other: num(r.other),
    vacant: num(r.vacant),
    majorityParty: (r.majority_party || null) as Party | null,
    majorityMostOfCongress: (r.majority_party_most_of_congress || null) as Party | null,
    majorityNote: r.majority_note,
    majorityThreshold: Number(r.majority_threshold),
    president: commonName(r.president),
    presidentParty: r.president_party as Party,
    isMidterm: bool(r.is_midterm),
    isProvisional: bool(r.is_provisional),
    sourceId: r.source_id,
  }));
}

export function loadIndependents(): Independent[] {
  return readCsv('data/processed/independents.csv').map((r) => ({
    chamber: r.chamber as Chamber,
    congress: Number(r.congress),
    name: r.name,
    state: r.state_po,
    caucusesWith: (r.caucuses_with || null) as Party | null,
    verified: bool(r.verified_in_source),
  }));
}

export function loadMidtermSwing(): MidtermSwing[] {
  return readCsv('data/processed/midterm_swing.csv').map((r) => ({
    year: Number(r.year),
    president: commonName(r.president),
    presidentParty: r.president_party as Party,
    chamber: r.chamber as Chamber,
    seatsBefore: num(r.seats_before),
    seatsAfter: num(r.seats_after),
    change: num(r.change),
    isProvisional: bool(r.is_provisional),
    flag: r.flag,
  }));
}

/** A row has results when the party counts are filled in. */
export const hasCounts = (r: ChamberControl) => r.dem !== null && r.gop !== null;

/**
 * The latest election for a chamber, plus the latest one with counts.
 * They differ while the newest election (2026) has no results entered.
 */
export function latestElection(rows: ChamberControl[], chamber: Chamber) {
  const own = rows.filter((r) => r.chamber === chamber).sort((a, b) => a.electionYear - b.electionYear);
  const newest = own[own.length - 1];
  const withCounts = [...own].reverse().find(hasCounts);
  return { newest, withCounts };
}

/** Access time recorded for a source in data/raw/manifest.json, if any. */
export function sourceAccessedAt(sourceId: string): Date | null {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'data/raw/manifest.json'), 'utf8')) as Record<
    string,
    { accessed_at?: string }
  >;
  const at = manifest[sourceId]?.accessed_at;
  return at ? new Date(at) : null;
}

/** "4 November 2026" */
export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export const PARTY_NAME: Record<Party, { one: string; many: string }> = {
  DEM: { one: 'Democrat', many: 'Democrats' },
  GOP: { one: 'Republican', many: 'Republicans' },
  IND: { one: 'Independent', many: 'Independents' },
  OTHER: { one: 'Other party', many: 'Other parties' },
};

export interface SenateRace {
  year: number;
  state: string;
  special: boolean;
  winnerParty: Party | null;
  flippedVsHolder: boolean | null;
  isProvisional: boolean;
  sourceId: string;
}

export function loadSenateRaces(): SenateRace[] {
  return readCsv('data/processed/senate_results_by_state.csv').map((r) => ({
    year: Number(r.year),
    state: r.state_po,
    special: bool(r.special),
    winnerParty: (r.winner_party || null) as Party | null,
    flippedVsHolder: r.flipped_vs_holder === '' ? null : bool(r.flipped_vs_holder),
    isProvisional: bool(r.is_provisional),
    sourceId: r.source_id,
  }));
}
