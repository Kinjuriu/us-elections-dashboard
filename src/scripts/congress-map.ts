// The map island. The page arrives fully drawn for the latest Senate year;
// this script follows the shared store (year, chamber, selected state,
// comparison year), draws the House squares, and runs the tooltip (hover),
// the state view (tap, click, Enter) and keyboard navigation. All data
// comes from the JSON block the build wrote.
import type { MapData, SenateYear, HouseYear, HouseStateYear } from '../lib/mapData';
import type { HouseGrid } from '../lib/geo';
import type { DashState } from '../lib/store';
import { store, config, openState, closeState } from './dashboard';
import type { HeaderYear } from '../lib/dashboardData';
import type { Party } from '../lib/data';
import { findingFor } from '../lib/finding';
import { compareLine, orderPair } from '../lib/compare';
import {
  senateTitle, houseTitle, senateTone, hatchParty, detailsHtml, ariaLabel, nationalHtml,
  stateRecordHtml, senateChanges, houseChanged, compareTitle, type View, type NationalHeader,
} from '../lib/mapText';

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
type ClientData = MapData & {
  stateOrder: string[];
  regions: Record<string, string>;
  layouts: LayoutData[];
  header: Record<number, NationalHeader>;
};

const SVG = 'http://www.w3.org/2000/svg';

for (const root of document.querySelectorAll<HTMLElement>('[data-cmap]')) init(root);

