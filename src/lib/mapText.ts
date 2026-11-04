// Words for the map: title block, details panel, tooltip and accessible
// names. Shared by the build (default view) and the island (every other
// view), so both say the same thing. No DOM and no Node APIs here.
import type { Party } from './data';
import type { SenateYear, HouseYear, SenateRace, SenateFill, HouseStateYear, MapData } from './mapData';

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

const DARK: SenateFill[] = ['dem', 'gop', 'ind', 'other'];

/** White labels on full party fills and hatching, ink on tints and greys. */
export function senateTone(fill: SenateFill, flipped: boolean, split: [SenateFill, SenateFill] | null = null): 'dark' | 'light' {
  if (split) return DARK.includes(split[0]) && DARK.includes(split[1]) ? 'dark' : 'light';
  if (flipped) return 'dark';
  return DARK.includes(fill) ? 'dark' : 'light';
}

/** Fills a split state can have on each half. */
export const SPLIT_FILLS: SenateFill[] = ['dem', 'gop', 'ind', 'other', 'dem-lead', 'gop-lead', 'ind-lead', 'pending'];

/** The party colour used for a state's hatching when its seat flipped. */
/** Split states are not hatched; the panel says which race flipped. */
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

// ---------- State view: a state's full record since 2000 ----------

type RecordData = Pick<MapData, 'years' | 'senateOnlyYears' | 'senate' | 'house'>;

const SQ = 7;
const SQ_GAP = 1;

/** One small seat bar: a square per seat, Democrats from the left. */
function delegationSvg(s: HouseStateYear): string {
  const kinds: string[] = [];
  const push = (k: string, n: number) => { for (let i = 0; i < n; i++) kinds.push(k); };
  if (s.dem === null || s.gop === null) push('missing', s.seats);
  else {
    push('dem', s.dem);
    push('ind', s.indDem);
    push('other', s.other);
    push('ind', s.indUnknown);
    push('vacant', s.vacant);
    push('missing', s.seats - s.dem - s.gop - s.indDem - s.indGop - s.indUnknown - s.other - s.vacant);
    push('ind', s.indGop);
    push('gop', s.gop);
  }
  const w = kinds.length * (SQ + SQ_GAP) - SQ_GAP;
  const rects = kinds.map((k, i) => {
    const outlined = k === 'vacant' || k === 'missing';
    const o = outlined ? 0.5 : 0;
    return `<rect x="${i * (SQ + SQ_GAP) + o}" y="${o}" width="${SQ - 2 * o}" height="${SQ - 2 * o}" data-kind="${k}"/>`;
  }).join('');
  return `<svg class="cmr__bar" width="${w}" viewBox="0 0 ${w} ${SQ}" aria-hidden="true">${rects}</svg>`;
}

function delegationText(s: HouseStateYear): string {
  if (s.dem === null || s.gop === null) return 'Not yet entered';
  const parts = [`${s.dem} D`, `${s.gop} R`];
  const ind = s.indDem + s.indGop + s.indUnknown;
  if (ind) parts.push(`${ind} I`);
  if (s.other) parts.push(`${s.other} other`);
  if (s.vacant) parts.push(`${s.vacant} vacant`);
  return parts.join(', ');
}

/**
 * The panel beside the map when a state is selected: the selected year's
 * result, then every Senate race and every House delegation since 2000.
 */
