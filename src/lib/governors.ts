// Build-time access to the governors data (CC BY-SA 4.0, adapted from
// Wikipedia; see data/SOURCES.md). For each election year the map shows the
// governors in office on 1 February of the next year, after every January
// inauguration, so a year shows the result of that year's elections.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './data';

export type GovParty = 'D' | 'R' | 'I';

export interface Governor {
  name: string;
  party: GovParty;
  /** The page's own wording, e.g. "Democratic-Farmer-Labor". */
  detail: string;
  tookOffice: string;
}

export interface GovSnapshot {
  /** The election year this view belongs to. */
  year: number;
  /** ISO date the snapshot is taken on. */
  date: string;
  /** True when the year's results are not in the data yet (2026). */
  pending: boolean;
  states: Record<string, Governor>;
  counts: Record<GovParty, number>;
}

const ROOT = process.cwd();
const read = (p: string) => parseCsv(readFileSync(join(ROOT, p), 'utf8'));
const GROUP: Record<string, GovParty> = { Democratic: 'D', Republican: 'R', Independent: 'I' };

function snapshot(date: string) {
  const terms = read('data/processed/governors_terms.csv');
  const changes = read('data/manual/governor_party_changes.csv');
  const states: Record<string, Governor> = {};
  for (const t of terms) {
    if (t.took_office > date || (t.left_office && t.left_office <= date)) continue;
    const prev = states[t.state_po];
    if (prev && prev.tookOffice > t.took_office) continue;
    let party = t.party as GovParty;
    let detail = t.party_detail;
    for (const c of changes) {
      if (c.state_po !== t.state_po || c.governor !== t.governor) continue;
      const eff = c.effective.length === 7 ? `${c.effective}-01` : c.effective;
      if (eff <= date) {
        party = GROUP[c.party_to] ?? party;
        detail = c.party_to;
      }
    }
    states[t.state_po] = { name: t.governor, party, detail, tookOffice: t.took_office };
  }
  return states;
}

/** The last date the data reaches: terms run to 2025. */
const LAST_DATE = '2025-02-01';

export function loadGovernors(years: number[]): Record<number, GovSnapshot> {
  const out: Record<number, GovSnapshot> = {};
  for (const year of years) {
    const want = `${year + 1}-02-01`;
    const pending = want > LAST_DATE;
    const date = pending ? LAST_DATE : want;
    const states = snapshot(date);
    const n = Object.keys(states).length;
    if (n !== 50) throw new Error(`Governors on ${date}: ${n} states, expected 50`);
    const counts: Record<GovParty, number> = { D: 0, R: 0, I: 0 };
    for (const g of Object.values(states)) counts[g.party]++;
    out[year] = { year, date, pending, states, counts };
  }
  return out;
}

const NAMES: Record<GovParty, [string, string]> = {
  D: ['Democrat', 'Democrats'],
  R: ['Republican', 'Republicans'],
  I: ['independent', 'independents'],
};

/** "1 February 2025" */
export const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The finding line for a year, e.g. "Republicans held 27 of the 50 governorships after the 2024 elections". */
export function govHeadline(s: GovSnapshot): string {
  const lead: GovParty = s.counts.R >= s.counts.D ? 'R' : 'D';
  const who = NAMES[lead][1];
  if (s.pending) {
    return `${s.year} governor results are not yet entered. On ${longDate(s.date)}, ${who} held ${s.counts[lead]} of the 50 governorships`;
  }
  if (s.counts.R === s.counts.D) return `Democrats and Republicans each held ${s.counts.D} governorships after the ${s.year} elections`;
  return `${who} held ${s.counts[lead]} of the 50 governorships after the ${s.year} elections`;
}

/** "27 Republicans, 23 Democrats" (independents only when there are any). */
export function govCounts(s: GovSnapshot): string {
  const part = (p: GovParty) => `${s.counts[p]} ${NAMES[p][s.counts[p] === 1 ? 0 : 1]}`;
  return (['R', 'D', 'I'] as const).filter((p) => p !== 'I' || s.counts.I > 0).map(part).join(', ');
}

export const partyWord = (p: GovParty) => NAMES[p][0].replace(/^i/, 'I');
