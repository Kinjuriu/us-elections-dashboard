// The dashboard's shared state: year, chamber, selected state and an
// optional comparison year, mirrored in the URL query string
// (?year=2018&chamber=senate&state=GA&compare=2022). Every module reads from
// one store and redraws when it changes.
//
// No DOM here, so the tests can run it in Node. The browser instance lives
// in src/scripts/dashboard.ts.

export type Chamber = 'senate' | 'house';

export interface DashState {
  year: number;
  chamber: Chamber;
  /** Postal code of the state whose record is open, or null. */
  state: string | null;
  /** A second year to compare with, or null. */
  compare: number | null;
}

export interface StoreConfig {
  /** Years every view has: the even years 2000 to 2026. */
  years: number[];
  /** Years only the Senate view has: odd-year special elections. */
  senateOnlyYears: number[];
  /** Postal codes a state view can open on. */
  states: string[];
  defaultYear: number;
  defaultChamber: Chamber;
}

export const CHAMBERS: Chamber[] = ['senate', 'house'];

/** The years the year control offers for a chamber, in order. */
export function yearsFor(chamber: Chamber, cfg: StoreConfig): number[] {
  const ys = chamber === 'senate' ? [...cfg.years, ...cfg.senateOnlyYears] : [...cfg.years];
  return ys.sort((a, b) => a - b);
}

export function defaultState(cfg: StoreConfig): DashState {
  return { year: cfg.defaultYear, chamber: cfg.defaultChamber, state: null, compare: null };
}

const asYear = (v: string | null): number | null => (v !== null && /^\d{4}$/.test(v) ? Number(v) : null);

/** Read the state from a query string. Anything invalid falls back to its default. */
export function parseState(search: string, cfg: StoreConfig): DashState {
  const p = new URLSearchParams(search);
  const d = defaultState(cfg);
  const rawChamber = p.get('chamber');
  const chamber = CHAMBERS.includes(rawChamber as Chamber) ? (rawChamber as Chamber) : d.chamber;
  const valid = yearsFor(chamber, cfg);
  const y = asYear(p.get('year'));
  const year = y !== null && valid.includes(y) ? y : d.year;
  const st = (p.get('state') ?? '').toUpperCase();
  const state = cfg.states.includes(st) ? st : null;
  const c = asYear(p.get('compare'));
  const compare = c !== null && valid.includes(c) && c !== year ? c : null;
  return { year, chamber, state, compare };
}

/** The query string for a state, starting with "?". */
export function serializeState(s: DashState): string {
  const p = new URLSearchParams();
  p.set('year', String(s.year));
  p.set('chamber', s.chamber);
  if (s.state) p.set('state', s.state);
  if (s.compare !== null) p.set('compare', String(s.compare));
  return `?${p.toString()}`;
}

/**
 * Make a requested state valid. Used when a control changes the state, so it
 * keeps as much of the request as it can: switching to the House from a
 * Senate-only year moves to the election year before it, and a comparison
 * that no longer makes sense is cleared.
 */
export function normalize(s: DashState, cfg: StoreConfig): DashState {
  const chamber = CHAMBERS.includes(s.chamber) ? s.chamber : cfg.defaultChamber;
  const valid = yearsFor(chamber, cfg);
  let year = s.year;
  if (!valid.includes(year)) {
    const earlier = valid.filter((y) => y < year);
    year = earlier.length ? earlier[earlier.length - 1] : cfg.defaultYear;
  }
  const state = s.state && cfg.states.includes(s.state) ? s.state : null;
  const compare = s.compare !== null && valid.includes(s.compare) && s.compare !== year ? s.compare : null;
  return { year, chamber, state, compare };
}

export const sameState = (a: DashState, b: DashState) =>
  a.year === b.year && a.chamber === b.chamber && a.state === b.state && a.compare === b.compare;

export type Listener = (next: DashState, prev: DashState) => void;

export interface Store {
  get(): DashState;
  /** Change some fields. Listeners run only if the state actually changed. */
  set(patch: Partial<DashState>): void;
  subscribe(fn: Listener): () => void;
}

export function createStore(cfg: StoreConfig, initial: DashState = defaultState(cfg)): Store {
  let current = normalize(initial, cfg);
  const listeners = new Set<Listener>();
  return {
    get: () => current,
    set(patch) {
      const next = normalize({ ...current, ...patch }, cfg);
      if (sameState(next, current)) return;
      const prev = current;
      current = next;
      for (const fn of listeners) fn(next, prev);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