export function stateRecordHtml(view: View, st: string, name: string, data: RecordData, year: number): string {
  const houseYear = data.house[year] ?? data.house[year - 1];
  const now = detailsHtml(view, st, name, data.senate[year], houseYear);

  const senateYears = [...data.years, ...data.senateOnlyYears].sort((a, b) => a - b);
  const races = senateYears.flatMap((y) => (data.senate[y].states[st]?.races ?? []).map((r) => ({ y, r })));
  const rows = races.map(({ y, r }) => {
    const current = y === year && view === 'senate';
    const flip = r.flipped ? 'Flipped' : r.labelOnly ? 'Label change' : '';
    const who = r.winnerParty
      ? `<span class="cmr__name">${esc(r.winnerName ?? 'Name not in source')}</span>`
      : '<span class="cmr__pending">Not yet entered</span>';
    return `<tr${current ? ' class="is-current"' : ''}>
<td class="cmr__num">${y}${r.special ? '<span class="cmr__sub">Special</span>' : ''}${r.provisional ? '<span class="cmr__sub">Provisional</span>' : ''}</td>
<td>${who}</td>
<td>${r.winnerParty ? `<span class="cmd__swatch" data-party="${r.winnerParty}"></span>${LETTER[r.winnerParty]}` : ''}</td>
<td class="cmr__num">${r.winnerParty ? `+${Math.abs(r.margin ?? 0).toFixed(1)}` : ''}</td>
<td>${flip}</td>
</tr>`;
  }).join('');
  const senateTable = races.length
    ? `<table class="cmr__table">
<caption class="visually-hidden">Senate races in ${esc(name)} since ${senateYears[0]}</caption>
<thead><tr><th scope="col">Year</th><th scope="col">Winner</th><th scope="col">Party</th><th scope="col" class="cmr__num">Margin</th><th scope="col">Flipped</th></tr></thead>
<tbody>${rows}</tbody></table>`
    : `<p class="cmd__note">No Senate races in ${esc(name)} since ${senateYears[0]}.</p>`;

  const houseRows = data.years.map((y) => {
    const s = data.house[y].states[st];
    const current = y === year && view === 'house';
    return `<li class="cmr__row${current ? ' is-current' : ''}">
<span class="cmr__year cmr__num">${y}</span>${delegationSvg(s)}<span class="cmr__counts" aria-hidden="true">${delegationText(s)}</span>
<span class="visually-hidden">: ${esc(houseCounts(s))}${s.provisional ? ', provisional' : ''}</span></li>`;
  }).join('');

  return `${now}
<h5 class="cmr__head">Senate races since ${senateYears[0]}</h5>
${senateTable}
<h5 class="cmr__head">House delegation since ${data.years[0]}</h5>
<p class="cmd__note">One square per seat, Democrats from the left.</p>
<ul class="cmr__rows">${houseRows}</ul>`;
}

// ---------- Compare: states that changed between two years ----------

/**
 * Which caucus held each Senate seat (by class) after the elections of a
 * year: the winner of the latest race for that seat in or before the year.
 * Seats last elected before the first year in the data are unknown.
 * Appointments and party switches between elections are not counted.
 */
function senateHolders(data: RecordData, year: number): Record<string, Record<number, Party | null>> {
  const out: Record<string, Record<number, Party | null>> = {};
  const ys = [...data.years, ...data.senateOnlyYears].filter((y) => y <= year).sort((a, b) => a - b);
  for (const y of ys) {
    for (const [st, s] of Object.entries(data.senate[y].states)) {
      for (const r of s.races) {
        if (r.seatClass === null) continue;
        (out[st] ??= {})[r.seatClass] = r.winnerCaucus ?? r.winnerParty;
      }
    }
  }
  return out;
}

/** States where a Senate seat is held by a different caucus in the two years. */
export function senateChanged(data: RecordData, a: number, b: number): Set<string> {
  const ha = senateHolders(data, a);
  const hb = senateHolders(data, b);
  const changed = new Set<string>();
  for (const st of Object.keys(hb)) {
    for (const [cls, p] of Object.entries(hb[st])) {
      const q = ha[st]?.[Number(cls)];
      if (p && q && p !== q) changed.add(st);
    }
  }
  return changed;
}

/** Which party has more of a state's House seats (independents with their caucus). */
function houseMajority(s: HouseStateYear | undefined): Party | 'TIE' | null {
  if (!s || s.dem === null || s.gop === null) return null;
  const d = s.dem + s.indDem;
  const r = s.gop + s.indGop;
  return d > r ? 'DEM' : r > d ? 'GOP' : 'TIE';
}

/** States whose House delegation has a different majority in the two years. */
export function houseChanged(data: RecordData, a: number, b: number): Set<string> {
  const changed = new Set<string>();
  const ha = data.house[a];
  const hb = data.house[b];
  if (!ha || !hb) return changed;
  for (const st of Object.keys(hb.states)) {
    const p = houseMajority(ha.states[st]);
    const q = houseMajority(hb.states[st]);
    if (p && q && p !== q) changed.add(st);
  }
  return changed;
}
