// Geometry and words for the two balance cards: the Senate as a semicircle
// of seats and the House as labelled blocks. Shared by the build (default
// year) and src/scripts/cards.ts, which redraws them. No DOM here.
import { buildSquares, type Kind } from './seatbar.ts';
import type { Balance } from './mapData';
import type { HeaderYear } from './dashboardData';
import type { SenateControlDay } from './data';

/** The semicircle is drawn in this box: 100 units from the centre to the outer seat, plus room for the seat itself. */
export const HEMI = { outer: 100, inner: 46, rows: 5, seat: 9.6, pad: 8 } as const;

export interface Seat {
  x: number;
  y: number;
  /** Degrees to rotate a square so its sides follow the arc. */
  turn: number;
}

/**
 * Seat positions for a chamber of `total` seats on a few concentric arcs,
 * ordered left to right so that filling them in order makes a wedge per
 * party, as in a parliament chart. Rows get seats in proportion to their radius.
 */
export function hemicycle(total: number): Seat[] {
  const { outer, inner, rows } = HEMI;
  const radii = Array.from({ length: rows }, (_, k) => inner + (k * (outer - inner)) / (rows - 1));
  const sum = radii.reduce((a, b) => a + b, 0);
  const exact = radii.map((r) => (total * r) / sum);
  const counts = exact.map(Math.floor);
  let spare = total - counts.reduce((a, b) => a + b, 0);
  [...exact.keys()]
    .sort((a, b) => (exact[b] - Math.floor(exact[b])) - (exact[a] - Math.floor(exact[a])))
    .forEach((k) => { if (spare-- > 0) counts[k]++; });

  const seats: (Seat & { angle: number; r: number })[] = [];
  radii.forEach((r, k) => {
    const n = counts[k];
    for (let j = 0; j < n; j++) {
      const angle = Math.PI - (n === 1 ? Math.PI / 2 : (j * Math.PI) / (n - 1));
      seats.push({
        x: +(r * Math.cos(angle)).toFixed(2),
        y: +(-r * Math.sin(angle)).toFixed(2),
        turn: +(90 - (angle * 180) / Math.PI).toFixed(1),
        angle, r,
      });
    }
  });
  // Left to right by angle; on a tie, inner arc first.
  seats.sort((a, b) => b.angle - a.angle || a.r - b.r);
  return seats.map(({ x, y, turn }) => ({ x, y, turn }));
}

export type Party = 'dem' | 'gop';

/** Which kinds of square belong to which party's selection. */
export const partyOf = (k: Kind): Party | null =>
  k === 'dem' ? 'dem' : k === 'gop' ? 'gop' : null;

export function seatKinds(b: Balance, total: number): Kind[] {
  return buildSquares(b, total, 1);
}

export interface Block {
  id: 'dem' | 'ind' | 'gop' | 'other' | 'vacant';
  seats: number;
  /** Share of the chamber, in percent. */
  pct: number;
}

