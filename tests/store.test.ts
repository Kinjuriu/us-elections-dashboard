// Store tests: URL in, URL out, invalid values. Run with `npm test`
// (Node's own test runner; Node 23.6 or later runs TypeScript directly).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseState, serializeState, normalize, createStore, yearsFor, type StoreConfig, type DashState,
} from '../src/lib/store.ts';

const years: number[] = [];
for (let y = 2000; y <= 2026; y += 2) years.push(y);
const cfg: StoreConfig = {
  years,
  senateOnlyYears: [2013, 2017],
  states: ['AL', 'AZ', 'GA', 'NJ', 'PA', 'TX'],
  defaultYear: 2024,
  defaultChamber: 'senate',
};
const DEFAULT: DashState = { year: 2024, chamber: 'senate', state: null, compare: null };

test('URL in: a full query string', () => {
  assert.deepEqual(parseState('?year=2018&chamber=senate&state=GA', cfg),
    { year: 2018, chamber: 'senate', state: 'GA', compare: null });
  assert.deepEqual(parseState('?year=2018&chamber=house&compare=2022', cfg),
    { year: 2018, chamber: 'house', state: null, compare: 2022 });
});

test('URL in: an empty query gives the defaults', () => {
  assert.deepEqual(parseState('', cfg), DEFAULT);
  assert.deepEqual(parseState('?', cfg), DEFAULT);
});

test('URL in: state codes are not case sensitive', () => {
  assert.equal(parseState('?state=ga', cfg).state, 'GA');
});

test('URL out: fields in a fixed order, empty ones left out', () => {
  assert.equal(serializeState({ year: 2018, chamber: 'senate', state: 'GA', compare: null }),
    '?year=2018&chamber=senate&state=GA');
  assert.equal(serializeState({ year: 2022, chamber: 'house', state: null, compare: 2018 }),
    '?year=2022&chamber=house&compare=2018');
  assert.equal(serializeState(DEFAULT), '?year=2024&chamber=senate');
});

test('URL round trip', () => {
  const s: DashState = { year: 2013, chamber: 'senate', state: 'NJ', compare: 2012 };
  assert.deepEqual(parseState(serializeState(s), cfg), s);
});

test('invalid values fall back to their defaults, one field at a time', () => {
  const cases: [string, Partial<DashState>][] = [
    ['?year=1999', { year: 2024 }],
    ['?year=2019', { year: 2024 }],
    ['?year=20188', { year: 2024 }],
    ['?year=2018.0', { year: 2024 }],
    ['?year=abc', { year: 2024 }],
    ['?year=', { year: 2024 }],
    ['?chamber=congress', { chamber: 'senate' }],
    ['?chamber=SENATE', { chamber: 'senate' }],
    ['?state=ZZ', { state: null }],
    ['?state=G', { state: null }],
    ['?state=<script>', { state: null }],
    ['?compare=1990', { compare: null }],
    ['?compare=nope', { compare: null }],
  ];
  for (const [q, want] of cases) {
    assert.deepEqual(parseState(q, cfg), { ...DEFAULT, ...want }, q);
  }
  // A bad field does not reset the good ones.
  assert.deepEqual(parseState('?year=2018&chamber=senate&state=XX&compare=3000', cfg),
    { year: 2018, chamber: 'senate', state: null, compare: null });
});

test('odd-year specials are Senate only', () => {
  assert.equal(parseState('?year=2013&chamber=senate', cfg).year, 2013);
  assert.equal(parseState('?year=2013&chamber=house', cfg).year, 2024);
  assert.equal(parseState('?year=2018&chamber=house&compare=2017', cfg).compare, null);
  assert.deepEqual(yearsFor('house', cfg), years);
  assert.ok(yearsFor('senate', cfg).includes(2017));
});

test('a comparison with the same year is dropped', () => {
  assert.equal(parseState('?year=2018&compare=2018', cfg).compare, null);
});

test('normalize: switching to the House from a special year moves to the year before', () => {
  assert.deepEqual(normalize({ year: 2017, chamber: 'house', state: 'AL', compare: 2013 }, cfg),
    { year: 2016, chamber: 'house', state: 'AL', compare: null });
});

test('store: set, subscribe, no event when nothing changes', () => {
  const store = createStore(cfg);
  const seen: [DashState, DashState][] = [];
  const off = store.subscribe((next, prev) => seen.push([next, prev]));
  store.set({ year: 2018 });
  store.set({ year: 2018 });
  store.set({ state: 'GA' });
  store.set({ compare: 2018 }); // same as year: dropped, so no change
  off();
  store.set({ year: 2020 });
  assert.equal(seen.length, 2);
  assert.deepEqual(seen[0][1], DEFAULT);
  assert.deepEqual(seen[1][0], { year: 2018, chamber: 'senate', state: 'GA', compare: null });
  assert.equal(store.get().year, 2020);
});

test('store: changing the year clears a comparison that would equal it', () => {
  const store = createStore(cfg, { ...DEFAULT, year: 2018, compare: 2022 });
  store.set({ year: 2022 });
  assert.equal(store.get().compare, null);
});
