// Wires the chamber buttons and the compare menu to the store, and keeps
// them in step when another module changes it (a click on a chart, or a link
// with ?year=...). The year control lives in src/scripts/railway.ts.
import { store } from './dashboard';
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
  select.addEventListener('change', () => {
    store.set({ compare: select.value ? Number(select.value) : null });
  });

  function optionText() {
    for (const o of select.options) {
      o.textContent = o.value ? (short.matches ? `vs ${o.value}` : o.value) : short.matches ? 'Compare' : 'None';
    }
  }

  function sync(s: DashState) {
    for (const b of bar.querySelectorAll<HTMLButtonElement>('[data-segmented="chamber"] .segmented__button')) {
      b.setAttribute('aria-pressed', String(b.dataset.value === s.chamber));
    }
    for (const o of select.options) {
      if (!o.value) continue;
      o.hidden = !!o.dataset.only && o.dataset.only !== s.chamber;
      o.disabled = o.hidden || Number(o.value) === s.year;
    }
    select.value = s.compare === null ? '' : String(s.compare);
    if (s.compare === null) delete select.dataset.active;
    else select.dataset.active = '';
  }

  store.subscribe(sync);
  sync(store.get());
  optionText();
  short.addEventListener('change', optionText);
}
