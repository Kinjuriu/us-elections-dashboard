// The governors map follows the shared year. A click on a state writes its
// governor under the map; the list under it is the keyboard path.
import { store } from './dashboard';
import type { GovSnapshot, GovParty } from '../lib/governors';
import type { DashState } from '../lib/store';

const FILL: Record<GovParty, string> = { D: 'var(--dem)', R: 'var(--gop)', I: 'var(--ind)' };
const WORD: Record<GovParty, [string, string]> = {
  D: ['Democrat', 'Democrats'], R: ['Republican', 'Republicans'], I: ['independent', 'independents'],
};
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

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
  const readout = root.querySelector<HTMLElement>('[data-gov-readout]')!;
  const paths = [...root.querySelectorAll<SVGPathElement>('.gov__state')];
  let current: GovSnapshot = snapshots[root.dataset.year!];
  let selected: string | null = null;

  const pick = (y: number) => snapshots[y] ?? snapshots[years.filter((x) => x <= y).pop() ?? years[0]];
  const counts = (s: GovSnapshot) =>
    (['R', 'D', 'I'] as const).filter((p) => p !== 'I' || s.counts.I > 0)
      .map((p) => `${s.counts[p]} ${WORD[p][s.counts[p] === 1 ? 0 : 1]}`).join(', ');
  const headline = (s: GovSnapshot) => {
    const lead: GovParty = s.counts.R >= s.counts.D ? 'R' : 'D';
    const who = WORD[lead][1];
    if (s.pending) return `${s.year} governor results are not yet entered. On ${longDate(s.date)}, ${who} held ${s.counts[lead]} of the 50 governorships`;
    if (s.counts.R === s.counts.D) return `Democrats and Republicans each held ${s.counts.D} governorships after the ${s.year} elections`;
    return `${who} held ${s.counts[lead]} of the 50 governorships after the ${s.year} elections`;
  };
  const line = (st: string) => {
    const g = current.states[st];
    return `${stateNames[st]}: ${g.name}, ${g.detail}, in office since ${longDate(g.tookOffice)}.`;
  };

  function draw(s: DashState) {
    current = pick(s.year);
    root.dataset.year = String(current.year);
    finding.textContent = headline(current);
    const when = current.pending ? 'the latest date in the data' : 'after the January inaugurations';
    caption.textContent = `Governors in office on ${longDate(current.date)}, ${when}. ${counts(current)}.`;
    for (const p of paths) {
      const g = current.states[p.dataset.st!];
      p.setAttribute('fill', FILL[g.party]);
      p.querySelector('title')!.textContent = `${stateNames[p.dataset.st!]}: ${g.name} (${g.detail})`;
    }
    const order = Object.keys(current.states).sort((a, b) => stateNames[a].localeCompare(stateNames[b]));
    tbody.innerHTML = order.map((st) => {
      const g = current.states[st];
      return `<tr><th scope="row">${stateNames[st]}</th><td>${g.name}</td><td><span class="gov__sw" style="background:${FILL[g.party]}"></span>${g.detail}</td><td>${longDate(g.tookOffice)}</td></tr>`;
    }).join('');
    if (selected) readout.textContent = line(selected);
  }

  root.addEventListener('click', (e) => {
    const p = (e.target as Element).closest<SVGPathElement>('.gov__state');
    if (!p) return;
    selected = p.dataset.st!;
    for (const q of paths) q.classList.toggle('is-sel', q === p);
    readout.textContent = line(selected);
  });

  draw(store.get());
  store.subscribe((s, prev) => { if (s.year !== prev.year) draw(s); });
}
