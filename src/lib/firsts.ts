// Firsts of 2026: one record per "first" a reliable source states, read from
// data/processed/firsts.csv (built from data/manual/firsts.csv). Nothing is
// added here; a missing figure stays null and the page says so.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './data';

export type FirstGroup = 'governors' | 'senate' | 'house' | 'other';

export interface First {
  year: number;
  office: string;
  group: FirstGroup;
  state: string;
  person: string;
  party: string;
  first: string;
  scope: 'national' | 'state';
  votes: number | null;
  voteShare: number | null;
  margin: number | null;
  sourceUrl: string;
  sourcePublisher: string;
  articleUrl: string;
  articleTitle: string;
  articlePublisher: string;
  articleDate: string;
  accessedAt: string;
  provisional: boolean;
}

const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : Number(v));

export function loadFirsts(): First[] {
  const rows = parseCsv(readFileSync(join(process.cwd(), 'data/processed/firsts.csv'), 'utf8'));
  return rows.map((r) => ({
    year: Number(r.year), office: r.office, group: r.group as FirstGroup, state: r.state_po,
    person: r.person, party: r.party, first: r.first, scope: r.scope as First['scope'],
    votes: num(r.votes), voteShare: num(r.vote_share), margin: num(r.margin),
    sourceUrl: r.source_url, sourcePublisher: r.source_publisher,
    articleUrl: r.article_url, articleTitle: r.article_title, articlePublisher: r.article_publisher,
    articleDate: r.article_date, accessedAt: r.accessed_at, provisional: r.provisional === 'True',
  }));
}

/** The Firsts page stays built, but nothing links to it until the manual file has rows. */
export function hasFirsts(): boolean {
  return loadFirsts().length > 0;
}

/** "1,234,567 votes, 54.2%, won by 8.7 points", leaving out any figure that is missing. */
export function howTheyDid(f: First): string {
  const parts: string[] = [];
  if (f.votes !== null) parts.push(`${f.votes.toLocaleString('en-US')} votes`);
  if (f.voteShare !== null) parts.push(`${f.voteShare.toFixed(1)}%`);
  if (f.margin !== null) parts.push(`won by ${f.margin.toFixed(1)} points`);
  return parts.length ? parts.join(', ') : 'Vote figures not yet entered';
}

export const GROUPS: { id: 'all' | FirstGroup; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'governors', label: 'Governors' }, { id: 'senate', label: 'Senate' },
  { id: 'house', label: 'House' }, { id: 'other', label: 'Other statewide offices' },
];

export function headline(n: number): string {
  if (n === 0) return 'No firsts confirmed yet in the 2026 elections';
  return `${n} ${n === 1 ? 'first' : 'firsts'} in the 2026 elections`;
}
