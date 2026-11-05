// Build-time data for the three history charts (step 04, Part B). Every
// number, label and headline here is worked out from data/processed/; the
// components only lay it out.
import {
  loadChamberControl, loadIndependents, loadMidtermSwing, PARTY_NAME,
  type ChamberControl, type Party, type Chamber,
} from './data';
import { balanceFrom, type Balance, type MapData } from './mapData';
import { ordinal } from './mapText';

const many = (p: Party | null) => (p ? PARTY_NAME[p].many : 'No party');
const ADJ: Record<Party, string> = { DEM: 'Democratic', GOP: 'Republican', IND: 'Independent', OTHER: 'Other party' };
const LETTER: Record<Party, string> = { DEM: 'D', GOP: 'R', IND: 'I', OTHER: 'Other' };
const fmt = (n: number) => n.toLocaleString('en-US');
export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const surname = (name: string) => name.replace(/,? (Jr\.|Sr\.|III|II)$/, '').split(' ').pop() ?? name;

// ===================== Chart 1: who controlled Congress =====================

export interface ControlCell {
  balance: Balance;
  total: number;
  majority: Party | null;
  /** Footnote number when majority_note is set, else 0. */
  noteNo: number;
  provisional: boolean;
}

export interface ControlCongress {
  congress: number;
  electionYear: number;
  yearsServed: string;
  startYear: number;
  president: string;
  presidentParty: Party;
  house: ControlCell;
  senate: ControlCell;
  /** Party holding the presidency, House and Senate, if one does. */
  unified: Party | null;
  /** Plain-text summary, for the readout and the data table. */
  summary: string;
}

export interface Shift {
  congress: number;
  electionYear: number;
  heading: string;
  detail: string;
}

export interface ControlChart {
  congresses: ControlCongress[];
  notes: { no: number; congress: number; text: string }[];
  shifts: Shift[];
  /** Congresses in a row with one party in charge of everything, merged. */
  unifiedRuns: { from: number; to: number; party: Party }[];
  headline: string;
  minRun: number;
}

/** A majority change counts as a notable shift when it ends a run of at least this many Congresses. */
const SHIFT_MIN_RUN = 4;

function cellText(label: string, c: ControlCell): string {
  const b = c.balance;
  if (b.dem === null || b.gop === null) return `${label}: results not yet entered`;
  const ind = b.indDem + b.indGop + b.indUnknown;
  const parts = [`${fmt(b.dem)} D`, `${fmt(b.gop)} R`];
  if (ind) parts.push(`${ind} I`);
  if (b.other) parts.push(`${b.other} other`);
  if (b.vacant) parts.push(`${b.vacant} vacant`);
  return `${label}: ${parts.join(', ')}${c.majority ? `, ${ADJ[c.majority]} majority` : ''}`;
}