/** Blocks left to right: Democrats, independents, Republicans, then anything else. Empty groups are dropped. */
export function blocks(b: Balance, total: number): Block[] {
  if (b.dem === null || b.gop === null) return [];
  const ind = b.indDem + b.indGop + b.indUnknown;
  const raw: [Block['id'], number][] = [
    ['dem', b.dem], ['ind', ind], ['gop', b.gop], ['other', b.other], ['vacant', b.vacant],
  ];
  return raw.filter(([, n]) => n > 0).map(([id, seats]) => ({ id, seats, pct: +((seats / total) * 100).toFixed(3) }));
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** "+3 since 2022", "no change since 2022", or '' when there is nothing to compare with. */
export function changeText(now: number | null, before: number | null, since: number | null): string {
  if (now === null || before === null || since === null) return '';
  const d = now - before;
  return d === 0 ? `no change since ${since}` : `${signed(d)} since ${since}`;
}

/** Where the majority line sits along the House blocks, in percent from the left. */
export const markPct = (threshold: number, total: number) => +((threshold / total) * 100).toFixed(2);

export interface SeatMark {
  /** Both ends of the line, in the semicircle's units, and where its outer end sits across the box, in percent. */
  x1: number; y1: number; x2: number; y2: number;
  pct: number;
}

/**
 * The majority line across the semicircle: a radial line between the last
 * seat a majority needs, counted from the left, and the next one.
 */
export function seatMark(seats: Seat[], threshold: number): SeatMark {
  const ang = (s: Seat) => Math.atan2(-s.y, s.x);
  const a = (ang(seats[threshold - 1]) + ang(seats[threshold])) / 2;
  const box = HEMI.outer + HEMI.pad;
  const at = (r: number): [number, number] => [+(r * Math.cos(a)).toFixed(2), +(-r * Math.sin(a)).toFixed(2)];
  const [x1, y1] = at(HEMI.inner - HEMI.seat);
  const [x2, y2] = at(box);
  return { x1, y1, x2, y2, pct: +(((x2 + box) / (2 * box)) * 100).toFixed(2) };
}

// ---- Words, shared with the old summary band ----

const fmt = (n: number) => n.toLocaleString('en-US');

/** "2 I with D", or '' when there are no independents. */
export function independentsText(b: Balance): string {
  const parts: string[] = [];
  if (b.indDem) parts.push(`${b.indDem} I with D`);
  if (b.indGop) parts.push(`${b.indGop} I with R`);
  if (b.indUnknown) parts.push(`${b.indUnknown} I, caucus not known`);
  return parts.join(', ');
}

/** "2 independents who caucus with the Democrats", for the line under a card. */
export function independentsLine(b: Balance): string {
  const n = (k: number, who: string) => `${k} ${k === 1 ? 'independent' : 'independents'}${who}`;
  const parts: string[] = [];
  if (b.indDem) parts.push(n(b.indDem, ' who caucus with the Democrats'));
  if (b.indGop) parts.push(n(b.indGop, ' who caucus with the Republicans'));
  if (b.indUnknown) parts.push(n(b.indUnknown, ', caucus not known'));
  if (b.other) parts.push(`${b.other} from another party`);
  if (b.vacant) parts.push(`${b.vacant} vacant`);
  return parts.length ? parts.join('; ') : 'No independents or vacancies';
}

export const countText = (n: number | null) => (n === null ? 'n/a' : fmt(n));

/** Spoken summary of a card. */
export function cardLabel(name: string, caption: string, b: Balance, total: number, threshold: number): string {
  if (b.dem === null || b.gop === null) return `${name}: results not yet entered. ${threshold} seats for a majority.`;
  const ind = independentsText(b);
  return `${name}, ${caption}: ${fmt(b.dem)} Democrats, ${fmt(b.gop)} Republicans${ind ? `, ${ind}` : ''}${b.vacant ? `, ${b.vacant} vacant` : ''}. ${threshold} of ${total} seats for a majority.`;
}

// ---- What a card shows for a year ----


export interface ChamberView {
  id: 'house' | 'senate';
  name: string;
  total: number;
  threshold: number;
  caption: string;
  balance: Balance;
  kinds: Kind[];
  blocks: Block[];
  /** "+2 since 2022" for each party, '' when there is no baseline. */
  change: { dem: string; gop: string };
  label: string;
  /** The party that held the majority for most of the Congress. */
  controller: Party | null;
  /** The Senate count on the day control was settled, when that is not opening day. */
  controlDay: SenateControlDay | null;
}

/**
 * The cards for a year. The change is measured from the election before the
 * one shown. (Comparing two years has its own cards, below.)
 */
export function cardViews(h: HeaderYear): ChamberView[] {
  const baseline = h.before;
  return (['house', 'senate'] as const).map((id) => {
    const c = h[id];
    const base = baseline ? baseline[id] : null;
    const since = baseline ? baseline.year : null;
    return {
      id,
      name: id === 'house' ? 'House' : 'Senate',
      total: c.total,
      threshold: c.threshold,
      caption: c.caption,
      balance: c.balance,
      kinds: seatKinds(c.balance, c.total),
      blocks: blocks(c.balance, c.total),
      change: {
        dem: changeText(c.balance.dem, base?.dem ?? null, since),
        gop: changeText(c.balance.gop, base?.gop ?? null, since),
      },
      label: cardLabel(id === 'house' ? 'House' : 'Senate', c.caption, c.balance, c.total, c.threshold),
      controller: c.controller === 'DEM' ? 'dem' : c.controller === 'GOP' ? 'gop' : null,
      controlDay: c.controlDay,
    };
  });
}

// ---- The centre of the semicircle and the House blocks, as text ----

export const PARTY_WORD: Record<Party, string> = { dem: 'Democrats', gop: 'Republicans' };

/** The party with more seats once independents are counted with the party they caucus with; null for a tie or no results. */
export function leader(b: Balance): Party | null {
  if (b.dem === null || b.gop === null) return null;
  const d = b.dem + b.indDem;
  const r = b.gop + b.indGop;
  return d > r ? 'dem' : r > d ? 'gop' : null;
}

export interface Centre {
  big: string;
  who: string;
  change: string;
  /** The big text is a party name, not a seat count, so it is set smaller. */
  word: boolean;
}

/**
 * Opening day and most of the Congress can disagree (a tie broken by the vice
 * president, a seat filled later). The card then names the party that held
 * the majority for most of the Congress, because a number from opening day
 * would contradict the finding line.
 */
export const controlDiffers = (v: ChamberView): boolean => v.controller !== null && v.controller !== leader(v.balance);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "2021-01-20" as "20 January 2021". */
export const longDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** The number in the middle of the semicircle: the party picked, or else the party in control. */
export function centre(v: ChamberView, picked: Party | null): Centre {
  const b = v.balance;
  if (b.dem === null || b.gop === null) return { big: 'n/a', who: 'Results not yet entered', change: '', word: false };
  if (picked) return { big: countText(b[picked]), who: PARTY_WORD[picked], change: v.change[picked], word: false };
  if (v.controller && controlDiffers(v)) {
    const d = v.controlDay;
    if (d && d.controller.toLowerCase() === v.controller) {
      const n = v.controller === 'dem' ? d.dem + d.indWithDem : d.gop + d.indWithGop;
      return {
        big: String(n),
        who: d.basis === 'vice_president' ? `${PARTY_WORD[v.controller]}, with the vice president` : PARTY_WORD[v.controller],
        change: `From ${longDate(d.asOf)}`,
        word: false,
      };
    }
    return { big: PARTY_WORD[v.controller], who: 'held the majority for most of this Congress', change: '', word: true };
  }
  const p = leader(b);
  if (!p) return { big: `${countText(b.dem)} to ${countText(b.gop)}`, who: "Tied: the vice president's party controls", change: '', word: false };
  return { big: countText(b[p]), who: PARTY_WORD[p], change: v.change[p], word: false };
}

/** "On opening day: 51 Republicans, 46 Democrats, 2 independents, 1 vacant". */
export function openingDayLine(b: Balance): string {
  if (b.dem === null || b.gop === null) return 'Results not yet entered';
  const ind = b.indDem + b.indGop + b.indUnknown;
  const parts = [
    [b.gop, 'Republicans'], [b.dem, 'Democrats'],
  ].sort((x, y) => (y[0] as number) - (x[0] as number)).map(([n, w]) => `${n} ${w}`);
  if (ind) parts.push(`${ind} ${ind === 1 ? 'independent' : 'independents'}`);
  if (b.other) parts.push(`${b.other} from another party`);
  if (b.vacant) parts.push(`${b.vacant} vacant`);
  return `On opening day: ${parts.join(', ')}`;
}

/** The line under a card: opening-day counts when the card names the party in control, else who the independents are. */
export const cardLine = (v: ChamberView): string => (controlDiffers(v) ? openingDayLine(v.balance) : independentsLine(v.balance));

const BLOCK_NAME: Record<Block['id'], string> = {
  dem: 'Democrats', ind: 'Independents', gop: 'Republicans', other: 'Other', vacant: 'Vacant',
};

/** Blocks narrower than this (percent of the chamber) carry no text inside; the line under the card says what they are. */
const THIN = 9;

/** The House blocks, one flex item per party. Shared by the build and the browser script. */
export function blocksHtml(v: ChamberView, picked: Party | null): string {
  return v.blocks.map((b) => {
    const party = b.id === 'dem' || b.id === 'gop' ? b.id : null;
    const thin = b.pct < THIN;
    const inner = thin ? `<span class="visually-hidden">${BLOCK_NAME[b.id]}: ${b.seats} seats</span>` :
      `<span class="block__name">${BLOCK_NAME[b.id]}</span>` +
      `<span class="block__n">${countText(b.seats)}<span class="visually-hidden"> seats</span></span>` +
      (party && v.change[party] ? `<span class="block__chg">${v.change[party]}</span>` : '');
    const attrs = `class="block${thin ? ' block--thin' : ''}" data-block="${b.id}" style="flex-basis:${b.pct}%"`;
    return party
      ? `<button type="button" ${attrs} data-party="${party}" aria-pressed="${picked === party}">${inner}</button>`
      : `<div ${attrs}>${inner}</div>`;
  }).join('');
}
