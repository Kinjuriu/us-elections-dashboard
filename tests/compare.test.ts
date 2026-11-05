// The comparison sentence and the Senate card's big number, on hand-made
// balances. The numbers on the real page are checked in tests/e2e/dashboard.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareLine, changeLine, orderPair } from '../src/lib/compare.ts';
import { centre, openingDayLine, controlDiffers, type ChamberView } from '../src/lib/cards.ts';

const bal = (dem: number, gop: number, extra = {}) =>
  ({ dem, gop, indDem: 0, indGop: 0, indUnknown: 0, other: 0, vacant: 0, ...extra });
const chamber = (b: any) => ({ balance: b, total: 100, threshold: 51, controller: null });
const year = (y: number, senate: any, house: any) => ({ year: y, senate: chamber(senate), house: chamber(house) }) as any;

const y2020 = year(2020, bal(46, 51, { indDem: 2, vacant: 1 }), bal(222, 212, { vacant: 1 }));
const y2024 = year(2024, bal(45, 53, { indDem: 2 }), bal(215, 220));

test('a pair is always earlier first', () => {
  assert.deepEqual(orderPair(2024, 2020), [2020, 2024]);
  assert.deepEqual(orderPair(2020, 2024), [2020, 2024]);
});

test('the sentence is the same in either order and is built from the seat counts', () => {
  const a = compareLine(y2020, y2024);
  assert.equal(a, compareLine(y2024, y2020));
  assert.equal(a, '2020 compared with 2024: Republicans gained 2 Senate seats and 8 House seats');
});

test('different parties in the two chambers are each named', () => {
  const b = year(2024, bal(45, 60), bal(250, 185));
  const a = year(2020, bal(46, 54), bal(222, 213));
  assert.equal(compareLine(a, b), '2020 compared with 2024: Republicans gained 6 Senate seats; Democrats gained 28 House seats');
  const same = year(2022, bal(46, 54), bal(222, 213));
  assert.equal(compareLine(a, same), '2020 compared with 2022: no Senate seats changed party; no House seats changed party');
});

test('change lines read "from to (difference)"', () => {
  assert.equal(changeLine('dem', 222, 215), 'Democrats 222 to 215 (-7)');
  assert.equal(changeLine('gop', 212, 220), 'Republicans 212 to 220 (+8)');
  assert.equal(changeLine('gop', 5, 5), 'Republicans 5 to 5 (0)');
});

const view = (b: any, controller: 'dem' | 'gop' | null): ChamberView =>
  ({ id: 'senate', name: 'Senate', total: 100, threshold: 51, caption: '', balance: b, kinds: [], blocks: [],
    change: { dem: '', gop: '' }, label: '', controller }) as any;

test('when opening day and the Congress as a whole disagree, the card names the party in control', () => {
  const v2020 = view(bal(46, 51, { indDem: 2, vacant: 1 }), 'dem');
  assert.ok(controlDiffers(v2020));
  assert.equal(centre(v2020, null).big, 'Democrats');
  assert.equal(openingDayLine(v2020.balance), 'On opening day: 51 Republicans, 46 Democrats, 2 independents, 1 vacant');
  // A tie on opening day also differs from the party that held the chamber for most of the Congress.
  assert.ok(controlDiffers(view(bal(50, 50), 'dem')));
  // Agreement keeps the seat count.
  const v2024 = view(bal(45, 53, { indDem: 2 }), 'gop');
  assert.ok(!controlDiffers(v2024));
  assert.equal(centre(v2024, null).big, '53');
});
