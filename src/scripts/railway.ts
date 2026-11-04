// The year control's behaviour: click a station, drag along the track and
// snap to the nearest station, arrow keys, the phone stepper and the Senate
// special-election buttons, all writing to the shared store and all
// following it when something else changes the year.
import { store, config } from './dashboard';
import { yearsFor, type DashState } from '../lib/store';
import { nearest, stationYearFor } from '../lib/railway';

const root = document.querySelector<HTMLElement>('[data-year-control]');
if (root) init(root);

function init(root: HTMLElement) {
  const rw = root.querySelector<HTMLElement>('[data-rw]')!;
  const track = root.querySelector<HTMLElement>('[data-track]')!;
  const stations = [...root.querySelectorAll<HTMLButtonElement>('.rw__st')];
  const years = stations.map((s) => Number(s.dataset.year));
  const specials = root.querySelector<HTMLElement>('[data-specials]');
  const steps = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
  const out = root.querySelector<HTMLElement>('[data-year-out] [data-y]')!;
  const outProv = root.querySelector<HTMLElement>('[data-prov]')!;
  const phone = matchMedia('(max-width: 899.98px)');

  const indexOf = (year: number) => years.indexOf(stationYearFor(year));
  const choose = (i: number) => store.set({ year: years[Math.max(0, Math.min(years.length - 1, i))] });

  // On phones the railway is a picture: nothing in it takes focus or is read out twice.
  const setInert = () => { rw.inert = phone.matches; };
  setInert();
  phone.addEventListener('change', setInert);

  // ---- Keyboard: a radio group, so arrows move and select together ----
  track.addEventListener('keydown', (e) => {
    const st = (e.target as Element).closest('.rw__st');
    if (!st) return;
    const cur = indexOf(store.get().year);
    const key = e.key;
    const to =
      key === 'ArrowRight' || key === 'ArrowDown' ? cur + 1 :
      key === 'ArrowLeft' || key === 'ArrowUp' ? cur - 1 :
      key === 'Home' ? 0 :
      key === 'End' ? years.length - 1 :
      null;
    if (to === null) return;
    e.preventDefault();
    choose(to);
    stations[Math.max(0, Math.min(years.length - 1, to))].focus();
  });

  // ---- Pointer: press on a station (or the track between stations) and drag ----
  let dragging = false;
  const centres = () => stations.map((s) => { const r = s.getBoundingClientRect(); return r.left + r.width / 2; });
  const pick = (clientX: number) => choose(nearest(centres(), clientX));

  track.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary) return;
    // The faded track before the first station is not selectable.
    const firstEdge = stations[0].getBoundingClientRect().left;
    if (e.clientX < firstEdge - 4 && !(e.target as Element).closest('.rw__st')) return;
    dragging = true;
    track.setPointerCapture(e.pointerId);
    pick(e.clientX);
  });
  track.addEventListener('pointermove', (e) => { if (dragging) pick(e.clientX); });
  const stop = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
    stations[indexOf(store.get().year)]?.focus({ preventScroll: true });
  };
  track.addEventListener('pointerup', stop);
  track.addEventListener('pointercancel', stop);

  // ---- Phone stepper and Senate special elections ----
  for (const b of steps) {
    b.addEventListener('click', () => {
      const s = store.get();
      const ys = yearsFor(s.chamber, config);
      const next = ys[ys.indexOf(s.year) + Number(b.dataset.step)];
      if (next !== undefined) store.set({ year: next });
    });
  }
  specials?.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-year]');
    if (b) store.set({ year: Number(b.dataset.year) });
  });

  function sync(s: DashState) {
    const here = indexOf(s.year);
    stations.forEach((st, i) => {
      st.setAttribute('aria-checked', String(i === here));
      st.tabIndex = i === here ? 0 : -1;
    });
    if (specials) {
      specials.hidden = s.chamber !== 'senate';
      for (const b of specials.querySelectorAll<HTMLButtonElement>('[data-year]')) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.year) === s.year));
      }
    }
    out.textContent = String(s.year);
    outProv.hidden = !stations[here]?.classList.contains('rw__st--prov') || s.year % 2 === 1;
    const ys = yearsFor(s.chamber, config);
    for (const b of steps) {
      const j = ys.indexOf(s.year) + Number(b.dataset.step);
      b.disabled = j < 0 || j >= ys.length;
    }
  }
  store.subscribe(sync);
  sync(store.get());
}
