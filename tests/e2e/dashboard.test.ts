// End-to-end check: changing the year in the control strip updates the map,
// the summary band, the side panel and the flips table together, and the URL follows.
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
  url: string; mapTitle: string; finding: string; bandLabels: string[]; houseDem: string; panelTitle: string | null;
  flipsYear: string; flipsStates: string[]; chamber: string; stripYear: string;
}>(`({
  url: location.search,
  mapTitle: document.querySelector('.cmap [data-title]').textContent,
  finding: document.querySelector('[data-finding]').textContent,
  bandLabels: [document.querySelector('[data-hemi]').getAttribute('aria-label')],
  houseDem: document.querySelector('[data-block="dem"] .block__n').firstChild.textContent,
  panelTitle: document.querySelector('[data-panel] .cmn__title')?.textContent ?? null,
  flipsYear: document.querySelector('[data-fl-year]').textContent,
  flipsStates: [...document.querySelectorAll('[data-fl-table] .fl__state')].map((e) => e.dataset.state),
  chamber: document.querySelector('[data-cbar] [data-segmented="chamber"] [aria-pressed="true"]').dataset.value,
  stripYear: document.querySelector('[data-cbar] .rw__st[aria-checked="true"]').dataset.year,
})`);

test('the default view is the latest year with results', async () => {
  await page.goto(srv.url);
  const s = await read();
  assert.equal(s.url, '');
  assert.equal(s.mapTitle, 'Senate 2024');
  assert.equal(s.chamber, 'senate');
  assert.equal(s.stripYear, '2024');
  assert.equal(s.panelTitle, 'Senate 2024');
  assert.equal(s.flipsYear, '2024');
  assert.deepEqual(page.errors, []);
});

test('the map is in the first screen at 1280 and 1440 wide', async () => {
  for (const w of [1280, 1440]) {
    await page.viewport(w, 900);
    await page.goto(srv.url);
    const top = await page.eval<number>(`document.querySelector('.cmap__map').getBoundingClientRect().top`);
    assert.ok(top < 900, `map top is at ${top}px at ${w} wide`);
  }
  await page.viewport(1440, 900);
});

test('changing the year updates the map, the band, the panel and the flips table together', async () => {
  await page.goto(srv.url);
  const before = await read();
  await page.click('[data-cbar] .rw__st[data-year="2018"]');
  const s = await read();
  assert.equal(s.url, '?year=2018&chamber=senate');
  assert.equal(s.mapTitle, 'Senate 2018');
  assert.notEqual(s.finding, before.finding);
  assert.equal(s.panelTitle, 'Senate 2018');
  assert.notEqual(s.panelTitle, before.panelTitle);
  assert.match(s.bandLabels[0], /116th Congress, elected 2018/);
  assert.equal(s.houseDem, '235');
  assert.equal(s.flipsYear, '2018');
  assert.deepEqual(s.flipsStates, ['AZ', 'FL', 'IN', 'MO', 'NV', 'ND']);
  assert.deepEqual(page.errors, []);
});

test('comparing two years writes the change and lists the states that changed', async () => {
  await page.goto(srv.url + '?year=2022&chamber=senate&compare=2018');
  const t = await page.eval<{ change: string; panel: string }>(`({
    change: document.querySelector('[data-card="senate"] .hemi__chg').textContent,
    panel: document.querySelector('[data-panel]').textContent,
  })`);
  assert.match(t.change, /since 2018/);
  assert.match(t.panel, /Changed between 2018 and 2022/);
  assert.deepEqual(page.errors, []);
});

test('a chart can set the year too, and the URL survives a reload', async () => {
  await page.goto(srv.url);
  await page.click('[data-fl] .fl__cycle[data-year="2014"]');
  let s = await read();
  assert.equal(s.mapTitle, 'Senate 2014');
  assert.equal(s.stripYear, '2014');
  await page.goto(srv.url + s.url);
  s = await read();
  assert.equal(s.mapTitle, 'Senate 2014');
  assert.match(s.bandLabels[0], /114th Congress, elected 2014/);
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
  const after = await read();
  assert.doesNotMatch(after.url, /state=/);
  assert.equal(after.panelTitle, 'Senate 2020');
  assert.deepEqual(page.errors, []);
});

test('invalid URL values fall back to the defaults', async () => {
  await page.goto(srv.url + '?year=1999&chamber=parliament&state=XX&compare=2024');
  const s = await read();
  assert.equal(s.url, '?year=2024&chamber=senate');
  assert.equal(s.mapTitle, 'Senate 2024');
});

test('the railway: click, arrow keys and drag all pick a year, and 2026 is dashed', async () => {
  await page.goto(srv.url);
  const year = () => page.eval<string>(`document.querySelector('.rw__st[aria-checked="true"]').dataset.year`);
  await page.click('.rw__st[data-year="2010"]');
  assert.equal(await year(), '2010');
  await page.key('ArrowRight', 'ArrowRight');
  assert.equal(await year(), '2012');
  await page.key('Home', 'Home');
  assert.equal(await year(), '2000');
  // Drag from the 2000 station to the one for 2018.
  const pts = await page.eval<{ a: number; b: number; y: number }>(`(() => {
    const r = (y) => document.querySelector('.rw__st[data-year="' + y + '"]').getBoundingClientRect();
    return { a: r(2000).left + r(2000).width / 2, b: r(2018).left + r(2018).width / 2, y: r(2000).top + r(2000).height / 2 };
  })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pts.a, y: pts.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: (pts.a + pts.b) / 2, y: pts.y, button: 'left' });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pts.b + 3, y: pts.y, button: 'left' });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pts.b + 3, y: pts.y, button: 'left', clickCount: 1 });
  await page.settle();
  assert.equal(await year(), '2018');
  assert.equal(await page.eval(`document.querySelector('.rw__st[data-year="2026"]').classList.contains('rw__st--prov')`), true);
  assert.deepEqual(page.errors, []);
});

test('2026 has no results: the finding says so and the cards show 2024', async () => {
  await page.goto(srv.url + '?year=2026');
  const s = await read();
  assert.equal(s.finding, '2026 results are not yet entered; showing the Congress elected in 2024');
  assert.match(s.bandLabels[0], /elected 2024/);
});

test('picking a party outlines it and changes the centre number', async () => {
  await page.goto(srv.url);
  await page.click('.chip[data-party="dem"]');
  const t = await page.eval<{ party: string; big: string }>(`({ party: document.querySelector('[data-cards]').dataset.party, big: document.querySelector('[data-big]').textContent })`);
  assert.deepEqual(t, { party: 'dem', big: '45' });
});
