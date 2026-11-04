// Geometry for the railway year selector: which stations exist, and which
// stretches of each rail share a colour. Positions are station indexes, not
// pixels; the stylesheet turns an index into a position, so the same markup
// fits every width. No DOM here, so the tests can run it in Node.
import type { Party } from './data';

export type Fill = 'dem' | 'gop' | 'ind' | 'none';
export type RailChamber = 'house' | 'senate';

/** What the stripColumns() helper hands over for each election. */
export interface RailColumn {
  year: number;
  house: Party | null;
  senate: Party | null;
  special: boolean;
  provisional: boolean;
}

export interface Station {
  year: number;
  /** Position along the track, counted in stations from the first. */
  index: number;
  house: Fill;
  senate: Fill;
  provisional: boolean;
}

export interface Run {
  chamber: RailChamber;
  fill: Fill;
  /** Dashed outline instead of a solid fill: the rail for a Congress not yet elected. */
  dashed: boolean;
  /** Station index where the run starts and where it ends. The last run ends at index N - 0.5, the track's right edge. */
  from: number;
  to: number;
}

export interface Railway {
  stations: Station[];
  /** Runs of rail from the first station to the right edge. */
  runs: Run[];
  /** True when an independent decides control in some year, so the legend should say what amber means. */
  usesAmber: boolean;
}

/** The first election with a station. Earlier years are a faded track. */
export const FIRST_STATION_YEAR = 2000;

/**
 * Majority party to rail colour. Amber only where the data names an
 * independent as the majority, which it does not today; the independents who
 * caucus with a party are counted in that party's colour, as the seat counts do.
 */
export function fillOf(p: Party | null): Fill {
  if (p === 'DEM') return 'dem';
  if (p === 'GOP') return 'gop';
  if (p === 'IND') return 'ind';
  return 'none';
}

export function railway(columns: RailColumn[]): Railway {
  const stations: Station[] = columns
    .filter((c) => !c.special && c.year >= FIRST_STATION_YEAR)
    .map((c, index) => ({
      year: c.year,
      index,
      house: fillOf(c.house),
      senate: fillOf(c.senate),
      provisional: c.provisional,
    }));

  // The rail after a station carries that station's Congress. The last
  // station's Congress has not been seated, so its stub is dashed.
  const runs: Run[] = [];
  for (const chamber of ['house', 'senate'] as const) {
    let open: Run | null = null;
    stations.forEach((s, i) => {
      const last = i === stations.length - 1;
      const fill = s[chamber];
      const dashed = last && s.provisional;
      if (open && open.fill === fill && open.dashed === dashed) return;
      if (open) open.to = i;
      open = { chamber, fill, dashed, from: i, to: stations.length - 0.5 };
      runs.push(open);
    });
  }
  const usesAmber = stations.some((s) => s.house === 'ind' || s.senate === 'ind');
  return { stations, runs, usesAmber };
}

const NAME: Record<Fill, string> = { dem: 'Democrats', gop: 'Republicans', ind: 'Independents', none: 'not yet decided' };

/** Spoken name for a station: "2018. House: Democrats. Senate: Republicans." */
export function stationLabel(s: Station): string {
  const tail = s.provisional ? ' Provisional.' : '';
  return `${s.year}. House: ${NAME[s.house]}. Senate: ${NAME[s.senate]}.${tail}`;
}

/** The station that stands for a year: an odd special-election year belongs to the Congress sitting then. */
export function stationYearFor(year: number): number {
  return year % 2 === 0 ? year : year - 1;
}

/** The station nearest to a position, for dragging. `xs` are station centres in the same units. */
export function nearest(xs: number[], x: number): number {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
  return best;
}