export function loadControlChart(): ControlChart {
  const control = loadChamberControl();
  const inds = loadIndependents();
  const byCongress = new Map<number, Partial<Record<Chamber, ChamberControl>>>();
  for (const r of control) (byCongress.get(r.congress) ?? byCongress.set(r.congress, {}).get(r.congress)!)[r.chamber] = r;

  const notes: ControlChart['notes'] = [];
  const cell = (r: ChamberControl): ControlCell => {
    let noteNo = 0;
    if (r.majorityNote) {
      noteNo = notes.length + 1;
      notes.push({ no: noteNo, congress: r.congress, text: `${ordinal(r.congress)} Congress, ${r.chamber === 'house' ? 'House' : 'Senate'}: ${r.majorityNote}` });
    }
    return {
      balance: balanceFrom(r, inds, r.chamber),
      total: r.totalSeats,
      majority: r.majorityMostOfCongress ?? r.majorityParty,
      noteNo,
      provisional: r.isProvisional,
    };
  };

  const congresses: ControlCongress[] = [...byCongress.keys()].sort((a, b) => a - b).map((n) => {
    const { house: h, senate: s } = byCongress.get(n)!;
    if (!h || !s) throw new Error(`Congress ${n} is missing a chamber`);
    const house = cell(h);
    const senate = cell(s);
    const unified = house.majority && house.majority === senate.majority && house.majority === h.presidentParty ? h.presidentParty : null;
    const start = Number(h.yearsServed.slice(0, 4));
    const summary = `${ordinal(n)} Congress, ${h.yearsServed.replace('-', ' to ')}, elected ${h.electionYear}${h.isProvisional ? ' (provisional)' : ''}. ` +
      `President: ${h.president} (${LETTER[h.presidentParty]}). ${cellText('House', house)}. ${cellText('Senate', senate)}.` +
      (unified ? ` ${many(unified)} held the presidency, House and Senate.` : '');
    return {
      congress: n, electionYear: h.electionYear, yearsServed: h.yearsServed, startYear: start,
      president: h.president, presidentParty: h.presidentParty, house, senate, unified, summary,
    };
  });

  const unifiedRuns: ControlChart['unifiedRuns'] = [];
  for (const c of congresses) {
    const last = unifiedRuns[unifiedRuns.length - 1];
    if (c.unified && last && last.party === c.unified && last.to === c.congress - 1) last.to = c.congress;
    else if (c.unified) unifiedRuns.push({ from: c.congress, to: c.congress, party: c.unified });
  }

  // Notable shifts: a chamber's majority changes hands after a run of SHIFT_MIN_RUN Congresses or more.
  const shifts: Shift[] = [];
  const runBefore = (i: number, ch: Chamber) => {
    const p = congresses[i - 1][ch].majority;
    let n = 0;
    for (let j = i - 1; j >= 0 && congresses[j][ch].majority === p; j--) n++;
    // A run reaching back to the first Congress in the data has an unknown start: not counted.
    return { party: p, n, known: i - n > 0 };
  };
  for (let i = 1; i < congresses.length; i++) {
    const c = congresses[i];
    const changes = (['house', 'senate'] as Chamber[])
      .map((ch) => ({ ch, now: c[ch].majority, run: runBefore(i, ch) }))
      .filter((x) => x.now && x.run.party && x.now !== x.run.party);
    if (!changes.some((x) => x.run.known && x.run.n >= SHIFT_MIN_RUN)) continue;
    const winner = changes[0].now!;
    const names = changes.map((x) => (x.ch === 'house' ? 'House' : 'Senate'));
    const longest = [...changes].sort((a, b) => b.run.n - a.run.n)[0];
    shifts.push({
      congress: c.congress,
      electionYear: c.electionYear,
      heading: `${c.electionYear}: ${many(winner)} take the ${names.join(' and ')}`,
      detail: `Ending ${longest.run.n * 2} years of ${ADJ[longest.run.party!]} control of the ${longest.ch === 'house' ? 'House' : 'Senate'}`,
    });
  }

  // Headline: the longest unified run.
  const longestUnified = [...unifiedRuns].sort((a, b) => (b.to - b.from) - (a.to - a.from) || a.from - b.from)[0];
  const certified = congresses.filter((c) => !c.house.provisional);
  const nUnified = certified.filter((c) => c.unified).length;
  const first = congresses.find((c) => c.congress === longestUnified.from)!;
  const last = congresses.find((c) => c.congress === longestUnified.to)!;
  const headline = `One party held the presidency, House and Senate in ${nUnified} of ${certified.length} Congresses since ${certified[0].startYear}; ` +
    `${many(longestUnified.party)} had the longest stretch, from ${first.startYear} to ${Number(last.yearsServed.slice(-4))}`;

  return { congresses, notes, shifts, unifiedRuns, headline, minRun: SHIFT_MIN_RUN };
}

// ===================== Chart 2: the midterm penalty =====================

export interface MidtermBar {
  year: number;
  president: string;
  presidentParty: Party;
  change: number | null;
  before: number | null;
  after: number | null;
  provisional: boolean;
  /** Short annotation for the exceptions, or ''. */
  note: string;
}

