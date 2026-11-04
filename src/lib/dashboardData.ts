// Build-time data for the dashboard layer: the store's configuration and,
// for every year the year control offers, the Congress the header seat bars
// show. Read from data/processed/chamber_control.csv and independents.csv.
import { loadChamberControl, loadIndependents, hasCounts, PARTY_NAME, type ChamberControl, type Party } from './data';
import { balanceFrom, defaultYear, type Balance, type MapData } from './mapData';
import { ordinal } from './mapText';
import type { StoreConfig } from './store';
import type { ControlChart } from './chartData';

export interface HeaderChamber {
  balance: Balance;
  total: number;
  threshold: number;
  provisional: boolean;
  /** "116th Congress, elected 2018" */
  caption: string;
  majorityNote: string;
  unverifiedInd: boolean;
}

export interface HeaderYear {
  /** The year selected. */
  year: number;
  /** The election whose Congress the bars show. */
  shownYear: number;
  congress: number;
  yearsServed: string;
  /** Why the bars show a different year, or ''. */
  note: string;
  title: string;
  subtitle: string;
  house: HeaderChamber;
  senate: HeaderChamber;
}

const majorityOf = (r: ChamberControl) => r.majorityMostOfCongress ?? r.majorityParty;
const many = (p: Party | null) => (p ? PARTY_NAME[p].many : 'No party');

export function headerTitle(houseMaj: Party | null, senateMaj: Party | null, year: number): string {
  return houseMaj && houseMaj === senateMaj
    ? `${many(houseMaj)} control both the House and the Senate after the ${year} election`
    : `${many(houseMaj)} hold the House and ${senateMaj ? PARTY_NAME[senateMaj].many : 'no party'} the Senate after the ${year} election`;
}

export function loadHeaderYears(map: MapData): Record<number, HeaderYear> {
  const control = loadChamberControl();
  const inds = loadIndependents();
  const latestWithCounts = Math.max(...control.filter(hasCounts).map((r) => r.electionYear));
  const row = (chamber: 'house' | 'senate', y: number) =>
    control.find((r) => r.chamber === chamber && r.electionYear === y);

  const out: Record<number, HeaderYear> = {};
  for (const year of [...map.years, ...map.senateOnlyYears]) {
    const electionYear = year % 2 === 1 ? year - 1 : year;
    const hasData = hasCounts(row('house', electionYear)!) && hasCounts(row('senate', electionYear)!);
    const shownYear = hasData ? electionYear : latestWithCounts;
    const h = row('house', shownYear)!;
    const s = row('senate', shownYear)!;

    let note = '';
    if (year !== electionYear) {
      note = `No Congress was elected in ${year}. These bars show the ${ordinal(h.congress)} Congress, elected in ${electionYear}, which was sitting during the ${year} special elections.`;
    } else if (!hasData) {
      note = `${year} results are not yet entered, so these bars show the Congress elected in ${shownYear}. They will switch to the ${year} results, labelled provisional, once those are entered.`;
    }

    const chamber = (r: ChamberControl, c: 'house' | 'senate'): HeaderChamber => ({
      balance: balanceFrom(r, inds, c),
      total: r.totalSeats,
      threshold: r.majorityThreshold,
      provisional: r.isProvisional,
      caption: `${ordinal(r.congress)} Congress, elected ${r.electionYear}`,
      majorityNote: r.majorityNote,
      unverifiedInd: inds.some((i) => i.chamber === c && i.congress === r.congress && !i.verified),
    });

    out[year] = {
      year,
      shownYear,
      congress: h.congress,
      yearsServed: h.yearsServed,
      note,
      title: headerTitle(majorityOf(h), majorityOf(s), shownYear),
      subtitle: `Seats held at the opening of the ${ordinal(h.congress)} Congress, which sits from ${h.yearsServed.replace('-', ' to ')}. One square per seat.`,
      house: chamber(h, 'house'),
      senate: chamber(s, 'senate'),
    };
  }
  return out;
}

export function storeConfig(map: MapData): StoreConfig {
  return {
    years: map.years,
    senateOnlyYears: map.senateOnlyYears,
    states: Object.keys(map.stateNames).sort(),
    defaultYear: defaultYear(map),
    defaultChamber: 'senate',
  };
}

export interface StripColumn {
  year: number;
  senate: Party | null;
  house: Party | null;
  /** An odd-year Senate special election: half width, Senate view only. */
  special: boolean;
  /** The map and the rest of the page can show this year. */
  selectable: boolean;
  provisional: boolean;
}

/**
 * One column per election from the first Congress in the history chart to the
 * last, in order, with the Senate's odd-year special elections between them.
 * Each column carries both chambers' majority; the chamber chosen picks which
 * one is drawn.
 */
export function stripColumns(chart: ControlChart, cfg: StoreConfig): StripColumn[] {
  const out: StripColumn[] = [];
  for (const c of chart.congresses) {
    out.push({
      year: c.electionYear,
      senate: c.senate.majority,
      house: c.house.majority,
      special: false,
      selectable: cfg.years.includes(c.electionYear),
      provisional: c.senate.provisional || c.house.provisional,
    });
    for (const y of cfg.senateOnlyYears) {
      if (y === c.electionYear + 1) {
        out.push({ year: y, senate: c.senate.majority, house: null, special: true, selectable: true, provisional: false });
      }
    }
  }
  return out;
}
