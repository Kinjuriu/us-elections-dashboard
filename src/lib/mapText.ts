// Words for the map: title block, details panel, tooltip and accessible
// names. Shared by the build (default view) and the island (every other
// view), so both say the same thing. No DOM and no Node APIs here.
import type { Party } from './data';
import type { SenateYear, HouseYear, SenateRace, SenateFill, HouseStateYear } from './mapData';

export type View = 'senate' | 'house';

const LETTER: Record<Party, string> = { DEM: 'D', GOP: 'R', IND: 'I', OTHER: 'Other' };
const NOUN: Record<Party, string> = { DEM: 'Democrat', GOP: 'Republican', IND: 'Independent', OTHER: 'Other party' };
const ADJ: Record<Party, string> = { DEM: 'Democratic', GOP: 'Republican', IND: 'Independent', OTHER: 'Other party' };
const PLURAL: Record<Party, string> = { DEM: 'Democrats', GOP: 'Republicans', IND: 'independents', OTHER: 'other parties' };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pct = (v: number | null) => (v === null ? 'n/a' : `${v.toFixed(1)}%`);
const fmt = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

/** "R +9.6" */
export function margin(p: Party | null, pts: number | null): string {
  if (pts === null) return 'n/a';
  return `${p ? `${LETTER[p]} ` : ''}+${Math.abs(pts).toFixed(1)}`;
}

/** 116 -> "116th" */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** Caption for the Senate bar. */
export const senateBarCaption = (congress: number) => `At the opening of the ${ordinal(congress)} Congress`;

// ---------- Title block ----------

export function senateTitle(y: SenateYear): { title: string; subtitle: string } {
  const parts = [`${y.seatsUp} seats up`];
  if (y.decided === 0) parts.push('results not yet entered');
  else {
    parts.push(`${y.flips} flipped`);
    if (y.decided < y.seatsUp) parts.push(`${y.seatsUp - y.decided} not yet entered`);
  }
  if (y.provisional) parts.push('provisional');
  return { title: `Senate ${y.year}`, subtitle: parts.join(' · ') };
}

export function houseTitle(h: HouseYear): { title: string; subtitle: string } {
  const t = h.totals;
  const parts = [`${t.seats} seats`];
  if (t.dem === null || t.gop === null) parts.push('results not yet entered');
  else {
    parts.push(`${t.dem} D`, `${t.gop} R`);
    const ind = t.indDem + t.indGop + t.indUnknown;
    if (ind) parts.push(`${ind} I`);
    if (t.vacant) parts.push(`${t.vacant} vacant`);
  }
  if (h.provisional) parts.push('provisional');
  return { title: `House ${h.year}`, subtitle: parts.join(' · ') };
}

// ---------- Fills and label tone ----------

/** White labels on full party fills and hatching, ink on tints and greys. */
export function senateTone(fill: SenateFill, flipped: boolean): 'dark' | 'light' {
  if (flipped) return 'dark';
  return fill === 'dem' || fill === 'gop' || fill === 'ind' || fill === 'other' ? 'dark' : 'light';
}

/** The party colour used for a state's hatching when its seat flipped. */
export function hatchParty(fill: SenateFill): 'dem' | 'gop' | 'ind' | '' {
  if (fill.startsWith('dem')) return 'dem';
  if (fill.startsWith('gop')) return 'gop';
  if (fill.startsWith('ind')) return 'ind';
  return '';
}

// ---------- Details: tooltip and panel ----------

function raceStatus(r: SenateRace): string {
  if (!r.winnerParty) {
    const holder = r.holderCaucus ?? r.holderParty;
    return `Result not yet entered.${holder ? ` The seat was held by the ${PLURAL[holder]} going into the election.` : ''}`;
  }
  const holderLetter = r.holderParty ? LETTER[r.holderParty] : null;
  const caucusNote = r.holderParty === 'IND' && r.holderCaucus ? `, who caucused with the ${PLURAL[r.holderCaucus]}` : '';
  if (r.flipped) return `Flipped from ${holderLetter ?? 'the other party'}${caucusNote}`;
  if (r.labelOnly && r.winnerCaucus) {
    return `${ADJ[r.winnerCaucus]} caucus hold. The party label changed from ${r.holderParty ? NOUN[r.holderParty] : 'another party'} to ${NOUN[r.winnerParty]}${caucusNote}.`;
  }
  if (r.flipped === null) return '';
  return `${ADJ[r.winnerCaucus ?? r.winnerParty]} hold`;
}

