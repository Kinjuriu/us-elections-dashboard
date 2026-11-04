// The map island. The page arrives fully drawn for the latest Senate year;
// this script switches chamber and year, draws the House squares, and runs
// the tooltip (hover), details panel (tap, click, Enter) and keyboard
// navigation. All data comes from the JSON block the build wrote.
import type { MapData, SenateYear, HouseYear, HouseStateYear } from '../lib/mapData';
import type { HouseGrid } from '../lib/geo';
import { setSeatBar } from '../lib/seatbar-client';
import { senateTitle, houseTitle, senateTone, hatchParty, detailsHtml, ariaLabel, senateBarCaption, type View } from '../lib/mapText';

type Pt = [number, number];
interface LayoutData {
  id: string;
  media: string;
  width: number;
  height: number;
  cell: number;
  gap: number;
  anchors: Record<string, Pt>;
  house: Record<string, HouseGrid[]>;
}
type ClientData = MapData & { stateOrder: string[]; regions: Record<string, string>; layouts: LayoutData[] };

const SVG = 'http://www.w3.org/2000/svg';

for (const root of document.querySelectorAll<HTMLElement>('[data-cmap]')) init(root);

function init(root: HTMLElement) {
  const data = JSON.parse(root.querySelector('[data-cmap-data]')!.textContent!) as ClientData;
  const map = root.querySelector<HTMLElement>('.cmap__map')!;
  const tooltip = root.querySelector<HTMLElement>('.cmap__tooltip')!;
  const panel = root.querySelector<HTMLElement>('[data-panel]')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-clear]')!;
  const panelEmpty = panel.innerHTML;
  const headline = root.closest('figure')?.querySelector<HTMLElement>('.chart-frame__title') ?? null;
  const senateBar = root.querySelector<HTMLElement>('.cmap__bar--senate [data-seat-bar]')!;
  const houseBar = root.querySelector<HTMLElement>('.cmap__bar--house [data-seat-bar]')!;
  const controlNote = root.querySelector<HTMLElement>('[data-control-note]')!;
  const layoutEls = new Map<string, HTMLElement>(
    [...root.querySelectorAll<HTMLElement>('[data-layout]')].map((el) => [el.dataset.layout!, el]),
  );

  const years = data.years;
  const params = new URLSearchParams(location.search);
  const state = {
    view: (params.get('chamber') === 'house' ? 'house' : 'senate') as View,
    year: years.includes(Number(params.get('year'))) ? Number(params.get('year')) : Number(root.dataset.year),
    pinned: null as string | null,
    focused: null as string | null,
    hovered: null as string | null,
    apportionment: '',
  };

  const senateYear = (): SenateYear => data.senate[state.year];
  const houseYear = (): HouseYear => data.house[state.year];
  const name = (st: string) => data.stateNames[st];

  /** The layout on screen now (each has its own media query). */
  const currentLayout = (): LayoutData =>
    data.layouts.find((l) => matchMedia(l.media).matches) ?? data.layouts[data.layouts.length - 1];

  // ---------- Drawing ----------

  function drawSenate() {
    const sy = senateYear();
    for (const el of root.querySelectorAll<SVGUseElement>('.cmap__state')) {
      const st = el.dataset.state!;
      el.dataset.fill = sy.states[st]?.fill ?? 'no-race';
      const split = sy.states[st]?.split;
      if (split) el.dataset.split = split.join('|');
      else delete el.dataset.split;
    }
    root.querySelector<HTMLElement>('[data-split-key]')!.hidden = !Object.values(sy.states).some((s) => s.split);
    for (const el of root.querySelectorAll<SVGUseElement>('.cmap__hatch')) {
      const s = sy.states[el.dataset.state!];
      el.dataset.hatch = s?.flipped ? hatchParty(s.fill) : '';
    }
    for (const el of root.querySelectorAll<HTMLElement>('.cmap__labels--senate .cmap__label')) {
      const s = sy.states[el.dataset.state!];
      if (!('callout' in el.dataset)) el.dataset.tone = senateTone(s?.fill ?? 'no-race', s?.flipped ?? false, s?.split ?? null);
      el.querySelector<HTMLElement>('.cmap__races')!.hidden = (s?.races.length ?? 0) < 2;
    }
    const b = sy.balance;
    setSeatBar(senateBar, b, sy.provisional);
    senateBar.querySelector('.seat-bar__caption')!.textContent = senateBarCaption(sy.congress);
    controlNote.textContent = sy.controlNote;
    controlNote.hidden = !sy.controlNote;
  }

  /** Square kinds for one state, in the same order as the seat bar. */
  function squareKinds(s: HouseStateYear): string[] {
    if (s.dem === null || s.gop === null) return Array(s.seats).fill('missing');
    const lead = s.provisional && !s.called;
    const out: string[] = [];
    const push = (k: string, n: number) => { for (let i = 0; i < n; i++) out.push(k); };
    push(lead ? 'dem-lead' : 'dem', s.dem);
    push('ind-dem', s.indDem);
    push('other', s.other);
    push('ind-unknown', s.indUnknown);
    push('vacant', s.vacant);
    push('missing', s.seats - s.dem - s.gop - s.indDem - s.indGop - s.indUnknown - s.other - s.vacant);
    push('ind-gop', s.indGop);
    push(lead ? 'gop-lead' : 'gop', s.gop);
    return out;
  }

  /** Build the squares, leaders and labels for an apportionment (seats per state). */
  function buildHouseLayer(key: string) {
    for (const l of data.layouts) {
      const el = layoutEls.get(l.id)!;
      const squares = el.querySelector('.cmap__squares')!;
      const leaders = el.querySelector('.cmap__leaders--house')!;
      const labels = el.querySelector('.cmap__labels--house')!;
      squares.replaceChildren();
      leaders.replaceChildren();
      labels.replaceChildren();
      const pitch = l.cell + l.gap;
      for (const g of l.house[key]) {
        const group = document.createElementNS(SVG, 'g');
        group.dataset.state = g.state;
        for (let i = 0; i < g.n; i++) {
          const r = document.createElementNS(SVG, 'rect');
          const inset = 0.5;
          r.setAttribute('x', String(+(g.x + (i % g.cols) * pitch + inset).toFixed(2)));
          r.setAttribute('y', String(+(g.y + Math.floor(i / g.cols) * pitch + inset).toFixed(2)));
          r.setAttribute('width', String(l.cell - 2 * inset));
          r.setAttribute('height', String(l.cell - 2 * inset));
          group.append(r);
        }
        // A transparent hit area so the gaps between squares still respond.
        const hit = document.createElementNS(SVG, 'rect');
        const rows = Math.ceil(g.n / g.cols);
        hit.setAttribute('x', String(g.x));
        hit.setAttribute('y', String(g.y));
        hit.setAttribute('width', String(g.cols * pitch - l.gap));
        hit.setAttribute('height', String(rows * pitch - l.gap));
        hit.setAttribute('fill', 'transparent');
        group.append(hit);
        squares.append(group);

        if (g.leader) {
          const line = document.createElementNS(SVG, 'line');
          line.setAttribute('x1', String(g.leader[0][0]));
          line.setAttribute('y1', String(g.leader[0][1]));
          line.setAttribute('x2', String(g.leader[1][0]));
          line.setAttribute('y2', String(g.leader[1][1]));
          leaders.append(line);
        }
        if (!g.label) continue;
        const label = document.createElement('span');
        label.className = `cmap__label cmap__label--chip cmap__label--${g.label.side}`;
        label.dataset.state = g.state;
        label.style.left = `${g.label.x}%`;
        label.style.top = `${g.label.y}%`;
        label.textContent = g.state;
        labels.append(label);
      }
    }
  }

  function drawHouse() {
    const hy = houseYear();
    if (hy.apportionment !== state.apportionment) {
      buildHouseLayer(hy.apportionment);
      state.apportionment = hy.apportionment;
    }
    for (const group of root.querySelectorAll<SVGGElement>('.cmap__squares g[data-state]')) {
      const kinds = squareKinds(hy.states[group.dataset.state!]);
      group.querySelectorAll('rect:not([fill])').forEach((r, i) => {
        (r as SVGRectElement).dataset.kind = kinds[i];
      });
    }
    const t = hy.totals;
    setSeatBar(houseBar, t, hy.provisional);
  }

  function draw() {
    const { view, year } = state;
    root.dataset.view = view;
    root.dataset.year = String(year);
    const sy = senateYear();
    const hy = houseYear();
    const t = view === 'senate' ? senateTitle(sy) : houseTitle(hy);
    root.querySelector('[data-title]')!.textContent = t.title;
    root.querySelector('[data-subtitle]')!.textContent = t.subtitle;
    if (headline) headline.textContent = view === 'senate' ? sy.headline : hy.headline;

    if (view === 'senate') drawSenate();
    else drawHouse();

    for (const el of root.querySelectorAll<SVGUseElement>('.cmap__state')) {
      const st = el.dataset.state!;
      el.setAttribute('aria-label', ariaLabel(view, st, name(st), sy, hy));
    }
    if (state.pinned) showPanel(state.pinned);
    hideTooltip();
    updateRings();

    const url = new URL(location.href);
    url.searchParams.set('chamber', view);
    url.searchParams.set('year', String(year));
    history.replaceState(null, '', url);
  }

  // ---------- Selection rings ----------

  function setRing(cls: string, st: string | null) {
    for (const el of layoutEls.values()) {
      for (const ring of el.querySelectorAll<SVGUseElement>(`.cmap__ring--${cls}`)) {
        const region = (ring.parentNode as SVGGElement).dataset.region;
        if (st && data.regions[st] === region) ring.setAttribute('href', `#cm-st-${st}`);
        else ring.removeAttribute('href');
      }
    }
  }
  function updateRings() {
    const strong = state.focused ?? state.pinned;
    setRing('outer', strong);
    setRing('inner', strong);
    setRing('hover', state.hovered && state.hovered !== strong ? state.hovered : null);
  }

  // ---------- Tooltip and panel ----------

  const details = (st: string) => detailsHtml(state.view, st, name(st), senateYear(), houseYear());

  function showTooltip(st: string, x: number, y: number) {
    tooltip.innerHTML = details(st);
    tooltip.hidden = false;
    const box = map.getBoundingClientRect();
    const w = tooltip.offsetWidth;
    const h = tooltip.offsetHeight;
    let left = x + 14;
    let top = y + 14;
    if (left + w > box.width) left = Math.max(0, x - w - 14);
    if (top + h > box.height) top = Math.max(0, y - h - 14);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  function hideTooltip() {
    tooltip.hidden = true;
  }
  /** Tooltip at a state's anchor, for keyboard focus. */
  function tooltipAtAnchor(st: string) {
    const l = currentLayout();
    const el = layoutEls.get(l.id)!;
    const box = el.getBoundingClientRect();
    const mapBox = map.getBoundingClientRect();
    const [ax, ay] = l.anchors[st];
    showTooltip(st, box.left - mapBox.left + (ax / l.width) * box.width, box.top - mapBox.top + (ay / l.height) * box.height);
  }

  function showPanel(st: string) {
    panel.innerHTML = details(st);
    clearBtn.hidden = false;
  }
  function pin(st: string) {
    state.pinned = st;
    showPanel(st);
    setRoving(st);
    updateRings();
  }
  function unpin() {
    state.pinned = null;
    panel.innerHTML = panelEmpty;
    clearBtn.hidden = true;
    updateRings();
  }

  // ---------- Keyboard: one tab stop, arrow keys move between states ----------

  function setRoving(st: string) {
    for (const el of root.querySelectorAll<SVGUseElement>('.cmap__state')) {
      el.setAttribute('tabindex', el.dataset.state === st ? '0' : '-1');
    }
  }
  setRoving(data.stateOrder[0]);

  const DIRS: Record<string, Pt> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
  /** Nearest state in the direction pressed, favouring ones straight ahead. */
  function neighbour(st: string, [dx, dy]: Pt): string | null {
    const a = currentLayout().anchors;
    const [x0, y0] = a[st];
    let best: string | null = null;
    let bestScore = Infinity;
    for (const [other, [x, y]] of Object.entries(a)) {
      if (other === st) continue;
      const vx = x - x0, vy = y - y0;
      const dist = Math.hypot(vx, vy);
      const cos = (vx * dx + vy * dy) / dist;
      if (cos < 0.35) continue;
      const score = dist * (1 + 2 * (1 - cos));
      if (score < bestScore) { bestScore = score; best = other; }
    }
    return best;
  }
  function focusState(st: string) {
    const l = currentLayout();
    const el = layoutEls.get(l.id)!.querySelector<SVGUseElement>(`.cmap__state[data-state="${st}"]`);
    setRoving(st);
    el?.focus();
  }

  // ---------- Events ----------

  const stateFrom = (t: EventTarget | null): string | null => {
    const el = (t as Element | null)?.closest?.('[data-state]') as HTMLElement | SVGElement | null;
    return el && map.contains(el) ? el.dataset.state ?? null : null;
  };

  map.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const st = stateFrom(e.target);
    if (!st) {
      if (state.hovered) { state.hovered = null; hideTooltip(); updateRings(); }
      return;
    }
    const box = map.getBoundingClientRect();
    showTooltip(st, e.clientX - box.left, e.clientY - box.top);
    if (st !== state.hovered) { state.hovered = st; updateRings(); }
  });
  map.addEventListener('pointerleave', () => {
    state.hovered = null;
    hideTooltip();
    updateRings();
  });
  map.addEventListener('click', (e) => {
    const st = stateFrom(e.target);
    if (st) pin(st);
  });
  map.addEventListener('focusin', (e) => {
    const st = stateFrom(e.target);
    // Only keyboard focus shows the tooltip; a tap or click pins instead.
    if (!st || !(e.target as Element).matches(':focus-visible')) return;
    state.focused = st;
    tooltipAtAnchor(st);
    updateRings();
  });
  map.addEventListener('focusout', () => {
    state.focused = null;
    hideTooltip();
    updateRings();
  });
  map.addEventListener('keydown', (e) => {
    const st = stateFrom(e.target);
    if (!st) return;
    if (DIRS[e.key]) {
      e.preventDefault();
      const next = neighbour(st, DIRS[e.key]);
      if (next) focusState(next);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      focusState(e.key === 'Home' ? data.stateOrder[0] : data.stateOrder[data.stateOrder.length - 1]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pin(st);
    } else if (e.key === 'Escape') {
      hideTooltip();
      unpin();
    }
  });
  clearBtn.addEventListener('click', () => {
    const st = state.pinned;
    unpin();
    if (st) focusState(st);
  });

  root.addEventListener('segmentchange', (e) => {
    const { name: group, value } = (e as CustomEvent<{ name: string; value: string }>).detail;
    if (group === 'chamber') state.view = value as View;
    if (group === 'year') state.year = Number(value);
    draw();
    centreYear();
  });

  // ---------- Year row on phones: keep the current year in the middle ----------

  const yearRow = root.querySelector<HTMLElement>('[data-segmented="year"] .segmented__buttons')!;
  function centreYear() {
    const btn = yearRow.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!btn || yearRow.scrollWidth <= yearRow.clientWidth) return;
    const row = yearRow.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    yearRow.scrollLeft += b.left + b.width / 2 - (row.left + row.width / 2);
  }

  /** Match the buttons to a state read from the URL. */
  function syncButtons() {
    for (const [group, value] of [['chamber', state.view], ['year', String(state.year)]]) {
      for (const b of root.querySelectorAll<HTMLButtonElement>(`[data-segmented="${group}"] .segmented__button`)) {
        b.setAttribute('aria-pressed', String(b.dataset.value === value));
      }
    }
  }

  for (const l of data.layouts) matchMedia(l.media).addEventListener('change', () => { hideTooltip(); centreYear(); });

  const fromUrl = params.has('chamber') || params.has('year');
  if (fromUrl) {
    syncButtons();
    draw();
  }
  centreYear();
  // Button widths change once the web fonts arrive.
  document.fonts?.ready.then(centreYear);
  root.classList.add('is-ready');
}
