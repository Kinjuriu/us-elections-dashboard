// Redraws the header seat bars for the selected year, and for a comparison
// year when one is set.
import { store } from './dashboard';
import { setSeatBar } from '../lib/seatbar-client';
import { ordinal } from '../lib/mapText';
import type { HeaderYear, HeaderChamber } from '../lib/dashboardData';
import type { DashState } from '../lib/store';

const root = document.querySelector<HTMLElement>('[data-hbars]');
if (root) init(root);

function init(root: HTMLElement) {
  const years = JSON.parse(root.querySelector('[data-hb-data]')!.textContent!) as Record<number, HeaderYear>;
  const title = root.querySelector<HTMLElement>('.chart-frame__title')!;
  const subtitle = root.querySelector<HTMLElement>('.chart-frame__subtitle')!;
  const note = root.querySelector<HTMLElement>('[data-hb-note]')!;
  const controlNote = root.querySelector<HTMLElement>('[data-hb-control-note]')!;
  const indNote = root.querySelector<HTMLElement>('[data-hb-ind-note]')!;
  const cols = [...root.querySelectorAll<HTMLElement>('.hbars__col')];

  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

  /** "Democrats -22   Republicans +23", from the earlier Congress to the later. */
  function changeHtml(a: HeaderChamber, b: HeaderChamber, yA: number, yB: number, cA: number, cB: number): string {
    if (cA === cB) return `${yA} and ${yB}: the same Congress, so no change`;
    if (a.balance.dem === null || b.balance.dem === null || a.balance.gop === null || b.balance.gop === null) {
      return 'No change shown: results for one of these years are not yet entered';
    }
    const ind = (x: HeaderChamber) => x.balance.indDem + x.balance.indGop + x.balance.indUnknown;
    const parts = [
      ['Democrats', b.balance.dem - a.balance.dem],
      ['Republicans', b.balance.gop - a.balance.gop],
    ] as [string, number][];
    if (ind(a) || ind(b)) parts.push(['Independents', ind(b) - ind(a)]);
    return `<span class="hbars__delta">${yA} to ${yB}:</span>` +
      parts.map(([who, n]) => `<span class="hbars__delta">${who} ${signed(n)}</span>`).join('');
  }

  function draw(s: DashState) {
    const h = years[s.year];
    const c = s.compare !== null ? years[s.compare] : null;
    title.textContent = h.title;
    subtitle.textContent = c
      ? `Seats held at the opening of the Congress elected in ${Math.min(h.shownYear, c.shownYear)} and the one elected in ${Math.max(h.shownYear, c.shownYear)}. One square per seat.`
      : h.subtitle;
    const notes = [h.note, c?.note].filter(Boolean) as string[];
    note.textContent = [...new Set(notes)].join(' ');
    note.hidden = !notes.length;
    const senateNotes = [h, c].filter((x): x is HeaderYear => !!x && !!x.senate.majorityNote)
      .map((x) => `${ordinal(x.congress)} Congress: ${x.senate.majorityNote}`);
    controlNote.textContent = senateNotes.length ? `Senate control. ${[...new Set(senateNotes)].join(' ')}` : '';
    indNote.textContent = [h, c].some((x) => x && (x.senate.unverifiedInd || x.house.unverifiedInd))
      ? 'The source gives the number of independents but not their caucus for this Congress; the caucus shown is still to be confirmed.'
      : '';

    // Earlier year on top when comparing.
    const [first, second] = c && c.year < h.year ? [c, h] : [h, c];
    for (const col of cols) {
      const id = col.dataset.chamber as 'house' | 'senate';
      const primary = col.querySelector<HTMLElement>('[data-slot="primary"]')!;
      const compare = col.querySelector<HTMLElement>('[data-slot="compare"]')!;
      const change = col.querySelector<HTMLElement>('[data-hb-change]')!;
      const paint = (slot: HTMLElement, y: HeaderYear) => {
        const bar = slot.querySelector<HTMLElement>('[data-seat-bar]')!;
        setSeatBar(bar, y[id].balance, y[id].provisional);
        bar.querySelector('.seat-bar__caption')!.textContent =
          y.year === y.shownYear ? y[id].caption : `${y[id].caption} (selected: ${y.year})`;
      };
      paint(primary, first);
      if (second) {
        paint(compare, second);
        change.innerHTML = changeHtml(first[id], second[id], first.shownYear, second.shownYear, first.congress, second.congress);
      }
      compare.hidden = !second;
      change.hidden = !second;
    }
  }

  // Cheap enough to always run: the build drew the default year, the URL may ask for another.
  draw(store.get());
  store.subscribe((s, prev) => {
    if (s.year !== prev.year || s.compare !== prev.compare) draw(s);
  });
}
