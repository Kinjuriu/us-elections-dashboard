// Geometry and words for the summary band: one row of squares per chamber,
// one square per Senate seat and one per five House seats. Shared by the
// build (default view) and src/scripts/band.ts. No DOM here.
import { buildSquares, type Kind } from './seatbar';
import type { Balance } from './mapData';

export type BandChamber = 'house' | 'senate';

export const CELL = 6;
export const PITCH = 7;
export const SEATS_PER_SQUARE: Record<BandChamber, number> = { house: 5, senate: 1 };

/** The row of squares wide screens get, and the two-row version for phones. */
export const SHAPES = [
  { id: 'wide', rows: 1 },
  { id: 'narrow', rows: 2 },
] as const;

export interface BandShape {
  id: string;
  rows: number;
  width: number;
  height: number;
  /** x of the majority tick, in the svg's units and as a percent of its width. */
  tickX: number;
  tickPct: number;
  /** Position of each square, in seat order (filled column by column). */
  at: [number, number][];
}

export function shapes(chamber: BandChamber, total: number, threshold: number): BandShape[] {
  const per = SEATS_PER_SQUARE[chamber];
  const n = Math.round(total / per);
  return SHAPES.map(({ id, rows }) => {
    const cols = Math.ceil(n / rows);
    const width = cols * PITCH - (PITCH - CELL);
    const height = rows * PITCH - (PITCH - CELL);
    // The tick sits after the last square a party needs, counted from the left.
    const k = Math.round(threshold / per);
    const tickX = Math.ceil(k / rows) * PITCH - (PITCH - CELL) / 2;
    return {
      id, rows, width, height, tickX,
      tickPct: +((tickX / width) * 100).toFixed(2),
      at: Array.from({ length: n }, (_, i): [number, number] => [Math.floor(i / rows) * PITCH, (i % rows) * PITCH]),
    };
  });
}

export function kinds(chamber: BandChamber, b: Balance, total: number): Kind[] {
  return buildSquares(b, total, SEATS_PER_SQUARE[chamber]);
}

const fmt = (n: number) => n.toLocaleString('en-US');

/** "2 I with D", or '' when there are no independents. */
export function independentsText(b: Balance): string {
  const parts: string[] = [];
  if (b.indDem) parts.push(`${b.indDem} I with D`);
  if (b.indGop) parts.push(`${b.indGop} I with R`);
  if (b.indUnknown) parts.push(`${b.indUnknown} I, caucus not known`);
  return parts.join(', ');
}

export const countText = (n: number | null) => (n === null ? 'n/a' : fmt(n));

/** Spoken summary of a row. */
export function rowLabel(chamber: BandChamber, year: string, b: Balance, total: number, threshold: number): string {
  const name = chamber === 'house' ? 'House' : 'Senate';
  if (b.dem === null || b.gop === null) return `${name}${year}: results not yet entered. ${threshold} seats for a majority.`;
  const ind = independentsText(b);
  return `${name}${year}: ${fmt(b.dem)} Democrats, ${fmt(b.gop)} Republicans${ind ? `, ${ind}` : ''}${b.vacant ? `, ${b.vacant} vacant` : ''}. ${threshold} of ${total} seats for a majority.`;
}
