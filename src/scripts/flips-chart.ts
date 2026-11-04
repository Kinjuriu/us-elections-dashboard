// Chart 3: the flips table follows the shared year; a click on a cycle
// sets the year; a click on a state opens its record beside the map.
import { store, openState } from './dashboard';
import { flipsTableHtml, flipsSentence, type FlipSort } from '../lib/flipsText';
import type { FlipRow } from '../lib/chartData';
import type { DashState } from '../lib/store';

const root = document.querySelector<HTMLElement>('[data-fl]');
if (root) init(root);

function init(root: HTMLElement) {
  const data = JSON.parse(root.querySelector('[data-fl-data]')!.textContent!) as { rows: FlipRow[]; decided: Record<string, number> };
  const table = root.querySelector<HTMLElement>('[data-fl-table]')!;
  const sentence = root.querySelector<HTMLElement>('[data-fl-sentence]')!;
  const yearEl = root.querySelector<HTMLElement>('[data-fl-year]')!;
  let sort: FlipSort = 'state';

  function draw(s: DashState) {
    // A year with no Senate races (never, from 2000) would show an empty table.
    const rows = data.rows.filter((r) => r.year === s.year);
    yearEl.textContent = String(s.year);
    sentence.textContent = flipsSentence(rows, s.year, data.decided[s.year] ?? 0);
    table.innerHTML = flipsTableHtml(rows, sort);
    root.dataset.year = String(s.year);
    for (const b of root.querySelectorAll<HTMLButtonElement>('.fl__cycle')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.year) === s.year));
    }
  }

  root.addEventListener('click', (e) => {
    const t = e.target as Element;
    const cycle = t.closest<HTMLElement>('.fl__cycle');
    if (cycle) { store.set({ year: Number(cycle.dataset.year) }); return; }
    const st = t.closest<HTMLElement>('.fl__state');
    if (st) { openState(st.dataset.state!, st, true); return; }
    if (t.closest('[data-sort]')) {
      sort = sort === 'margin-asc' ? 'margin-desc' : 'margin-asc';
      draw(store.get());
      root.querySelector<HTMLElement>('[data-sort]')?.focus();
    }
  });

  draw(store.get());
  store.subscribe((s, prev) => { if (s.year !== prev.year) draw(s); });
}
