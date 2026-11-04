// Wires the control strip to the store: the chamber buttons, the Congress
// strip (or, on phones, the year buttons), the previous and next arrows and
// the compare menu write to it, and all follow it when another module
// changes it (a click on a chart, or a link with ?year=...).
import { store, config } from './dashboard';
import { yearsFor, type DashState, type Chamber } from '../lib/store';

const bar = document.querySelector<HTMLElement>('[data-cbar]');
if (bar) init(bar);

function init(bar: HTMLElement) {
  const strip = bar.querySelector<HTMLElement>('[data-strip]')!;
  const cols = [...strip.querySelectorAll<HTMLButtonElement>('.strip__col')];
  const select = bar.querySelector<HTMLSelectElement>('[data-compare]')!;
  const yearRow = bar.querySelector<HTMLElement>('[data-segmented="year"] .segmented__buttons')!;
  const out = bar.querySelector<HTMLElement>('[data-year-out] [data-y]')!;
  const outProv = bar.querySelector<HTMLElement>('[data-prov]')!;
  const steps = [...bar.querySelectorAll<HTMLButtonElement>('[data-step]')];
  // Below 1280px the "Compare with" label is hidden, so the menu says it itself.
  const short = matchMedia('(max-width: 1279.98px)');

  const selectable = (c: HTMLElement) => c.getAttribute('aria-disabled') !== 'true' && !c.hidden;

  bar.addEventListener('segmentchange', (e) => {
    const { name, value } = (e as CustomEvent<{ name: string; value: string }>).detail;
    if (name === 'chamber') store.set({ chamber: value as Chamber });
    if (name === 'year') store.set({ year: Number(value) });
  });
  select.addEventListener('change', () => {
    store.set({ compare: select.value ? Number(select.value) : null });
  });

  for (const b of steps) {
    b.addEventListener('click', () => {
      const s = store.get();
      const ys = yearsFor(s.chamber, config);
      const next = ys[ys.indexOf(s.year) + Number(b.dataset.step)];
      if (next !== undefined) store.set({ year: next });
    });
  }

  strip.addEventListener('click', (e) => {
    const col = (e.target as Element).closest<HTMLButtonElement>('.strip__col');
    if (col && selectable(col)) store.set({ year: Number(col.dataset.value) });
  });
  strip.addEventListener('keydown', (e) => {
    const col = (e.target as Element).closest<HTMLButtonElement>('.strip__col');
    if (!col) return;
    const live = cols.filter(selectable);
    const i = live.indexOf(col);
    const next =
      e.key === 'ArrowRight' ? live[Math.min(i + 1, live.length - 1)] :
      e.key === 'ArrowLeft' ? live[Math.max(i - 1, 0)] :
      e.key === 'Home' ? live[0] :
      e.key === 'End' ? live[live.length - 1] :
      null;
    if (!next) return;
    e.preventDefault();
    store.set({ year: Number(next.dataset.value) });
    next.focus();
  });

  /** Keep the selected year in the middle of the phone row when it scrolls. */
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
    strip.dataset.chamber = s.chamber;
    for (const c of cols) {
      const on = c.dataset.value === String(s.year);
      c.setAttribute('aria-pressed', String(on));
      c.tabIndex = on ? 0 : -1;
      if (c.dataset.only) c.hidden = c.dataset.only !== s.chamber;
    }
    out.textContent = String(s.year);
    outProv.hidden = !cols.find((c) => c.dataset.value === String(s.year))?.classList.contains('strip__col--prov');
    const ys = yearsFor(s.chamber, config);
    for (const b of steps) b.disabled = ys.indexOf(s.year) + Number(b.dataset.step) < 0 || ys.indexOf(s.year) + Number(b.dataset.step) >= ys.length;
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
