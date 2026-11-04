// Redraws a SeatBar rendered with `dynamic` (see SeatBar.astro) in the
// browser, so the map can show the chamber for the selected year.
import { buildSquares, fills, keyItems, summary, OUTLINED, type SeatCounts } from './seatbar';

const CELL = 10;

export function setSeatBar(root: HTMLElement, counts: SeatCounts, provisional: boolean): void {
  const uid = root.dataset.seatBar!;
  const total = Number(root.dataset.total);
  const threshold = Number(root.dataset.threshold);
  const label = root.dataset.label ?? '';
  const squares = buildSquares(counts, total);
  const fill = fills(uid);
  const hasResults = counts.dem !== null && counts.gop !== null;

  // Each layout (wide, narrow) holds one rect per seat in seat order.
  for (const svg of root.querySelectorAll<SVGSVGElement>('.seat-bar__svg')) {
    svg.querySelectorAll<SVGRectElement>('rect[data-kind]').forEach((rect, i) => {
      const kind = squares[i];
      if (rect.dataset.kind === kind) return;
      rect.dataset.kind = kind;
      const inset = OUTLINED.includes(kind) ? 0.5 : 0;
      rect.setAttribute('x', String(Number(rect.dataset.x) + inset));
      rect.setAttribute('y', String(Number(rect.dataset.y) + inset));
      rect.setAttribute('width', String(CELL - 2 * inset));
      rect.setAttribute('height', String(CELL - 2 * inset));
      rect.setAttribute('fill', fill[kind]);
      if (inset) {
        rect.setAttribute('stroke', 'var(--ink-3)');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('vector-effect', 'non-scaling-stroke');
      } else {
        rect.removeAttribute('stroke');
        rect.removeAttribute('stroke-width');
        rect.removeAttribute('vector-effect');
      }
    });
  }

  const fmt = (n: number) => n.toLocaleString('en-US');
  root.querySelector('[data-num="dem"]')!.textContent = hasResults ? fmt(counts.dem!) : 'n/a';
  root.querySelector('[data-num="gop"]')!.textContent = hasResults ? fmt(counts.gop!) : 'n/a';

  const items = keyItems(counts, total);
  for (const li of root.querySelectorAll<HTMLElement>('[data-key]')) {
    const text = items[li.dataset.key as keyof typeof items];
    li.hidden = !text;
    li.querySelector('[data-key-text]')!.textContent = text ?? '';
  }

  const prov = root.querySelector<HTMLElement>('.seat-bar__prov');
  if (prov) prov.hidden = !provisional;
  root.querySelector('.seat-bar__graphic')!.setAttribute('aria-label', summary(label, counts, total, threshold, provisional));
}
