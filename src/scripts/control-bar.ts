// Wires the control bar to the store: the buttons and the compare menu
// write to it, and follow it when another module changes it (a click on a
// chart, or a link with ?year=...).
import { store } from './dashboard';
import type { DashState, Chamber } from '../lib/store';

const bar = document.querySelector<HTMLElement>('[data-cbar]');
if (bar) init(bar);

function init(bar: HTMLElement) {
  const yearRow = bar.querySelector<HTMLElement>('[data-segmented="year"] .segmented__buttons')!;
  const select = bar.querySelector<HTMLSelectElement>('[data-compare]')!;
  // Below 1280px the "Compare with" label is hidden (ControlBar.astro), so the menu says it itself.
  const short = matchMedia('(max-width: 1279.98px)');

  bar.addEventListener('segmentchange', (e) => {
    const { name, value } = (e as CustomEvent<{ name: string; value: string }>).detail;
    if (name === 'chamber') store.set({ chamber: value as Chamber });
    if (name === 'year') store.set({ year: Number(value) });
  });
  select.addEventListener('change', () => {
    store.set({ compare: select.value ? Number(select.value) : null });
  });

  /** Keep the selected year in the middle of the row when the row scrolls. */
  function centreYear() {
    const btn = yearRow.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!btn || yearRow.scrollWidth <= yearRow.clientWidth) return;
    const row = yearRow.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    yearRow.scrollLeft += b.left + b.width / 2 - (row.left + row.width / 2);
  }

  function optionText() {
    for (const o of select.options) {
      o.textContent = o.value ? (short.matches ? `vs ${o.value}` : o.value) : short.matches ? 'Compare' : 'None';
    }
  }

  function sync(s: DashState, prev?: DashState) {
    for (const [group, value] of [['chamber', s.chamber], ['year', String(s.year)]] as const) {
      for (const b of bar.querySelectorAll<HTMLButtonElement>(`[data-segmented="${group}"] .segmented__button`)) {
        b.setAttribute('aria-pressed', String(b.dataset.value === value));
        if (b.dataset.only) b.hidden = b.dataset.only !== s.chamber;
      }
    }
    for (const o of select.options) {
      if (!o.value) continue;
      o.hidden = !!o.dataset.only && o.dataset.only !== s.chamber;
      o.disabled = o.hidden || Number(o.value) === s.year;
    }
    select.value = s.compare === null ? '' : String(s.compare);
    if (s.compare === null) delete select.dataset.active;
    else select.dataset.active = '';
    if (!prev || prev.year !== s.year || prev.chamber !== s.chamber) centreYear();
  }

  store.subscribe(sync);
  sync(store.get());
  optionText();
  short.addEventListener('change', () => { optionText(); centreYear(); });
  // Button widths change once the web fonts arrive.
  document.fonts?.ready.then(centreYear);
}
