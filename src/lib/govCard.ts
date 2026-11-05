// The governor card beside the governors map, as HTML. Shared by the build
// (nothing selected) and src/scripts/governors-map.ts (a state selected).
// No DOM and no Node APIs here. Needs the state sprite on the page.
import type { GovSnapshot, GovParty } from './governors';
import { partyMarkHtml } from './partyMark';
import { stateShapeUse } from './stateUse';

const FILL: Record<GovParty, string> = { D: 'var(--dem)', R: 'var(--gop)', I: 'var(--ind)' };
const WORD: Record<GovParty, [string, string]> = {
  D: ['Democrat', 'Democrats'], R: ['Republican', 'Republicans'], I: ['independent', 'independents'],
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const govDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "27 Republicans, 23 Democrats" (independents only when there are any). */
export const govCountsText = (s: GovSnapshot) =>
  (['R', 'D', 'I'] as const).filter((p) => p !== 'I' || s.counts.I > 0)
    .map((p) => `${s.counts[p]} ${WORD[p][s.counts[p] === 1 ? 0 : 1]}`).join(', ');

export function govCardHtml(snap: GovSnapshot, st: string | null, stateNames: Record<string, string>): string {
  if (!st || !snap.states[st]) {
    return `<p class="label gcard__state">United States</p>
<p class="gcard__big">${govCountsText(snap)}</p>
<p class="gcard__line">Select a state for its governor.</p>`;
  }
  const g = snap.states[st];
  const name = stateNames[st];
  return `<span class="gcard__shape" style="color:${FILL[g.party]}">${stateShapeUse(st, 64)}</span>
<p class="label gcard__state">${esc(name)}</p>
<p class="gcard__name">${esc(g.name)}</p>
<p class="gcard__party">${partyMarkHtml(g.party)}<span>${esc(g.detail)}</span></p>
<p class="gcard__line">In office since ${govDate(g.tookOffice)}</p>
${g.previous ? `<p class="gcard__line">Previous governor: ${esc(g.previous.name)} (${esc(g.previous.detail)})</p>` : ''}
<p class="gcard__line gcard__src"><a href="${esc(g.sourceUrl)}">Source: Wikipedia list of governors of ${esc(name)}</a></p>`;
}
