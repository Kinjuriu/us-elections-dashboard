// Comparing two years: the sentence that replaces the finding line, and the
// cards' comparison view (two House bars on one scale, two small semicircles).
// Both years are always shown earlier first, whichever is on the railway.
// No DOM here.
import { hemicycle, seatMark, seatKinds, blocks, markPct, countText, HEMI, PARTY_WORD, type Party } from './cards.ts';
import type { Balance } from './mapData';
import type { HeaderYear, HeaderChamber } from './dashboardData';

/** The two years, earlier first. */
export const orderPair = (a: number, b: number): [number, number] => (a <= b ? [a, b] : [b, a]);

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

interface Move { party: Party; d: number }

/** The party whose seat count moved most in a chamber (Democrats first on a tie), or null when none moved. */
function biggestMove(e: Balance, l: Balance): Move | null | undefined {
  if (e.dem === null || e.gop === null || l.dem === null || l.gop === null) return undefined;
  const moves: Move[] = [{ party: 'dem', d: l.dem - e.dem }, { party: 'gop', d: l.gop - e.gop }];
  const top = moves.sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
  return top.d === 0 ? null : top;
}

const verb = (d: number) => (d > 0 ? 'gained' : 'lost');
const seats = (n: number, name: string) => `${n} ${name} ${n === 1 ? 'seat' : 'seats'}`;

/**
 * "Republicans gained 4 Senate seats; Democrats lost 7 House seats". When the
 * same party made the biggest move in both chambers, it is named once.
 */
function movesPhrase(senate: Move | null | undefined, house: Move | null | undefined): string {
  const one = (name: string, m: Move | null | undefined) =>
    m === undefined ? `${name} results not yet entered`
      : m === null ? `no ${name} seats changed party`
        : `${PARTY_WORD[m.party]} ${verb(m.d)} ${seats(Math.abs(m.d), name)}`;
  if (senate && house && senate.party === house.party && verb(senate.d) === verb(house.d)) {
    return `${PARTY_WORD[senate.party]} ${verb(senate.d)} ${seats(Math.abs(senate.d), 'Senate')} and ${seats(Math.abs(house.d), 'House')}`;
  }
  return `${one('Senate', senate)}; ${one('House', house)}`;
}

/** "2020 compared with 2024: Republicans gained 4 Senate seats; Democrats lost 7 House seats". */
export function compareLine(a: HeaderYear, b: HeaderYear): string {
  const [e, l] = a.year <= b.year ? [a, b] : [b, a];
  return `${e.year} compared with ${l.year}: ${movesPhrase(biggestMove(e.senate.balance, l.senate.balance), biggestMove(e.house.balance, l.house.balance))}`;
}

/** "Democrats 222 to 215 (-7)" */
export function changeLine(party: Party, from: number | null, to: number | null): string {
  if (from === null || to === null) return `${PARTY_WORD[party]}: n/a`;
  return `${PARTY_WORD[party]} ${countText(from)} to ${countText(to)} (${to === from ? '0' : signed(to - from)})`;
}

/** Spoken summary of one year's cards for a chamber. */
const label = (name: string, year: number, b: Balance) =>
  b.dem === null || b.gop === null ? `${name} ${year}: results not yet entered`
    : `${name} ${year}: ${b.dem} Democrats, ${b.gop} Republicans, ${b.indDem + b.indGop + b.indUnknown} independents, ${b.vacant} vacant`;

// ---- House: one bar per year, on the same scale ----

function houseBar(year: number, c: HeaderChamber): string {
  const bs = blocks(c.balance, c.total);
  const cells = bs.map((b) => {
    const thin = b.pct < 9;
    const inner = thin
      ? `<span class="visually-hidden">${b.id}: ${b.seats} seats</span>`
      : `<span class="block__n">${countText(b.seats)}</span>`;
    return `<div class="block block--cmp${thin ? ' block--thin' : ''}" data-block="${b.id}" style="flex-basis:${b.pct}%">${inner}</div>`;
  }).join('');
  return `<div class="cmpbar"><p class="cmpbar__year">${year}</p>` +
    `<div class="blocks__row cmpbar__row" role="img" aria-label="${label('House', year, c.balance)}">${cells}</div></div>`;
}

export function compareHouseHtml(e: HeaderYear, l: HeaderYear): string {
  const [ec, lc] = [e.house, l.house];
  const mark = markPct(lc.threshold, lc.total);
  return `<div class="blocks cmpblocks">` +
    `<p class="mark" style="left:${mark}%" aria-hidden="true"><span class="mark__n">${lc.threshold} for a majority</span><span class="mark__tri"></span></p>` +
    houseBar(e.year, ec) + houseBar(l.year, lc) +
    `<span class="blocks__line" style="left:${mark}%" aria-hidden="true"></span></div>` +
    `<p class="card__line card__line--major">${changeLine('dem', ec.balance.dem, lc.balance.dem)}</p>` +
    `<p class="card__line card__line--major">${changeLine('gop', ec.balance.gop, lc.balance.gop)}</p>`;
}

// ---- Senate: two small semicircles side by side ----

function hemiSmall(year: number, c: HeaderChamber): string {
  const pos = hemicycle(c.total);
  const kinds = seatKinds(c.balance, c.total);
  const box = HEMI.outer + HEMI.pad;
  const half = HEMI.seat / 2;
  const m = seatMark(pos, c.threshold);
  const rects = pos.map((s, i) =>
    `<rect x="${-half}" y="${-half}" width="${HEMI.seat}" height="${HEMI.seat}" transform="translate(${s.x} ${s.y}) rotate(${s.turn})" data-kind="${kinds[i]}"/>`).join('');
  return `<figure class="chemi"><figcaption class="chemi__year">${year}</figcaption>` +
    `<svg viewBox="${-box} ${-box + HEMI.pad * 2} ${2 * box} ${box - HEMI.pad}" role="img" aria-label="${label('Senate', year, c.balance)}">${rects}` +
    `<line class="hemi__line" x1="${m.x1}" x2="${m.x2}" y1="${m.y1}" y2="${m.y2}"/></svg>` +
    `<p class="chemi__n">${c.balance.dem ?? 'n/a'} D · ${c.balance.gop ?? 'n/a'} R</p></figure>`;
}

export function compareSenateHtml(e: HeaderYear, l: HeaderYear): string {
  return `<div class="chemis">${hemiSmall(e.year, e.senate)}${hemiSmall(l.year, l.senate)}</div>` +
    `<p class="card__line card__line--major">${changeLine('dem', e.senate.balance.dem, l.senate.balance.dem)}</p>` +
    `<p class="card__line card__line--major">${changeLine('gop', e.senate.balance.gop, l.senate.balance.gop)}</p>`;
}
