// Seat-bar logic shared by the build-time component (SeatBar.astro) and the
// map island, which redraws the bar when the year changes. No DOM here.

export type Kind =
  | 'dem' | 'dem-flip' | 'dem-lead' | 'ind-dem'
  | 'other' | 'vacant' | 'ind-unknown' | 'missing'
  | 'ind-gop' | 'gop-lead' | 'gop-flip' | 'gop';

export interface SeatCounts {
  /** Seats won. `null` means not yet entered: the bar shows them as missing. */
  dem: number | null;
  gop: number | null;
  demLeading?: number;
  gopLeading?: number;
  demFlipped?: number;
  gopFlipped?: number;
  indDem?: number;
  indGop?: number;
  indUnknown?: number;
  other?: number;
  vacant?: number;
}

export const OUTLINED: Kind[] = ['vacant', 'missing'];

/** Kinds that can appear in the key, in display order. */
export const KEY_KINDS: Kind[] = ['ind-dem', 'ind-gop', 'ind-unknown', 'other', 'vacant', 'dem-flip', 'dem-lead', 'missing'];

const n0 = (v: number | undefined) => v ?? 0;

export function knownSeats(c: SeatCounts): number {
  if (c.dem === null || c.gop === null) return 0;
  return c.dem + c.gop + n0(c.demLeading) + n0(c.gopLeading) + n0(c.indDem) + n0(c.indGop) +
    n0(c.indUnknown) + n0(c.other) + n0(c.vacant);
}

/** One entry per square, Democrats from the left and Republicans from the right. */
export function buildSquares(c: SeatCounts, total: number, seatsPerSquare = 1): Kind[] {
  const hasResults = c.dem !== null && c.gop !== null;
  const known = knownSeats(c);
  if (known > total) throw new Error(`${known} seats given for a chamber of ${total}.`);
  const seats: [Kind, number][] = hasResults
    ? [
        ['dem', c.dem! - n0(c.demFlipped)], ['dem-flip', n0(c.demFlipped)], ['dem-lead', n0(c.demLeading)],
        ['ind-dem', n0(c.indDem)], ['other', n0(c.other)], ['vacant', n0(c.vacant)],
        ['ind-unknown', n0(c.indUnknown)], ['missing', total - known], ['ind-gop', n0(c.indGop)],
        ['gop-lead', n0(c.gopLeading)], ['gop-flip', n0(c.gopFlipped)], ['gop', c.gop! - n0(c.gopFlipped)],
      ]
    : [['missing', total]];

  // With N seats per square, round by largest remainder so the squares
  // still add up to round(total / N).
  const nSquares = Math.round(total / seatsPerSquare);
  const floors = seats.map(([k, n]) => {
    const v = n / seatsPerSquare;
    return [k, Math.floor(v), v - Math.floor(v)] as const;
  });
  let spare = nSquares - floors.reduce((s, [, f]) => s + f, 0);
  const counts = new Map<Kind, number>(floors.map(([k, f]) => [k, f]));
  [...floors].sort((a, b) => b[2] - a[2]).forEach(([k]) => {
    if (spare > 0) { counts.set(k, (counts.get(k) ?? 0) + 1); spare--; }
  });
  return seats.flatMap(([k]) => Array<Kind>(counts.get(k) ?? 0).fill(k));
}

export function fills(uid: string): Record<Kind, string> {
  return {
    dem: 'var(--dem)',
    'dem-flip': `url(#${uid}-hatch-dem)`,
    'dem-lead': 'var(--dem-tint)',
    'ind-dem': 'var(--ind)',
    other: 'var(--ink-3)',
    vacant: 'var(--paper)',
    'ind-unknown': 'var(--ind)',
    missing: 'var(--no-race)',
    'ind-gop': 'var(--ind)',
    'gop-lead': 'var(--gop-tint)',
    'gop-flip': `url(#${uid}-hatch-gop)`,
    gop: 'var(--gop)',
  };
}

const fmt = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

/** Key text for each category present beyond plain won seats. */
export function keyItems(c: SeatCounts, total: number): Partial<Record<Kind, string>> {
  const hasResults = c.dem !== null && c.gop !== null;
  const missing = hasResults ? total - knownSeats(c) : total;
  const out: Partial<Record<Kind, string>> = {};
  if (n0(c.indDem)) out['ind-dem'] = `${plural(n0(c.indDem), 'independent', 'independents')} who caucus with the Democrats`;
  if (n0(c.indGop)) out['ind-gop'] = `${plural(n0(c.indGop), 'independent', 'independents')} who caucus with the Republicans`;
  if (n0(c.indUnknown)) out['ind-unknown'] = `${plural(n0(c.indUnknown), 'independent', 'independents')}, caucus not known`;
  if (n0(c.other)) out.other = `${plural(n0(c.other), 'member', 'members')} of another party`;
  if (n0(c.vacant)) out.vacant = plural(n0(c.vacant), 'vacant seat', 'vacant seats');
  if (n0(c.demFlipped) || n0(c.gopFlipped)) out['dem-flip'] = 'Flipped seat';
  if (n0(c.demLeading) || n0(c.gopLeading)) out['dem-lead'] = 'Leading, not yet called';
  if (missing) out.missing = `${plural(missing, 'seat', 'seats')} not yet entered`;
  return out;
}

export function summary(label: string, c: SeatCounts, total: number, threshold: number, provisional: boolean): string {
  if (c.dem === null || c.gop === null) {
    return `${label}: results not yet entered. ${fmt(threshold)} seats for a majority.`;
  }
  const ind = n0(c.indDem) + n0(c.indGop) + n0(c.indUnknown);
  const missing = total - knownSeats(c);
  return `${label}: ${fmt(c.dem)} Democrats, ${fmt(c.gop)} Republicans` +
    (ind ? `, ${fmt(ind)} independents` : '') +
    (c.other ? `, ${fmt(c.other)} other` : '') +
    (c.vacant ? `, ${fmt(c.vacant)} vacant` : '') +
    (missing ? `, ${fmt(missing)} not yet entered` : '') +
    `. ${fmt(threshold)} seats for a majority.` +
    (provisional ? ' Provisional.' : '');
}
