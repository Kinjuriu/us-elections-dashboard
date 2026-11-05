// The compact year bar: shown only while the full railway is out of view,
// and follows the shared store. Previous and next step through the years the
// chamber has; the miniature railway is click and drag, like the full one.
import { store, config } from './dashboard';
import { yearsFor, type DashState } from '../lib/store';
import { nearest, stationYearFor } from '../lib/railway';

const bar = document.querySelector<HTMLElement>('[data-ybar]');
const full = document.querySelector<HTMLElement>('[data-year-control]');
if (bar && full) init(bar, full);

function init(bar: HTMLElement, full: HTMLElement) {
  const out = bar.querySelector<HTMLElement>('[data-ybar-year]')!;
  const rail = bar.querySelector<HTMLElement>('[data-ybar-rail]')!;
  const sts = [...rail.querySelectorAll<HTMLElement>('.ybar__st')];
  const years = sts.map((s) => Number(s.dataset.year));
  const steps = [...bar.querySelectorAll<HTMLButtonElement>('[data-ystep]')];

  // One or the other, never both: the bar is shown exactly while no part of
  // the full railway is on screen and it has gone off the top.
  new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];
    bar.hidden = e.isIntersecting || e.boundingClientRect.top > 0;
  }).observe(full);

  for (const b of steps) {
    b.addEventListener('click', () => {
      const s = store.get();
      const ys = yearsFor(s.chamber, config);
      const next = ys[ys.indexOf(s.year) + Number(b.dataset.ystep)];
      if (next !== undefined) store.set({ year: next });
    });
  }

  let dragging = false;
  const pick = (x: number) => {
    const centres = sts.map((s) => { const r = s.getBoundingClientRect(); return r.left + r.width / 2; });
    store.set({ year: years[nearest(centres, x)] });
  };
  rail.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary) return;
    dragging = true;
    rail.setPointerCapture(e.pointerId);
    pick(e.clientX);
  });
  rail.addEventListener('pointermove', (e) => { if (dragging) pick(e.clientX); });
  const stop = (e: PointerEvent) => {
    dragging = false;
    if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);
  };
  rail.addEventListener('pointerup', stop);
  rail.addEventListener('pointercancel', stop);

  function sync(s: DashState) {
    out.textContent = String(s.year);
    const here = stationYearFor(s.year);
    for (const st of sts) {
      if (Number(st.dataset.year) === here) st.dataset.selected = 'true';
      else delete st.dataset.selected;
    }
    const ys = yearsFor(s.chamber, config);
    for (const b of steps) {
      const j = ys.indexOf(s.year) + Number(b.dataset.ystep);
      b.disabled = j < 0 || j >= ys.length;
    }
  }
  store.subscribe(sync);
  sync(store.get());
}
