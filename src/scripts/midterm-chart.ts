// Chart 2: shows the chamber the control bar picks, outlines the selected
// year when it is a midterm, and writes the readout for the bar under the
// pointer (or the selected midterm).
import { store } from './dashboard';
import type { DashState } from '../lib/store';

const root = document.querySelector<HTMLElement>('[data-mt]');
if (root) init(root);

function init(root: HTMLElement) {
  const views = [...root.querySelectorAll<HTMLElement>('[data-chamber-view]')].map((el) => {
    const text = JSON.parse(el.querySelector('[data-mt-data]')!.textContent!) as Record<string, string>;
    return { el, text, years: Object.keys(text).map(Number), readout: el.querySelector<HTMLElement>('[data-mt-readout]')! };
  });
  let hovered: number | null = null;
  let selected = store.get().year;

  function showReadout() {
    for (const v of views) {
      const y = hovered ?? (v.years.includes(selected) ? selected : null);
      // With no midterm selected, the readout keeps whatever it last showed.
      if (y !== null) v.readout.textContent = v.text[y];
    }
  }

  function draw(s: DashState) {
    root.dataset.chamber = s.chamber;
    selected = s.year;
    for (const el of root.querySelectorAll<Element>('[data-year]')) {
      el.classList.toggle('is-selected', Number((el as HTMLElement).dataset.year) === s.year);
    }
    showReadout();
  }

  for (const v of views) {
    const svg = v.el.querySelector<SVGSVGElement>('.mt__svg')!;
    svg.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const box = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(v.years.length - 1, Math.floor(((e.clientX - box.left) / box.width) * v.years.length)));
      if (hovered === v.years[i]) return;
      hovered = v.years[i];
      showReadout();
    });
    svg.addEventListener('pointerleave', () => { hovered = null; showReadout(); });
  }

  draw(store.get());
  store.subscribe((s, prev) => { if (s.year !== prev.year || s.chamber !== prev.chamber) draw(s); });
}
