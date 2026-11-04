// Redraws the summary band for the selected year, and for a comparison
// year when one is set. Also keeps the band's rows in step with the store.
import { store } from './dashboard';
import { kinds, independentsText, countText, rowLabel } from '../lib/band';
import { ordinal } from '../lib/mapText';
import type { HeaderYear, HeaderChamber } from '../lib/dashboardData';
import type { DashState } from '../lib/store';

const root = document.querySelector<HTMLElement>('[data-band]');
if (root) init(root);

function init(root: HTMLElement) {
  const years = JSON.parse(root.querySelector('[data-band-data]')!.textContent!) as Record<number, HeaderYear>;
  const cols = [...root.querySelectorAll<HTMLElement>('.band__chamber')];

  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

  /** "2018 to 2022: Democrats -22   Republicans +23", from the earlier Congress to the later. */
  function changeHtml(yA: HeaderYear, yB: HeaderYear, id: 'house' | 'senate'): string {
    // An even year shown with another year's bars has no results entered yet.
    const pending = [yA, yB].find((y) => y.year % 2 === 0 && y.year !== y.shownYear);
    if (pending) return `No change shown: ${pending.year} results are not yet entered`;
    if (yA.congress === yB.congress) return `${yA.year} and ${yB.year}: the same Congress, so no change`;
    const a = yA[id];
    const b = yB[id];
    if (a.balance.dem === null || b.balance.dem === null || a.balance.gop === null || b.balance.gop === null) {
      return 'No change shown: results for one of these years are not yet entered';
    }
    const ind = (x: HeaderChamber) => x.balance.indDem + x.balance.indGop + x.balance.indUnknown;
    const parts = [
      ['Democrats', b.balance.dem - a.balance.dem],
      ['Republicans', b.balance.gop - a.balance.gop],
    ] as [string, number][];
    if (ind(a) || ind(b)) parts.push(['Independents', ind(b) - ind(a)]);
    return `<span class="band__delta">${yA.shownYear} to ${yB.shownYear}:</span>` +
      parts.map(([who, n]) => `<span class="band__delta">${who} ${signed(n)}</span>`).join('');
  }

  function paint(row: HTMLElement, id: 'house' | 'senate', y: HeaderYear, showYear: boolean) {
    const c = y[id];
    const ks = kinds(id, c.balance, c.total);
    for (const svg of row.querySelectorAll<SVGSVGElement>('svg')) {
      svg.querySelectorAll<SVGRectElement>('rect[data-kind]').forEach((r, i) => {
        if (r.dataset.kind !== ks[i]) r.dataset.kind = ks[i];
      });
    }
    row.querySelector('[data-num="dem"]')!.firstChild!.textContent = countText(c.balance.dem);
    row.querySelector('[data-num="gop"]')!.firstChild!.textContent = countText(c.balance.gop);
    row.querySelector('[data-ind]')!.textContent = independentsText(c.balance);
    const yr = row.querySelector<HTMLElement>('[data-yr]')!;
    yr.hidden = !showYear;
    yr.textContent = showYear ? String(y.shownYear) : '';
    const caption = y.year === y.shownYear ? '' : ` (selected: ${y.year})`;
    row.querySelector('.band__plot')!.setAttribute(
      'aria-label',
      rowLabel(id, ` ${ordinal(y.congress)} Congress, elected ${y.shownYear}${caption}`, c.balance, c.total, c.threshold),
    );
  }

  function draw(s: DashState) {
    const h = years[s.year];
    const c = s.compare !== null ? years[s.compare] : null;
    // Earlier year on top when comparing.
    const [first, second] = c && c.year < h.year ? [c, h] : [h, c];
    for (const col of cols) {
      const id = col.dataset.chamber as 'house' | 'senate';
      const primary = col.querySelector<HTMLElement>('[data-slot="primary"]')!;
      const compare = col.querySelector<HTMLElement>('[data-slot="compare"]')!;
      const change = col.querySelector<HTMLElement>('[data-change]')!;
      paint(primary, id, first, !!second);
      if (second) {
        paint(compare, id, second, true);
        change.innerHTML = changeHtml(first, second, id);
      }
      compare.hidden = !second;
      change.hidden = !second;
    }
  }

  // Cheap enough to always run: the build drew the default year, the URL may ask for another.
  draw(store.get());
  store.subscribe((s, prev) => {
    if (s.year !== prev.year || s.compare !== prev.compare) draw(s);
  });
}
