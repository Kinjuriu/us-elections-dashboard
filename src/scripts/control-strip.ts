// Wires the chamber buttons and the compare menu to the store, and keeps
// them in step when another module changes it (a click on a chart, or a link
// with ?year=...). The year control lives in src/scripts/railway.ts.
import { store, config } from './dashboard';
import type { DashState, Chamber } from '../lib/store';

const bar = document.querySelector<HTMLElement>('[data-cbar]');
if (bar) init(bar);

function init(bar: HTMLElement) {
  const select = bar.querySelector<HTMLSelectElement>('[data-compare]')!;
  // Below 1280px the "Compare with" label is hidden, so the menu says it itself.
  const short = matchMedia('(max-width: 899.98px)');

  bar.addEventListener('segmentchange', (e) => {
    const { name, value } = (e as CustomEvent<{ name: string; value: string }>).detail;
    if (name === 'chamber') store.set({ chamber: value as Chamber });
  });
  const stop = bar.querySelector<HTMLButtonElement>('[data-stop]')!;
  select.addEventListener('change', () => {
    store.set({ compare: select.value ? Number(select.value) : null });
  });
  stop.addEventListener('click', () => {
    store.set({ compare: null });
    select.focus();
  });

  function optionText() {
    for (const o of select.options) {
      o.textContent = o.value ? (short.matches ? `vs ${o.value}` : o.value) : short.matches ? 'Compare' : 'None';
    }
  }

  const noResults = (y: number) => !!config.shownYears && y in config.shownYears;

  // The menu is left alone when it already says the right thing: changing its
  // options while its own list is still closing is needless work for the browser.
  function sync(s: DashState) {
    for (const b of bar.querySelectorAll<HTMLButtonElement>('[data-segmented="chamber"] .segmented__button')) {
      const on = String(b.dataset.value === s.chamber);
      if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
    }
    for (const o of select.options) {
      if (!o.value) continue;
      const hidden = !!o.dataset.only && o.dataset.only !== s.chamber;
      // A year with no results of its own, or the year on the railway, cannot be compared with.
      const disabled = hidden || Number(o.value) === s.year || noResults(Number(o.value));
      if (o.hidden !== hidden) o.hidden = hidden;
      if (o.disabled !== disabled) o.disabled = disabled;
    }
    const value = s.compare === null ? '' : String(s.compare);
    if (select.value !== value) select.value = value;
    stop.hidden = s.compare === null;
    if (s.compare === null) delete select.dataset.active;
    else select.dataset.active = '';
  }

  store.subscribe(sync);
  sync(store.get());
  optionText();
  short.addEventListener('change', optionText);
}
