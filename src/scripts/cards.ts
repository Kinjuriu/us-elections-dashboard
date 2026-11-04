// Redraws the two balance cards for the selected year, measuring change from
// the previous election or from the comparison year, and handles picking a
// party (outline it, fade the other) on either card.
import { store } from './dashboard';
import { cardViews, centre, blocksHtml, independentsLine, type Party, type ChamberView } from '../lib/cards';
import type { HeaderYear } from '../lib/dashboardData';
import type { DashState } from '../lib/store';

const root = document.querySelector<HTMLElement>('[data-cards]');
if (root) init(root);

function init(root: HTMLElement) {
  const years = JSON.parse(root.querySelector('[data-cards-data]')!.textContent!) as Record<number, HeaderYear>;
  const houseCard = root.querySelector<HTMLElement>('[data-card="house"]')!;
  const senateCard = root.querySelector<HTMLElement>('[data-card="senate"]')!;
  const seats = [...senateCard.querySelectorAll<SVGRectElement>('svg[data-hemi] rect')];
  let picked: Party | null = null;
  let senate: ChamberView;

  const text = (card: HTMLElement, sel: string, value: string) => {
    const el = card.querySelector(sel);
    if (el && el.textContent !== value) el.textContent = value;
  };

  function drawCentre() {
    const c = centre(senate, picked);
    text(senateCard, '[data-big]', c.big);
    text(senateCard, '[data-who]', c.who);
    text(senateCard, '[data-chg]', c.change);
  }

  function drawPicked() {
    if (picked) root!.dataset.party = picked;
    else delete root!.dataset.party;
    for (const b of root!.querySelectorAll<HTMLElement>('button[data-party]')) {
      b.setAttribute('aria-pressed', String(b.dataset.party === picked));
    }
    drawCentre();
  }

  function draw(s: DashState) {
    const h = years[s.year];
    const compare = s.compare !== null ? years[s.compare] : null;
    const [house, sen] = cardViews(h, compare);
    senate = sen;

    seats.forEach((r, i) => { if (r.dataset.kind !== sen.kinds[i]) r.dataset.kind = sen.kinds[i]; });
    senateCard.querySelector('svg[data-hemi]')!.setAttribute('aria-label', sen.label);
    for (const p of ['dem', 'gop'] as const) text(senateCard, `[data-n="${p}"]`, String(sen.balance[p] ?? 'n/a'));
    text(senateCard, '[data-caption]', sen.caption);
    text(senateCard, '[data-line]', independentsLine(sen.balance));

    text(houseCard, '[data-caption]', house.caption);
    text(houseCard, '[data-line]', independentsLine(house.balance));
    houseCard.querySelector('[data-blocks-row]')!.innerHTML = blocksHtml(house, picked);
    drawCentre();
  }

  root.addEventListener('click', (e) => {
    const el = e.target as Element;
    const btn = el.closest<HTMLElement>('[data-party]');
    const seat = el.closest<SVGRectElement>('svg[data-hemi] rect');
    const p = (btn?.dataset.party ?? (seat && (seat.dataset.kind === 'dem' || seat.dataset.kind === 'gop') ? seat.dataset.kind : null)) as Party | null;
    if (!p) return;
    picked = picked === p ? null : p;
    drawPicked();
  });

  draw(store.get());
  store.subscribe((s, prev) => {
    if (s.year !== prev.year || s.compare !== prev.compare) draw(s);
  });
}
