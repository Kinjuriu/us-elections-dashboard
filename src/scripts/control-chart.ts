// Chart 1: outlines the Congress for the selected year, writes the readout
// for the Congress under the pointer (or the selected one), and sets the
// shared year when a Congress from 2001 on is clicked.
import { store } from './dashboard';
import { congressFor, type DashState } from '../lib/store';

const root = document.querySelector<HTMLElement>('[data-cc]');
if (root) init(root);

function init(root: HTMLElement) {
  const list = JSON.parse(root.querySelector('[data-cc-data]')!.textContent!) as { congress: number; summary: string }[];
  const summary = new Map(list.map((c) => [c.congress, c.summary]));
  const readout = root.querySelector<HTMLElement>('[data-cc-readout]')!;
  const plot = root.querySelector<HTMLElement>('[data-cc-plot]')!;
  const svg = plot.querySelector<SVGSVGElement>('.cc__svg')!;
  const selRect = root.querySelector<SVGRectElement>('[data-cc-sel]')!;
  const hoverRect = root.querySelector<SVGRectElement>('[data-cc-hover]')!;
  const n = list.length;
  const colW = 1000 / n;
  let selected = Number(root.dataset.selected);
  let hovered: number | null = null;

  const indexOf = (congress: number) => list.findIndex((c) => c.congress === congress);
  const place = (rect: SVGRectElement, congress: number | null) => {
    const i = congress === null ? -1 : indexOf(congress);
    rect.setAttribute('visibility', i < 0 ? 'hidden' : 'visible');
    if (i >= 0) rect.setAttribute('x', String(i * colW + 1.5 - 1));
  };
  const showReadout = () => { readout.textContent = summary.get(hovered ?? selected) ?? ''; };

  function draw(s: DashState) {
    selected = congressFor(s.year);
    place(selRect, selected);
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-year]')) {
      b.setAttribute('aria-pressed', String(congressFor(Number(b.dataset.year)) === selected));
    }
    for (const row of root.querySelectorAll<HTMLElement>('.cc__nrow[data-congress]')) {
      row.classList.toggle('is-selected', Number(row.dataset.congress) === selected);
    }
    showReadout();
  }

  // Hover anywhere on a column shows its numbers; nothing else changes.
  svg.parentElement!.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const box = svg.getBoundingClientRect();
    if (e.clientY < box.top || e.clientY > box.bottom) return;
    const i = Math.floor(((e.clientX - box.left) / box.width) * n);
    const c = list[Math.max(0, Math.min(n - 1, i))].congress;
    if (c === hovered) return;
    hovered = c;
    place(hoverRect, c);
    showReadout();
  });
  plot.addEventListener('pointerleave', () => {
    hovered = null;
    place(hoverRect, null);
    showReadout();
  });
  // Keyboard focus on a column reads it out too.
  root.addEventListener('focusin', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-year]');
    if (!b) return;
    hovered = congressFor(Number(b.dataset.year));
    showReadout();
  });
  root.addEventListener('focusout', () => { hovered = null; showReadout(); });
  root.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-year]');
    if (b) store.set({ year: Number(b.dataset.year) });
  });

  draw(store.get());
  store.subscribe((s, prev) => { if (s.year !== prev.year) draw(s); });
}
