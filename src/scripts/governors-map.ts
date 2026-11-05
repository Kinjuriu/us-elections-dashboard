// The governors map follows the shared year. A state picked on the map, or
// with its button in the list of all 50 (the keyboard path), fills the
// governor card; the card keeps that state when the year changes.
import { store } from './dashboard';
import type { GovSnapshot, GovParty } from '../lib/governors';
import { govCardHtml, govCountsText, govDate } from '../lib/govCard';
import { partyMarkHtml } from '../lib/partyMark';
import type { DashState } from '../lib/store';

const FILL: Record<GovParty, string> = { D: 'var(--dem)', R: 'var(--gop)', I: 'var(--ind)' };
const WORD: Record<GovParty, string> = { D: 'Democrats', R: 'Republicans', I: 'independents' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const root = document.querySelector<HTMLElement>('[data-gov]');
if (root) init(root);

function init(root: HTMLElement) {
  const { snapshots, stateNames } = JSON.parse(root.querySelector('[data-gov-data]')!.textContent!) as {
    snapshots: Record<string, GovSnapshot>;
    stateNames: Record<string, string>;
  };
  const years = Object.keys(snapshots).map(Number).sort((a, b) => a - b);
  const finding = root.querySelector<HTMLElement>('[data-gov-finding]')!;
  const caption = root.querySelector<HTMLElement>('[data-gov-caption]')!;
  const tbody = root.querySelector<HTMLElement>('[data-gov-tbody]')!;
  const card = root.querySelector<HTMLElement>('[data-gcard]')!;
  const paths = [...root.querySelectorAll<SVGPathElement>('.gov__state')];
  let current: GovSnapshot = snapshots[root.dataset.year!];
  let selected: string | null = null;

  const pick = (y: number) => snapshots[y] ?? snapshots[years.filter((x) => x <= y).pop() ?? years[0]];
  const headline = (s: GovSnapshot) => {
    const lead: GovParty = s.counts.R >= s.counts.D ? 'R' : 'D';
    if (s.pending) return `${s.year} governor results are not yet entered. On ${govDate(s.date)}, ${WORD[lead]} held ${s.counts[lead]} of the 50 governorships`;
    if (s.counts.R === s.counts.D) return `Democrats and Republicans each held ${s.counts.D} governorships after the ${s.year} elections`;
    return `${WORD[lead]} held ${s.counts[lead]} of the 50 governorships after the ${s.year} elections`;
  };

  function showSelection() {
    card.innerHTML = govCardHtml(current, selected, stateNames);
    for (const p of paths) p.classList.toggle('is-sel', p.dataset.st === selected);
    for (const tr of tbody.querySelectorAll<HTMLElement>('tr')) {
      const on = tr.dataset.st === selected;
      tr.classList.toggle('is-sel', on);
      tr.querySelector('.gov__pick')?.setAttribute('aria-pressed', String(on));
    }
  }

  function draw(s: DashState) {
    current = pick(s.year);
    root.dataset.year = String(current.year);
    finding.textContent = headline(current);
    const when = current.pending ? 'the latest date in the data' : 'after the January inaugurations';
    caption.textContent = `Governors in office on ${govDate(current.date)}, ${when}. ${govCountsText(current)}.`;
    for (const p of paths) {
      const g = current.states[p.dataset.st!];
      p.setAttribute('fill', FILL[g.party]);
      p.querySelector('title')!.textContent = `${stateNames[p.dataset.st!]}: ${g.name} (${g.detail})`;
    }
    const order = Object.keys(current.states).sort((a, b) => stateNames[a].localeCompare(stateNames[b]));
    tbody.innerHTML = order.map((st) => {
      const g = current.states[st];
      return `<tr data-st="${st}"><th scope="row"><button type="button" class="gov__pick" data-st="${st}" aria-pressed="false">${esc(stateNames[st])}</button></th><td>${esc(g.name)}</td><td>${partyMarkHtml(g.party)} ${esc(g.detail)}</td><td>${govDate(g.tookOffice)}</td></tr>`;
    }).join('');
    showSelection();
  }

  function select(st: string, fromList: boolean) {
    selected = selected === st && !fromList ? null : st;
    showSelection();
    // The list is far below the map: bring the card into view for a keyboard or touch user.
    const r = card.getBoundingClientRect();
    if (fromList && (r.top < 0 || r.bottom > innerHeight)) {
      card.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  root.addEventListener('click', (e) => {
    const t = e.target as Element;
    const btn = t.closest<HTMLElement>('.gov__pick');
    if (btn) { select(btn.dataset.st!, true); return; }
    const p = t.closest<SVGPathElement>('.gov__state');
    if (p) select(p.dataset.st!, false);
  });

  draw(store.get());
  store.subscribe((s, prev) => { if (s.year !== prev.year) draw(s); });
}
