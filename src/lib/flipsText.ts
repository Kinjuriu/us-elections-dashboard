// The flips table for one year, as HTML. Shared by the build (default year)
// and the browser (every other year), so both render the same thing.
// No DOM and no Node APIs here.
import type { Party } from './data';
import type { FlipRow } from './chartData';
import { stateShapeUse } from './stateUse';

export type FlipSort = 'state' | 'margin-asc' | 'margin-desc';

const ADJ: Record<Party, string> = { DEM: 'Democratic', GOP: 'Republican', IND: 'Independent', OTHER: 'Other party' };
const NOUN: Record<Party, string> = { DEM: 'Democrat', GOP: 'Republican', IND: 'Independent', OTHER: 'Other party' };
const LETTER: Record<Party, string> = { DEM: 'D', GOP: 'R', IND: 'I', OTHER: 'O' };
const PLURAL: Record<Party, string> = { DEM: 'Democrats', GOP: 'Republicans', IND: 'independents', OTHER: 'other parties' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const seats = (n: number) => `${n} Senate ${n === 1 ? 'seat' : 'seats'}`;

const caucus = (p: Party | null) =>
  p ? `<span class="fl__sw" data-party="${p}"></span><span class="fl__long">${ADJ[p]}</span><span class="fl__short">${LETTER[p]}</span>` : 'n/a';

/** "In 2018, 6 Senate seats changed party: 4 to Republicans and 2 to Democrats." */
export function flipsSentence(rows: FlipRow[], year: number, decided: number): string {
  if (decided === 0) return `${year} results are not yet entered. Seats that change party will be listed here once they are.`;
  const flips = rows.filter((r) => !r.labelOnly);
  const label = rows.filter((r) => r.labelOnly);
  const to = (p: Party) => flips.filter((r) => r.next === p).length;
  const d = to('DEM');
  const r = to('GOP');
  let s: string;
  if (!flips.length) s = `In ${year}, no Senate seat changed party.`;
  else if (!d || !r) {
    const p: Party = d ? 'DEM' : 'GOP';
    s = flips.length === 1
      ? `In ${year}, 1 Senate seat changed party, to the ${PLURAL[p]}.`
      : `In ${year}, ${seats(flips.length)} changed party, all to the ${PLURAL[p]}.`;
  } else {
    const [a, b] = d >= r ? [['Democrats', d], ['Republicans', r]] : [['Republicans', r], ['Democrats', d]];
    s = `In ${year}, ${seats(flips.length)} changed party: ${a[1]} to the ${a[0]} and ${b[1]} to the ${b[0]}.`;
  }
  if (label.length) {
    s += ` ${label.length === 1 ? 'One more seat' : `${words[label.length] ?? label.length} more seats`} changed party label but stayed with the same caucus.`;
  }
  return s;
}

export function sortRows(rows: FlipRow[], sort: FlipSort): FlipRow[] {
  const out = [...rows];
  if (sort === 'state') return out.sort((a, b) => a.stateName.localeCompare(b.stateName) || Number(a.special) - Number(b.special));
  const m = (r: FlipRow) => r.margin ?? Infinity;
  return out.sort((a, b) => (sort === 'margin-asc' ? m(a) - m(b) : m(b) - m(a)));
}

const SHAPE_COLOUR: Record<Party, string> = { DEM: 'var(--dem)', GOP: 'var(--gop)', IND: 'var(--ind)', OTHER: 'var(--ink-2)' };

/** `base` is the site's base path: each state name links to that state's record on the Congress map. */
export function flipsTableHtml(rows: FlipRow[], sort: FlipSort, base: string): string {
  if (!rows.length) return '';
  const body = sortRows(rows, sort).map((r) => {
    const note = r.labelOnly && r.previousParty && r.winnerParty
      ? `<span class="fl__label">Label change: ${NOUN[r.previousParty]} to ${NOUN[r.winnerParty]}, same caucus</span>` : '';
    return `<tr${r.labelOnly ? ' class="is-label"' : ''}>
<th scope="row"><span class="fl__stcell"><span style="color:${SHAPE_COLOUR[r.next ?? 'OTHER']}">${stateShapeUse(r.state, 24)}</span><a class="fl__state" href="${base}?year=${r.year}&amp;chamber=senate&amp;state=${r.state}">${esc(r.stateName)}</a></span>${r.special ? '<span class="fl__sub">Special election</span>' : ''}</th>
<td>${caucus(r.previous)}</td>
<td>${caucus(r.next)}</td>
<td>${esc(r.winner)}${note}</td>
<td class="fl__num">${r.margin === null ? 'n/a' : `${r.winnerParty ? LETTER[r.winnerParty] : ''} +${Math.abs(r.margin).toFixed(1)}`}</td>
</tr>`;
  }).join('');
  const ariaSort = sort === 'state' ? 'none' : sort === 'margin-asc' ? 'ascending' : 'descending';
  const next = sort === 'margin-asc' ? 'largest first' : 'closest first';
  return `<table class="fl__table">
<thead><tr>
<th scope="col">State</th><th scope="col">Previous caucus</th><th scope="col">New caucus</th><th scope="col">Winner</th>
<th scope="col" class="fl__num" aria-sort="${ariaSort}"><button type="button" class="fl__sort" data-sort aria-label="Margin: sort ${next}">Margin<span class="fl__arrow" aria-hidden="true">${sort === 'margin-asc' ? ' (closest first)' : sort === 'margin-desc' ? ' (largest first)' : ''}</span></button></th>
</tr></thead>
<tbody>${body}</tbody></table>`;
}
