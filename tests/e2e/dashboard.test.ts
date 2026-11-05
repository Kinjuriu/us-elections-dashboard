// End-to-end check of the Congress page: changing the year in the control strip
// updates the map, the cards and the side panel together, and the URL follows.
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
  chamber: string; stripYear: string;
}>(`({
  url: location.search,
  mapTitle: document.querySelector('.cmap [data-title]').textContent,
  finding: document.querySelector('[data-finding]').textContent,
  bandLabels: [document.querySelector('[data-hemi]').getAttribute('aria-label')],
  houseDem: document.querySelector('[data-block="dem"] .block__n').firstChild.textContent,
  panelTitle: document.querySelector('[data-panel] .cmn__title')?.textContent ?? null,
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

test('changing the year updates the map, the cards and the panel together', async () => {
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
  assert.deepEqual(page.errors, []);
});

/** What the page shows while comparing: the line, the cards, the map and the bar. */
const readCompare = () => page.eval<{
  url: string; finding: string; title: string; subtitle: string; legend: string[]; cardsCaption: string[];
  house: string[]; houseNotes: string[]; senateNotes: string[]; senateSvgs: number; mapGrey: number; mapStates: number;
  stop: boolean; ybar: string;
}>(`({
  url: location.search,
  finding: document.querySelector('[data-finding]').textContent,
  title: document.querySelector('.cmap [data-title]').textContent,
  subtitle: document.querySelector('.cmap [data-subtitle]').textContent,
  legend: [...document.querySelectorAll('.cmap__legend--senate li')].filter((l) => getComputedStyle(l).display !== 'none').map((l) => l.textContent.trim()),
  cardsCaption: [...document.querySelectorAll('.card__sub')].map((e) => e.textContent),
  house: [...document.querySelectorAll('[data-card="house"] .cmpbar')].map((b) => b.querySelector('.cmpbar__year').textContent + ':' + [...b.querySelectorAll('.block__n')].map((n) => n.textContent).join('/')),
  houseNotes: [...document.querySelectorAll('[data-card="house"] [data-cmp] .card__line')].map((e) => e.textContent),
  senateNotes: [...document.querySelectorAll('[data-card="senate"] [data-cmp] .card__line')].map((e) => e.textContent),
  senateSvgs: document.querySelectorAll('[data-card="senate"] .chemi svg').length,
  mapGrey: [...document.querySelector('[data-layout]').querySelectorAll('.cmap__state')].filter((e) => e.dataset.fill === 'no-race').length,
  mapStates: document.querySelector('[data-layout]').querySelectorAll('.cmap__state').length,
  stop: !document.querySelector('[data-stop]').hidden,
  ybar: document.querySelector('[data-ybar-year]').textContent,
})`);

for (const [order, q] of [['2020 on the railway, 2024 in the menu', '?year=2020&chamber=senate&compare=2024'],
                          ['2024 on the railway, 2020 in the menu', '?year=2024&chamber=senate&compare=2020']] as const) {
  test(`comparing 2020 with 2024 (${order}) shows the two years and the difference`, async () => {
    await page.goto(srv.url + q);
    const c = await readCompare();
    // The pair is always earlier first.
    assert.match(c.finding, /^2020 compared with 2024: /);
    assert.match(c.finding, /Republicans gained 2 Senate seats and 8 House seats/);
    assert.doesNotMatch(c.finding, /since/);
    assert.equal(c.title, 'Senate 2020 to 2024');
    assert.match(c.subtitle, /^\d+ seats changed caucus$/);
    assert.deepEqual(c.legend, [c.subtitle]);
    assert.deepEqual(c.cardsCaption, ['2020 compared with 2024', '2020 compared with 2024']);
    assert.deepEqual(c.house, ['2020:222/212', '2024:215/220']);
    assert.deepEqual(c.houseNotes, ['Democrats 222 to 215 (-7)', 'Republicans 212 to 220 (+8)']);
    assert.deepEqual(c.senateNotes, ['Democrats 46 to 45 (-1)', 'Republicans 51 to 53 (+2)']);
    assert.equal(c.senateSvgs, 2);
    assert.ok(c.stop);
    assert.equal(c.ybar, '2020 vs 2024');
    // The map: changed states outlined, every other state grey.
    const n = Number(c.subtitle.split(' ')[0]);
    assert.ok(n > 0);
    const changedStates = await page.eval<number>(`new Set([...document.querySelector('[data-layout]').querySelectorAll('.cmap__chg')].map((u) => u.getAttribute('href'))).size`);
    assert.ok(changedStates > 0 && changedStates <= n);
    assert.equal(c.mapGrey, c.mapStates - changedStates);
    assert.deepEqual(page.errors, []);
  });
}

test('the House map says how many delegations changed, and Esc or the button stops comparing', async () => {
  await page.goto(srv.url + '?year=2020&chamber=house&compare=2024');
  const c = await readCompare();
  assert.equal(c.title, 'House 2020 to 2024');
  assert.match(c.subtitle, /^\d+ delegations changed majority$/);
  const n = await page.eval<number>(`document.querySelectorAll('.cmap__squares g[data-cmp="changed"]').length / document.querySelectorAll('[data-layout]').length`);
  assert.equal(n, Number(c.subtitle.split(' ')[0]));
  await page.key('Escape');
  assert.equal((await readCompare()).url, '?year=2020&chamber=house');
  await page.goto(srv.url + '?year=2020&chamber=senate&compare=2024');
  await page.click('[data-stop]');
  const after = await readCompare();
  assert.equal(after.url, '?year=2020&chamber=senate');
  assert.equal(after.title, 'Senate 2020');
  assert.doesNotMatch(after.finding, /compared with/);
  assert.equal(after.stop, false);
  assert.deepEqual(page.errors, []);
});

test('the Senate card names the party in control, and gives opening day underneath', async () => {
  await page.goto(srv.url + '?year=2020&chamber=senate');
  const t = await page.eval<{ big: string; who: string; line: string; finding: string }>(`({
    big: document.querySelector('[data-card="senate"] [data-big]').textContent,
    who: document.querySelector('[data-card="senate"] [data-who]').textContent,
    line: document.querySelector('[data-card="senate"] [data-line]').textContent,
    finding: document.querySelector('[data-finding]').textContent,
  })`);
  assert.equal(t.big, '50');
  assert.equal(t.who, 'Democrats, with the vice president');
  assert.equal(t.line, 'On opening day: 51 Republicans, 46 Democrats, 2 independents, 1 vacant');
  assert.match(t.finding, /Democrats/);
});

test('a chart can set the year too, and the URL survives a reload', async () => {
  await page.goto(srv.url);
  await page.click('.cc__hit[data-year="2014"]');
  let s = await read();
  assert.equal(s.mapTitle, 'Senate 2014');
  assert.equal(s.stripYear, '2014');
  await page.goto(srv.url + s.url);
  s = await read();
  assert.equal(s.mapTitle, 'Senate 2014');
  assert.match(s.bandLabels[0], /114th Congress, elected 2014/);
  assert.deepEqual(page.errors, []);
});

test('keyboard: the map is one tab stop, arrows move between states, Enter opens, Esc closes', async () => {
  await page.goto(srv.url + '?year=2020');
  await page.eval(`document.querySelector('[data-kb]').focus()`);
  await page.key('ArrowRight', 'ArrowRight');
  const live = await page.eval<string>(`document.querySelector('[data-kb-live]').textContent`);
  assert.ok(live.length > 5, 'the live region names the state the arrows are on');
  await page.key('Enter', 'Enter');
  assert.match(await read().then((s) => s.url), /state=[A-Z]{2}/);
  assert.equal(await page.eval(`document.querySelectorAll('.cmap__state[tabindex], .cmap__state[role]').length`), 0);
  await page.key('Escape');
  assert.doesNotMatch(await read().then((s) => s.url), /state=/);
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
