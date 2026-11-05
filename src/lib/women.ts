// Women in Congress: both chambers together, as a share of every member who
// served in the Congress (the counting rule in the notes). Read from
// data/processed/women_by_congress.csv.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './data';

export interface WomenRow {
  congress: number;
  startYear: number;
  women: number;
  men: number;
  womenDem: number;
  womenGop: number;
  womenOther: number;
  /** Women as a percentage of all members, one decimal. */
  pct: number;
  /** Squares to fill: one per 1% of members. */
  squares: number;
}

export interface WomenChart {
  rows: WomenRow[];
  headline: string;
}

/** Every fourth Congress from the first in the file, plus the latest. */
export function loadWomenChart(): WomenChart {
  const raw = parseCsv(readFileSync(join(process.cwd(), 'data/processed/women_by_congress.csv'), 'utf8'));
  const by = new Map<number, WomenRow>();
  for (const r of raw) {
    const congress = Number(r.congress);
    const prev = by.get(congress);
    const women = Number(r.women) + (prev?.women ?? 0);
    const men = Number(r.men) + (prev?.men ?? 0);
    const share = (women / (women + men)) * 100;
    by.set(congress, {
      congress, startYear: Number(r.start_year), women, men,
      womenDem: Number(r.women_dem) + (prev?.womenDem ?? 0),
      womenGop: Number(r.women_gop) + (prev?.womenGop ?? 0),
      womenOther: Number(r.women_other) + (prev?.womenOther ?? 0),
      pct: +share.toFixed(1),
      squares: Math.round(share),
    });
  }
  const all = [...by.values()].sort((a, b) => a.congress - b.congress);
  const first = all[0];
  const last = all[all.length - 1];
  const rows = all.filter((r) => (r.congress - first.congress) % 4 === 0 || r === last);
  return {
    rows,
    headline: `Women held ${last.pct}% of seats in Congress in ${last.startYear}, up from ${first.pct}% in ${first.startYear}`,
  };
}
