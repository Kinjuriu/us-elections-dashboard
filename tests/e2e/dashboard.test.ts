// End-to-end check: changing the year in the control bar updates the map,
// the header seat bars and the flips table together, and the URL follows.
// Run with `npm run test:e2e` (builds first). Needs Google Chrome; set
// CHROME_PATH if it is not in the usual place.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, type Page, type Browser } from './browser.ts';

let srv: Awaited<ReturnType<typeof serve>>;
let browser: Browser;
let page: Page;

before(async () => {
  srv = await serve();
  browser = await launch();
  page = await browser.page();
  await page.viewport(1440, 900);
});
after(async () => {
  await browser?.close();
  await srv?.close();
});

const read = () => page.eval<{
  url: string; mapTitle: string; barCaptions: string[]; houseDem: string; flipsYear: string; flipsStates: string[]; pressed: string[];
}>(`({
  url: location.search,
  mapTitle: document.querySelector('.cmap [data-title]').textContent,
  barCaptions: [...document.querySelectorAll('[data-hbars] [data-slot="primary"] .seat-bar__caption')].map((e) => e.textContent),
  houseDem: document.querySelector('[data-hbars] [data-chamber="house"] [data-slot="primary"] [data-num="dem"]').textContent,
  flipsYear: document.querySelector('[data-fl-year]').textContent,
  flipsStates: [...document.querySelectorAll('[data-fl-table] .fl__state')].map((e) => e.dataset.state),
  pressed: [...document.querySelectorAll('[data-cbar] [aria-pressed="true"]')].map((e) => e.dataset.value),
})`);

test('the default view is the latest year with results', async () => {
  await page.goto(srv.url);
  const s = await read();
  assert.equal(s.url, '');
  assert.equal(s.mapTitle, 'Senate 2024');
  assert.deepEqual(s.pressed, ['senate', '2024']);
  assert.equal(s.flipsYear, '2024');
  assert.deepEqual(page.errors, []);
});

test('changing the year updates the map, the seat bars and the flips table together', async () => {
  await page.goto(srv.url);
  await page.click('[data-cbar] [data-segmented="year"] [data-value="2018"]');
  const s = await read();
  assert.equal(s.url, '?year=2018&chamber=senate');
  assert.equal(s.mapTitle, 'Senate 2018');
  assert.deepEqual(s.barCaptions, ['116th Congress, elected 2018', '116th Congress, elected 2018']);
  assert.equal(s.houseDem, '235');
  assert.equal(s.flipsYear, '2018');
  assert.deepEqual(s.flipsStates, ['AZ', 'FL', 'IN', 'MO', 'NV', 'ND']);
  assert.deepEqual(page.errors, []);
});

test('a chart can set the year too, and the URL survives a reload', async () => {
  await page.goto(srv.url);
  await page.click('[data-fl] .fl__cycle[data-year="2014"]');
  let s = await read();
  assert.equal(s.mapTitle, 'Senate 2014');
  assert.deepEqual(s.pressed, ['senate', '2014']);
  await page.goto(srv.url + s.url);
  s = await read();
  assert.equal(s.mapTitle, 'Senate 2014');
  assert.equal(s.barCaptions[0], '114th Congress, elected 2014');
  assert.deepEqual(page.errors, []);
});

test('a state from the flips table opens its record; Esc closes it', async () => {
  await page.goto(srv.url + '?year=2020');
  await page.click('[data-fl] .fl__state[data-state="GA"]');
  assert.match(await read().then((s) => s.url), /state=GA/);
  const panel = await page.eval<string>(`document.querySelector('[data-panel]').textContent`);
  assert.match(panel, /Georgia/);
  assert.match(panel, /Senate races since 2000/);
  await page.key('Escape');
  assert.doesNotMatch((await read()).url, /state=/);
  assert.deepEqual(page.errors, []);
});

test('invalid URL values fall back to the defaults', async () => {
  await page.goto(srv.url + '?year=1999&chamber=parliament&state=XX&compare=2024');
  const s = await read();
  assert.equal(s.url, '?year=2024&chamber=senate');
  assert.equal(s.mapTitle, 'Senate 2024');
});