export interface MidtermChart {
  house: MidtermBar[];
  senate: MidtermBar[];
  years: number[];
  headline: Record<Chamber, string>;
  medianHouse: number;
  medianSentence: string;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function loadMidtermChart(): MidtermChart {
  const swing = loadMidtermSwing();
  const bars = (chamber: Chamber): MidtermBar[] => swing
    .filter((s) => s.chamber === chamber)
    .sort((a, b) => a.year - b.year)
    .map((s) => ({
      year: s.year,
      president: s.president,
      presidentParty: s.presidentParty,
      change: s.change,
      before: s.seatsBefore,
      after: s.seatsAfter,
      provisional: s.isProvisional,
      // The exceptions: the president's party gained House seats.
      note: chamber === 'house' && s.change !== null && s.change > 0 && !s.isProvisional
        ? `${surname(s.president)}'s ${many(s.presidentParty)} gained seats`
        : '',
    }));
  const house = bars('house');
  const senate = bars('senate');

  const done = (xs: MidtermBar[]) => xs.filter((b) => b.change !== null && !b.provisional);
  // Headlines count losses only: whether a party lost seats does not depend on
  // which "before" count is used, so it agrees with the usual election-day figures.
  const headline = (xs: MidtermBar[], word: string): string => {
    const d = done(xs);
    const lost = d.filter((b) => b.change! < 0).length;
    return `The party holding the White House lost ${word} seats in ${lost} of the ${d.length} midterms from ${d[0].year} to ${d[d.length - 1].year}`;
  };
  const hd = done(house);
  const medianHouse = median(hd.map((b) => b.change!));
  const medianSentence = `Across the ${hd.length} midterms from ${hd[0].year} to ${hd[hd.length - 1].year}, the median change in the House for the party holding the White House was ${signed(medianHouse)} seats.`;
  return {
    house, senate,
    years: house.map((b) => b.year),
    headline: { house: headline(house, 'House'), senate: headline(senate, 'Senate') },
    medianHouse,
    medianSentence,
  };
}

// ===================== Chart 3: seats that flipped =====================

export interface FlipRow {
  year: number;
  state: string;
  stateName: string;
  special: boolean;
  previous: Party | null;
  next: Party | null;
  winner: string;
  winnerParty: Party | null;
  margin: number | null;
  /** Party label changed but the seat stayed with the same caucus. */
  labelOnly: boolean;
  previousParty: Party | null;
}

export interface FlipCycle {
  year: number;
  toDem: number;
  toGop: number;
  /** Races with a result entered. */
  decided: number;
  provisional: boolean;
}

export interface FlipsChart {
  rows: FlipRow[];
  cycles: FlipCycle[];
  headline: string;
  max: number;
}

export function loadFlipsChart(map: MapData): FlipsChart {
  const years = [...map.years, ...map.senateOnlyYears].sort((a, b) => a - b);
  const rows: FlipRow[] = [];
  const cycles: FlipCycle[] = [];
  for (const y of years) {
    const sy = map.senate[y];
    let toDem = 0;
    let toGop = 0;
    for (const [st, s] of Object.entries(sy.states)) {
      for (const r of s.races) {
        if (r.flipped) {
          if (r.winnerCaucus === 'DEM') toDem++;
          else if (r.winnerCaucus === 'GOP') toGop++;
          else throw new Error(`${y} ${st}: flipped seat with winner caucus ${r.winnerCaucus}`);
        }
        if (!r.flipped && !r.labelOnly) continue;
        rows.push({
          year: y, state: st, stateName: map.stateNames[st], special: r.special,
          previous: r.holderCaucus ?? r.holderParty, next: r.winnerCaucus ?? r.winnerParty,
          previousParty: r.holderParty,
          winner: r.winnerName ?? 'Name not in source', winnerParty: r.winnerParty,
          margin: r.margin, labelOnly: r.labelOnly,
        });
      }
    }
    cycles.push({ year: y, toDem, toGop, decided: sy.decided, provisional: sy.provisional });
  }
  const done = cycles.filter((c) => !c.provisional);
  const top = [...done].sort((a, b) => (b.toDem + b.toGop) - (a.toDem + a.toGop) || a.year - b.year)[0];
  const evenDone = done.filter((c) => c.year % 2 === 0);
  const headline = `${top.toDem + top.toGop} Senate seats changed party in ${top.year}, the most of any election from ${evenDone[0].year} to ${evenDone[evenDone.length - 1].year}`;
  return { rows, cycles, headline, max: Math.max(...cycles.map((c) => Math.max(c.toDem, c.toGop))) };
}
