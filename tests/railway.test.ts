import { test } from 'node:test';
import assert from 'node:assert/strict';
import { railway, nearest, stationYearFor, fillOf, type RailColumn } from '../src/lib/railway.ts';
import { hemicycle, blocks, changeText, centre, cardViews } from '../src/lib/cards.ts';

const col = (year: number, house: any, senate: any, extra: Partial<RailColumn> = {}): RailColumn =>
  ({ year, house, senate, special: false, provisional: false, ...extra });

test('stations start in 2000, skip specials, and runs merge by colour', () => {
  const r = railway([
    col(1998, 'GOP', 'GOP'), col(2000, 'GOP', 'DEM'), col(2001, null, 'DEM', { special: true }),
    col(2002, 'GOP', 'GOP'), col(2004, 'GOP', 'GOP'), col(2006, null, null, { provisional: true }),
  ]);
  assert.deepEqual(r.stations.map((s) => s.year), [2000, 2002, 2004, 2006]);
  const house = r.runs.filter((x) => x.chamber === 'house');
  assert.deepEqual(house.map((x) => [x.fill, x.from, x.to, x.dashed]), [['gop', 0, 3, false], ['none', 3, 3.5, true]]);
  assert.equal(r.usesAmber, false);
  assert.equal(fillOf('IND'), 'ind');
});

test('nearest station and odd years', () => {
  assert.equal(nearest([10, 20, 30], 26), 2);
  assert.equal(nearest([10, 20, 30], -50), 0);
  assert.equal(stationYearFor(2021), 2020);
});

test('hemicycle has one seat per member, ordered left to right', () => {
  const seats = hemicycle(100);
  assert.equal(seats.length, 100);
  assert.ok(seats[0].x < 0 && seats[99].x > 0);
});

test('blocks and change text', () => {
  const b = { dem: 215, gop: 220, indDem: 0, indGop: 0, indUnknown: 0, other: 0, vacant: 0 };
  assert.deepEqual(blocks(b, 435).map((x) => x.id), ['dem', 'gop']);
  assert.equal(changeText(215, 213, 2022), '+2 since 2022');
  assert.equal(changeText(215, 215, 2022), 'no change since 2022');
  assert.equal(changeText(215, null, null), '');
});
