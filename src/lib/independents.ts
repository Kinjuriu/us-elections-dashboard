// Senate races involving independents, for the summary table. The list of
// races is the table in data/SOURCES.md ("Flip definitions"), so there is one
// copy of those facts. Winners' names come from senate_results_by_state.csv;
// holders are named in the SOURCES table by surname and are matched to a full
// name and a Biographical Directory id in members_by_congress.csv, which is
// built from the congress-legislators data. A name that cannot be matched to
// exactly one id is left without a link and listed in `unlinked`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './data';

export type TableParty = 'DEM' | 'GOP' | 'IND';

export interface Person {
  name: string;
  party: TableParty | null;
  /** Set when the caucus differs from the party label, e.g. an independent who caucused with the Democrats. */
  caucus: TableParty | null;
  /** Note from the SOURCES table, e.g. "appointed". */
  note: string;
  bioguideId: string | null;
}

export interface IndependentsRace {
  state: string;
  year: number;
  special: boolean;
  holder: Person;
  winner: Person;
  /** Counted as a flip: the seat changed caucus compared with whoever held it. */
  flip: boolean;
  /** Fill for the 32px square and the tint: the winning party, amber for an independent. */
  colour: 'dem' | 'gop' | 'ind';
  /** Which tint the row takes when it is a flip: the winner's caucus. */
  tint: 'dem' | 'gop' | null;
}

const ROOT = process.cwd();
const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
const clean = (n: string) => n.replace(/,\s*(jr\.?|sr\.?|ii|iii|iv)\s*$/i, '').trim();
const surnameOf = (n: string) => clean(n).split(/\s+/).filter((w) => !SUFFIX.test(w)).pop()!;
const tp = (s: string): TableParty | null => (s === 'DEM' || s === 'GOP' || s === 'IND' ? s : null);

/** "IND, DEM (Sanders)" -> party IND, caucus DEM, hint "Sanders". "DEM" -> party DEM. */
function parseSide(cell: string) {
  const m = cell.match(/^([^(]*?)\s*(?:\(([^)]*)\))?$/)!;
  const codes = m[1].split(',').map((c) => c.trim()).filter(Boolean);
  const [hint, ...rest] = (m[2] ?? '').split(',').map((c) => c.trim());
  return { party: tp(codes[0] ?? ''), caucus: tp(codes[1] ?? ''), hint: hint ?? '', note: rest.join(', ') };
}

export function loadIndependentsRaces(): { races: IndependentsRace[]; unlinked: string[] } {
  const md = readFileSync(join(ROOT, 'data/SOURCES.md'), 'utf8');
  const start = md.indexOf('Races involving independents, or where the definitions differ');
  if (start < 0) throw new Error('independents: table not found in data/SOURCES.md');
  const rows = md.slice(start).split('\n').filter((l) => l.startsWith('|')).slice(2)
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === 6);
  if (!rows.length) throw new Error('independents: no rows in the SOURCES table');

  const results = parseCsv(readFileSync(join(ROOT, 'data/processed/senate_results_by_state.csv'), 'utf8'));
  const members = parseCsv(readFileSync(join(ROOT, 'data/processed/members_by_congress.csv'), 'utf8'));
  const unlinked: string[] = [];

  /** The one person in this state whose name has this surname, or null. */
  const find = (state: string, surname: string) => {
    const re = new RegExp(`\\b${surname}\\b`, 'i');
    const hits = new Map<string, string>();
    for (const m of members) if (m.state_po === state && re.test(clean(m.name))) hits.set(m.bioguide_id, clean(m.name));
    return hits.size === 1 ? [...hits.entries()][0] : null;
  };

  const races = rows.map(([race, holderCell, winnerCell, vsHolder]) => {
    const [, state, yearText, special] = race.match(/^([A-Z]{2}) (\d{4})( special)?$/)!;
    const year = Number(yearText);
    const h = parseSide(holderCell);
    const w = parseSide(winnerCell);
    const res = results.find((r) => r.state_po === state && Number(r.year) === year && (r.special === 'True') === !!special);
    if (!res) throw new Error(`independents: no result row for ${race}`);

    const person = (side: ReturnType<typeof parseSide>, given: string | null): Person => {
      const surname = side.hint || (given ? surnameOf(given) : '');
      const hit = surname ? find(state, surname) : null;
      const name = given ?? hit?.[1] ?? surname;
      if (!hit) unlinked.push(`${name || '(no name)'} (${race})`);
      return { name: name || 'Name not in source', party: side.party, caucus: side.caucus && side.caucus !== side.party ? side.caucus : null, note: side.note, bioguideId: hit?.[0] ?? null };
    };
    const holder = person(h, null);
    const winner = person(w, res.winner_display_name || null);
    const winParty = winner.party;
    const winCaucus = winner.caucus ?? winner.party;
    return {
      state, year, special: !!special, holder, winner,
      flip: vsHolder === 'yes',
      colour: winParty === 'IND' ? 'ind' : winParty === 'GOP' ? 'gop' : 'dem',
      tint: winCaucus === 'DEM' ? 'dem' : winCaucus === 'GOP' ? 'gop' : null,
    } satisfies IndependentsRace;
  });
  return { races, unlinked };
}