function init(root: HTMLElement) {
  const data = JSON.parse(root.querySelector('[data-cmap-data]')!.textContent!) as ClientData;
  const map = root.querySelector<HTMLElement>('.cmap__map')!;
  const tooltip = root.querySelector<HTMLElement>('.cmap__tooltip')!;
  const panel = root.querySelector<HTMLElement>('[data-panel]')!;
  const panelRoot = root.querySelector<HTMLElement>('[data-panel-root]')!;
  const panelFocus = root.querySelector<HTMLElement>('[data-panel-focus]')!;
  const kb = root.querySelector<HTMLButtonElement>('[data-kb]')!;
  const kbLive = root.querySelector<HTMLElement>('[data-kb-live]')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-clear]')!;
  // The finding line and its provisional tag sit above the map, in the board.
  const finding = document.querySelector<HTMLElement>('[data-finding]');
  const provTag = document.querySelector<HTMLElement>('[data-prov-tag]');
  const layoutEls = new Map<string, HTMLElement>(
    [...root.querySelectorAll<HTMLElement>('[data-layout]')].map((el) => [el.dataset.layout!, el]),
  );

  const shared = store.get();
  const state = {
    view: shared.chamber as View,
    year: shared.year,
    compare: shared.compare,
    pinned: null as string | null,
    focused: null as string | null,
    hovered: null as string | null,
    apportionment: '',
  };

  // The cards' numbers for each year, which the comparison sentence is built from.
  const cardYears = JSON.parse(document.querySelector('[data-cards-data]')!.textContent!) as Record<number, HeaderYear>;

  // While comparing, the map shows the later of the two years; the states that
  // changed since the earlier one are picked out on it.
  const mapYear = () => (state.compare === null ? state.year : Math.max(state.year, state.compare));
  const senateYear = (): SenateYear => data.senate[mapYear()];
  // Odd (special-election) years are Senate only; the House stays on the election before.
  const houseYear = (): HouseYear => data.house[mapYear()] ?? data.house[mapYear() - 1];
  const name = (st: string) => data.stateNames[st];

  /** The layout on screen now (each has its own media query). */
  const currentLayout = (): LayoutData =>
    data.layouts.find((l) => matchMedia(l.media).matches) ?? data.layouts[data.layouts.length - 1];

  // ---------- Drawing ----------

  const FILL_OF: Record<Party, string> = { DEM: 'dem', GOP: 'gop', IND: 'ind', OTHER: 'other' };

  /** What the comparison picks out: the changed states, and the colour each takes in the later year. */
  interface Compare { a: number; b: number; states: Set<string>; fills: Map<string, string>; count: number }
  function compareInfo(): Compare | null {
    if (state.compare === null) return null;
    const [a, b] = orderPair(state.year, state.compare);
    if (state.view === 'senate') {
      const ch = senateChanges(data, a, b);
      const fills = new Map<string, string>();
      for (const c of ch) if (!fills.has(c.state)) fills.set(c.state, FILL_OF[c.to]);
      return { a, b, states: new Set(fills.keys()), fills, count: ch.length };
    }
    const states = houseChanged(data, a, b);
    return { a, b, states, fills: new Map(), count: states.size };
  }

  function drawSenate(cmp: Compare | null) {
    const sy = senateYear();
    const fillOf = (st: string) => (cmp ? cmp.fills.get(st) ?? 'no-race' : sy.states[st]?.fill ?? 'no-race');
    for (const el of root.querySelectorAll<SVGUseElement>('.cmap__state')) {
      const st = el.dataset.state!;
      el.dataset.fill = fillOf(st);
      const split = cmp ? null : sy.states[st]?.split;
      if (split) el.dataset.split = split.join('|');
      else delete el.dataset.split;
    }
    root.querySelector<HTMLElement>('[data-split-key]')!.hidden = !!cmp || !Object.values(sy.states).some((s) => s.split);
    for (const el of root.querySelectorAll<SVGUseElement>('.cmap__hatch')) {
      const s = sy.states[el.dataset.state!];
      el.dataset.hatch = !cmp && s?.flipped ? hatchParty(s.fill) : '';
    }
    for (const el of root.querySelectorAll<HTMLElement>('.cmap__labels--senate .cmap__label')) {
      const st = el.dataset.state!;
      const s = sy.states[st];
      if (!('callout' in el.dataset)) {
        el.dataset.tone = cmp ? senateTone(fillOf(st) as never, false, null) : senateTone(s?.fill ?? 'no-race', s?.flipped ?? false, s?.split ?? null);
      }
      el.querySelector<HTMLElement>('.cmap__races')!.hidden = !!cmp || (s?.races.length ?? 0) < 2;
    }
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

  function drawHouse(cmp: Compare | null) {
    const hy = houseYear();
    if (hy.apportionment !== state.apportionment) {
      buildHouseLayer(hy.apportionment);
      state.apportionment = hy.apportionment;
    }
    for (const group of root.querySelectorAll<SVGGElement>('.cmap__squares g[data-state]')) {
      const st = group.dataset.state!;
      const kinds = squareKinds(hy.states[st]);
      if (cmp) group.dataset.cmp = cmp.states.has(st) ? 'changed' : 'same';
      else delete group.dataset.cmp;
      group.querySelectorAll('rect:not([fill])').forEach((r, i) => {
        (r as SVGRectElement).dataset.kind = kinds[i];
      });
    }
  }

  function draw() {
    const { view, year } = state;
    const cmp = compareInfo();
    root.dataset.view = view;
    root.dataset.year = String(mapYear());
    if (cmp) root.dataset.compare = ''; else delete root.dataset.compare;
    const sy = senateYear();
    const hy = houseYear();
    const t = cmp ? compareTitle(view, cmp.a, cmp.b, cmp.count) : view === 'senate' ? senateTitle(sy) : houseTitle(hy);
    root.querySelector('[data-title]')!.textContent = t.title;
    root.querySelector('[data-subtitle]')!.textContent = t.subtitle;
    if (finding) {
      finding.textContent = cmp
        ? compareLine(cardYears[cmp.a], cardYears[cmp.b])
        : findingFor(year, view === 'senate' ? sy.headline : hy.headline, config.shownYears);
    }
    if (provTag) provTag.hidden = !(view === 'senate' ? sy.provisional : hy.provisional);

    if (view === 'senate') drawSenate(cmp);
    else drawHouse(cmp);

    for (const el of root.querySelectorAll<SVGUseElement>('.cmap__state')) {
      const st = el.dataset.state!;
      el.dataset.label = ariaLabel(view, st, name(st), sy, hy);
    }
    drawOutlines(cmp);
    for (const li of root.querySelectorAll<HTMLElement>('[data-compare-key]')) {
      li.hidden = !cmp;
      li.querySelector('[data-compare-key-text]')!.textContent = cmp ? t.subtitle : '';
    }
    if (state.pinned) showPanel(state.pinned);
    else showNational();
    hideTooltip();
    updateRings();
  }

  // ---------- Compare: an ink outline on each state that changed ----------
  // Drawn as shapes of their own, after every state, so a neighbour's fill
  // never covers part of an outline.

  function drawOutlines(cmp: Compare | null) {
    for (const el of layoutEls.values()) el.querySelectorAll('.cmap__chg').forEach((n) => n.remove());
    if (!cmp) return;
    for (const el of layoutEls.values()) {
      for (const st of cmp.states) {
        const region = el.querySelector(`.cmap__region[data-region="${data.regions[st]}"]`);
        if (!region) continue;
        const use = document.createElementNS(SVG, 'use');
        use.setAttribute('href', `#cm-st-${st}`);
        use.setAttribute('class', 'cmap__chg');
        use.setAttribute('aria-hidden', 'true');
        region.insertBefore(use, region.querySelector('.cmap__ring--hover'));
      }
    }
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

  /** The panel with no state open: the nation for the year and chamber shown. */
  function showNational() {
    panel.innerHTML = nationalHtml(state.view, state.year, data, data.header[state.year], state.compare);
    clearBtn.hidden = true;
  }
  function showPanel(st: string) {
    panel.innerHTML = stateRecordHtml(state.view, st, name(st), data, state.year);
    clearBtn.hidden = false;
  }
  /** Show a state's record (called when the store's selected state changes). */
  function pin(st: string) {
    state.pinned = st;
    showPanel(st);
    kbState = st;
    updateRings();
    revealPanel();
  }
  /**
   * Where the panel sits under the map (below 1100px), scroll so the bottom of
   * the map and the top of the panel are both on screen.
   */
  function revealPanel() {
    if (matchMedia('(min-width: 1100px)').matches) return;
    const r = panelRoot.getBoundingClientRect();
    if (r.top > 0 && r.top < innerHeight * 0.7) return;
    const mapBottom = map.getBoundingClientRect().bottom + scrollY;
    scrollTo({ top: Math.max(0, mapBottom - innerHeight * 0.45), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function unpin() {
    state.pinned = null;
    showNational();
    updateRings();
  }

  // ---------- Keyboard: one real button, arrow keys move between states ----------
  // The states are drawings, so they take no focus. The button is the one tab
  // stop; the state the arrows are on is `kbState`, shown with the ring and
  // the tooltip, and read out through the live region.

  let kbState = data.stateOrder[0];

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
    kbState = st;
    if (document.activeElement !== kb) kb.focus();
    state.focused = st;
    tooltipAtAnchor(st);
    updateRings();
    const label = root.querySelector<SVGUseElement>(`.cmap__state[data-state="${st}"]`)?.dataset.label ?? name(st);
    kbLive.textContent = label;
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
    if (st) openState(st);
  });
  kb.addEventListener('focus', () => {
    // Only keyboard focus shows the tooltip; a tap or click pins instead.
    if (!kb.matches(':focus-visible')) return;
    state.focused = kbState;
    tooltipAtAnchor(kbState);
    updateRings();
  });
  kb.addEventListener('blur', () => {
    state.focused = null;
    hideTooltip();
    updateRings();
  });
  kb.addEventListener('keydown', (e) => {
    const st = kbState;
    if (DIRS[e.key]) {
      e.preventDefault();
      const next = neighbour(st, DIRS[e.key]);
      if (next) focusState(next);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      focusState(e.key === 'Home' ? data.stateOrder[0] : data.stateOrder[data.stateOrder.length - 1]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openState(st);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hideTooltip();
      if (state.pinned) closeState();
      else if (state.compare !== null) store.set({ compare: null });
    }
  });
  panel.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-open-state]');
    if (!a) return;
    e.preventDefault();
    openState(a.dataset.openState!, a);
  });
  clearBtn.addEventListener('click', () => {
    const st = state.pinned;
    const back = closeState();
    if (back) back.focus();
    else if (st) focusState(st);
  });
  // A request from further down the page (the flips table): bring the panel into view.
  document.addEventListener('dash:focus-panel', () => panelFocus.focus());

  for (const l of data.layouts) matchMedia(l.media).addEventListener('change', hideTooltip);

  // ---------- Follow the store ----------

  function follow(s: DashState, prev: DashState | null) {
    const viewChanged = !prev || s.year !== prev.year || s.chamber !== prev.chamber || s.compare !== prev.compare;
    state.view = s.chamber;
    state.year = s.year;
    state.compare = s.compare;
    if (viewChanged) draw();
    if (!prev || s.state !== prev.state) {
      if (s.state) pin(s.state);
      else if (state.pinned) unpin();
    }
  }
  // The build drew the default Senate year; draw only if the URL asked for something else.
  const built = { year: Number(root.dataset.year), chamber: 'senate' as const, state: null, compare: null };
  follow(shared, built);
  store.subscribe(follow);
  root.classList.add('is-ready');
}