function raceHtml(r: SenateRace, year: number, nRaces: number): string {
  const kind = nRaces > 1 ? (r.special ? 'Special election' : 'Regular election') : r.special ? 'Special election' : '';
  const head = `<p class="cmd__kicker">Senate ${year}${kind ? ` · ${kind}` : ''}${r.provisional ? ' · Provisional' : ''}</p>`;
  if (!r.winnerParty) return `${head}<p class="cmd__status">${esc(raceStatus(r))}</p>`;
  const caucus = r.winnerParty === 'IND' && r.winnerCaucus ? `, caucuses with the ${PLURAL[r.winnerCaucus]}` : '';
  const runner = r.runnerUpParty ? NOUN[r.runnerUpParty] : 'Runner-up';
  const status = raceStatus(r);
  const leading = r.provisional && r.called !== true ? '<p class="cmd__note">Leading, not yet called.</p>' : '';
  return `${head}
<p class="cmd__winner"><span class="cmd__swatch" data-party="${r.winnerParty}"></span><span class="cmd__name">${esc(r.winnerName ?? 'Name not in source')}</span></p>
<p class="cmd__party">${NOUN[r.winnerParty]}${caucus}</p>
<dl class="cmd__nums">
<div><dt>Winner</dt><dd>${pct(r.winnerPct)}</dd></div>
<div><dt>${runner}</dt><dd>${pct(r.runnerUpPct)}</dd></div>
<div><dt>Margin</dt><dd>${margin(r.winnerParty, r.margin)}</dd></div>
</dl>${status ? `<p class="cmd__status${r.flipped ? ' cmd__status--flip' : ''}">${esc(status)}</p>` : ''}${leading}`;
}

function houseCounts(s: HouseStateYear): string {
  if (s.dem === null || s.gop === null) return 'Results not yet entered.';
  const parts = [plural(s.dem, 'Democrat', 'Democrats'), plural(s.gop, 'Republican', 'Republicans')];
  if (s.indDem) parts.push(`${plural(s.indDem, 'independent', 'independents')} (caucuses with the Democrats)`);
  if (s.indGop) parts.push(`${plural(s.indGop, 'independent', 'independents')} (caucuses with the Republicans)`);
  if (s.indUnknown) parts.push(plural(s.indUnknown, 'independent', 'independents'));
  if (s.other) parts.push(`${fmt(s.other)} other`);
  if (s.vacant) parts.push(`${fmt(s.vacant)} vacant`);
  return parts.join(', ');
}

export function detailsHtml(view: View, st: string, name: string, senate: SenateYear, house: HouseYear): string {
  const title = `<h4 class="cmd__state">${esc(name)}</h4>`;
  if (view === 'senate') {
    const s = senate.states[st];
    if (!s) return `${title}<p class="cmd__kicker">Senate ${senate.year}</p><p class="cmd__status">No Senate race in ${esc(name)} in ${senate.year}.</p>`;
    return title + s.races.map((r) => `<div class="cmd__race">${raceHtml(r, senate.year, s.races.length)}</div>`).join('');
  }
  const h = house.states[st];
  const head = `<p class="cmd__kicker">House ${house.year} · ${plural(h.seats, 'seat', 'seats')}${h.provisional ? ' · Provisional' : ''}</p>`;
  let body = `<p class="cmd__counts">${esc(houseCounts(h))}</p>`;
  if (h.demShare !== null || h.gopShare !== null) {
    const lead: Party | null = h.demShare !== null && h.gopShare !== null ? (h.demShare >= h.gopShare ? 'DEM' : 'GOP') : null;
    body += `<dl class="cmd__nums">
<div><dt>Democratic share of House vote</dt><dd>${pct(h.demShare)}</dd></div>
<div><dt>Republican share</dt><dd>${pct(h.gopShare)}</dd></div>
<div><dt>Margin</dt><dd>${lead ? margin(lead, Math.abs((h.demShare ?? 0) - (h.gopShare ?? 0))) : 'n/a'}</dd></div>
</dl>`;
  }
  if (h.prev && h.dem !== null && h.gop !== null) {
    const d = h.dem - h.prev.dem;
    const r = h.gop - h.prev.gop;
    const change = d === 0 && r === 0 ? `No seats changed party on balance since ${h.prev.year}.`
      : `Since ${h.prev.year}: Democrats ${d >= 0 ? '+' : ''}${d}, Republicans ${r >= 0 ? '+' : ''}${r}.`;
    body += `<p class="cmd__status">${change}</p>`;
  }
  if (h.note) body += `<p class="cmd__note">${esc(h.note)}</p>`;
  return title + head + body;
}

/** Short accessible name for a state's map shape. */
export function ariaLabel(view: View, st: string, name: string, senate: SenateYear, house: HouseYear): string {
  if (view === 'senate') {
    const s = senate.states[st];
    if (!s) return `${name}: no Senate race in ${senate.year}`;
    const races = s.races.map((r) => {
      if (!r.winnerParty) return 'result not yet entered';
      const who = `${NOUN[r.winnerParty]} ${r.winnerName ?? ''} won with ${pct(r.winnerPct)}`.replace(/\s+/g, ' ');
      return `${r.special ? 'special election, ' : ''}${who}${r.flipped ? `, flipped from ${r.holderParty ? NOUN[r.holderParty] : 'the other party'}` : ''}`;
    });
    return `${name}, Senate ${senate.year}: ${races.join('; ')}`;
  }
  return `${name}, House ${house.year}: ${houseCounts(house.states[st])}`;
}
