// End-to-end checks for the five pages: the masthead, the year carried
// between pages, the compact year bar, the governor card, the Senate page and
// the independents table. Needs Google Chrome (see browser.ts).
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

const PAGES = [
  { path: '', label: 'US Congress' },
  { path: 'governors/', label: 'Governors' },
  { path: 'senate/', label: 'Senate' },
  { path: 'story/', label: 'Story' },
  { path: 'sources/', label: 'Notes and sources' },
];

test('every page loads without errors, has its own title, and marks itself in the masthead', async () => {
  const titles = new Set<string>();
  for (const p of PAGES) {
    await page.goto(srv.url + p.path);
    const r = await page.eval<{ title: string; desc: string; current: string[]; links: string[] }>(`({
      title: document.title,
      desc: document.querySelector('meta[name=description]').content,
      current: [...document.querySelectorAll('.masthead__nav [aria-current="page"]')].map((a) => a.textContent),
      links: [...document.querySelectorAll('.masthead__nav a')].map((a) => a.textContent),
    })`);
    assert.deepEqual(r.current, [p.label], p.path);
    assert.deepEqual(r.links, PAGES.map((x) => x.label));
    assert.ok(r.desc.length > 20);
    titles.add(r.title);
    assert.deepEqual(page.errors, [], p.path);
  }
  assert.equal(titles.size, PAGES.length, 'each page has a different title');
});

test('the year and chamber travel with the nav links, and each page reads them', async () => {
  await page.goto(srv.url + '?year=2012&chamber=senate');
  await page.click('.rw__st[data-year="2008"]');
  const href = await page.eval<string>(`document.querySelector('.masthead__nav a[href*="governors"]').getAttribute('href')`);
  assert.match(href, /governors\/\?year=2008&chamber=senate/);
  await page.click('.masthead__nav a[href*="governors"]');
  await page.settle(600);
  assert.equal(await page.eval(`document.querySelector('.rw__st[aria-checked="true"]').dataset.year`), '2008');
  assert.match(await page.eval<string>(`document.querySelector('[data-gov-finding]').textContent`), /2008 elections/);
  await page.goto(srv.url + 'senate/?year=2016');
  assert.equal(await page.eval(`document.querySelector('.rw__st[aria-checked="true"]').dataset.year`), '2016');
  assert.equal(await page.eval(`document.querySelector('[data-fl-year]').textContent`), '2016');
  assert.deepEqual(page.errors, []);
});

/** Scroll so the full railway's bottom edge is `edge` px from the top of the window. */
const scrollRailwayTo = (edge: number) => page.eval(`(() => {
  const r = document.querySelector('[data-year-control]').getBoundingClientRect();
  scrollTo(0, scrollY + r.bottom - ${edge});
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(true))));
})()`);
const barState = () => page.eval<{ bar: boolean; rwTop: number; rwBottom: number; focusable: number }>(`(() => {
  const bar = document.querySelector('[data-ybar]');
  const r = document.querySelector('[data-year-control]').getBoundingClientRect();
  return {
    bar: !bar.hidden && getComputedStyle(bar).display !== 'none',
    rwTop: r.top, rwBottom: r.bottom,
    focusable: [...bar.querySelectorAll('button')].filter((b) => b.offsetParent !== null).length,
  };
})()`);

test('the compact year bar and the full railway are never on screen together', async () => {
  await page.goto(srv.url);
  assert.equal((await barState()).bar, false, 'at the top only the full railway shows');
  // Exactly where the switch happens: 2px of the railway still in view, then none.
  await scrollRailwayTo(2);
  await page.settle(150);
  let s = await barState();
  assert.equal(s.bar, false, `railway bottom at ${s.rwBottom}px: still visible, so no bar`);
  await scrollRailwayTo(-1);
  await page.settle(150);
  s = await barState();
  assert.equal(s.bar, true, `railway bottom at ${s.rwBottom}px: gone, so the bar shows`);
  assert.equal(s.focusable, 2, 'the bar buttons are focusable only while it shows');
  // Down the page and back: never both.
  for (const y of [400, 900, 1600, 2400, 800, 300, 0]) {
    await page.eval(`scrollTo(0, ${y}); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    await page.settle(120);
    const t = await barState();
    const railwayOnScreen = t.rwBottom > 0 && t.rwTop < 900;
    assert.equal(t.bar && railwayOnScreen, false, `scroll ${y}: both showing`);
    assert.equal(t.bar || railwayOnScreen, true, `scroll ${y}: neither showing`);
  }
  await page.eval('scrollTo(0, 0)');
});

test('the compact bar changes the year: buttons, the mini railway, and the URL follows', async () => {
  await page.goto(srv.url + '?year=2018&chamber=senate');
  await scrollRailwayTo(-200);
  await page.settle(150);
  assert.equal((await barState()).bar, true);
  assert.equal(await page.eval(`document.querySelector('[data-ybar-year]').textContent`), '2018');
  await page.click('[data-ybar] [data-ystep="1"]');
  assert.equal(await page.eval(`document.querySelector('[data-ybar-year]').textContent`), '2020');
  assert.match(await page.eval<string>('location.search'), /year=2020/);
  await page.click('[data-ybar] [data-ystep="-1"]');
  assert.equal(await page.eval(`document.querySelector('[data-ybar-year]').textContent`), '2018');
  // Click a mini station.
  const pt = await page.eval<{ x: number; y: number }>(`(() => {
    const r = document.querySelector('[data-ybar] .ybar__st[data-year="2008"]').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  }
  await page.settle();
  assert.equal(await page.eval(`document.querySelector('[data-ybar-year]').textContent`), '2008');
  assert.equal(await page.eval(`document.querySelector('[data-ybar] .ybar__st[data-selected]').dataset.year`), '2008');
  assert.deepEqual(page.errors, []);
});

test('on a phone the bar is a stepper with no mini railway', async () => {
  await page.viewport(390, 800, 1);
  await page.goto(srv.url);
  await page.eval(`scrollTo(0, 1500); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  await page.settle(150);
  const r = await page.eval<{ bar: boolean; rail: string; h: number }>(`(() => {
    const bar = document.querySelector('[data-ybar]');
    return { bar: !bar.hidden, rail: getComputedStyle(bar.querySelector('[data-ybar-rail]')).display, h: bar.getBoundingClientRect().height };
  })()`);
  assert.deepEqual({ bar: r.bar, rail: r.rail }, { bar: true, rail: 'none' });
  assert.ok(Math.abs(r.h - 49) <= 1, `bar is about 48px tall (${r.h})`);
  await page.viewport(1440, 900);
});

test('governors: the card shows the count first, then a state from the list, then follows the year', async () => {
  await page.goto(srv.url + 'governors/?year=2024');
  assert.match(await page.eval<string>(`document.querySelector('[data-gcard]').textContent`), /27 Republicans, 23 Democrats[\s\S]*Select a state for its governor\./);
  await page.click('.gov__pick[data-st="MN"]');
  const card = await page.eval<{ text: string; shape: number; link: string }>(`({
    text: document.querySelector('[data-gcard]').textContent,
    shape: document.querySelector('[data-gcard] .gcard__shape svg').getBoundingClientRect().width,
    link: document.querySelector('[data-gcard] .gcard__src a').href,
  })`);
  assert.match(card.text, /Minnesota/);
  assert.match(card.text, /Tim Walz/);
  assert.match(card.text, /Democratic-Farmer-Labor/);
  assert.match(card.text, /In office since 7 January 2019/);
  assert.match(card.text, /Previous governor: Mark Dayton/);
  assert.match(card.text, /Source: Wikipedia list of governors of Minnesota/);
  assert.equal(card.shape, 64);
  assert.match(card.link, /wikipedia\.org/);
  // The card keeps the state when the year changes.
  await page.click('.rw__st[data-year="2010"]');
  assert.match(await page.eval<string>(`document.querySelector('[data-gcard]').textContent`), /Mark Dayton|Tim Pawlenty/);
  // A click on the map selects too; no state path takes a tab stop.
  await page.click('.gov__state[data-st="TX"]');
  assert.match(await page.eval<string>(`document.querySelector('[data-gcard]').textContent`), /Texas/);
  assert.equal(await page.eval(`document.querySelectorAll('.gov__state[tabindex]').length`), 0);
  assert.deepEqual(page.errors, []);
});

test('governors: the card sits beside the map from 1024px and under it below', async () => {
  const pos = () => page.eval<{ sameRow: boolean }>(`(() => {
    const m = document.querySelector('.gov__svg').getBoundingClientRect();
    const c = document.querySelector('[data-gcard]').getBoundingClientRect();
    return { sameRow: c.left >= m.right - 1 && c.top < m.bottom };
  })()`);
  await page.viewport(1440, 900);
  await page.goto(srv.url + 'governors/');
  assert.equal((await pos()).sameRow, true);
  await page.viewport(800, 900);
  await page.goto(srv.url + 'governors/');
  assert.equal((await pos()).sameRow, false);
  await page.viewport(1440, 900);
});

test('the Senate page: flips table state names carry outlines and link to the map', async () => {
  await page.goto(srv.url + 'senate/?year=2018');
  const r = await page.eval<{ shapes: number; href: string; hidden: boolean }>(`(() => {
    const a = document.querySelector('[data-fl-table] a.fl__state');
    return { shapes: document.querySelectorAll('[data-fl-table] svg.stshape').length, href: a.getAttribute('href'), hidden: document.querySelector('[data-fl-table] svg.stshape').getAttribute('aria-hidden') === 'true' };
  })()`);
  assert.ok(r.shapes >= 1);
  assert.equal(r.hidden, true);
  assert.match(r.href, /\?year=2018&chamber=senate&state=[A-Z]{2}$/);
});

test('the independents table: one row per race, bioguide links, flip rows tinted', async () => {
  await page.goto(srv.url + 'senate/');
  const t = await page.eval<{ rows: number; flips: number; links: string[]; squares: number; sq: number }>(`(() => {
    const rows = [...document.querySelectorAll('.ind__row')];
    return {
      rows: rows.length,
      flips: rows.filter((r) => r.dataset.tint).length,
      links: [...document.querySelectorAll('.ind__name[href]')].map((a) => a.href),
      squares: document.querySelectorAll('.ind__square svg').length,
      sq: document.querySelector('.ind__square').getBoundingClientRect().width,
    };
  })()`);
  assert.equal(t.rows, 8);
  assert.equal(t.flips, 3, 'ME 2012, WV 2024 and PA 2010 count as flips');
  assert.equal(t.squares, 8);
  assert.equal(t.sq, 32);
  assert.ok(t.links.length >= 8 && t.links.every((l) => l.startsWith('https://bioguide.congress.gov/search/bio/')));
  // Phones: a block per race and no sideways scroll.
  await page.viewport(360, 800);
  await page.goto(srv.url + 'senate/');
  const m = await page.eval<{ w: number; sw: number; display: string }>(`({ w: innerWidth, sw: document.documentElement.scrollWidth, display: getComputedStyle(document.querySelector('.ind__row')).display })`);
  assert.equal(m.display, 'grid');
  assert.ok(m.sw <= m.w, 'no horizontal scroll');
  await page.viewport(1440, 900);
});

test('no page scrolls sideways at 360px', async () => {
  await page.viewport(360, 800);
  for (const p of PAGES) {
    await page.goto(srv.url + p.path);
    const m = await page.eval<{ w: number; sw: number }>(`({ w: innerWidth, sw: document.documentElement.scrollWidth })`);
    assert.ok(m.sw <= m.w, `${p.path || '/'}: scrollWidth ${m.sw} > ${m.w}`);
  }
  await page.viewport(1440, 900);
});

test('JavaScript off: each page draws its default view', async () => {
  await page.send('Emulation.setScriptExecutionDisabled', { value: true });
  try {
    for (const p of PAGES) {
      await page.send('Page.navigate', { url: srv.url + p.path });
      await page.settle(800);
      const r = await page.eval<{ h1: string; main: number }>(`({ h1: document.querySelector('h1').textContent, main: document.querySelector('main').getBoundingClientRect().height })`);
      assert.ok(r.h1.length > 3 && r.main > 300, `${p.path || '/'} renders`);
    }
    await page.send('Page.navigate', { url: srv.url + 'governors/' });
    await page.settle(800);
    assert.match(await page.eval<string>(`document.querySelector('[data-gov-finding]').textContent`), /governorships after the 2024 elections/);
    assert.equal(await page.eval(`document.querySelectorAll('.gov__table tbody tr').length`), 50);
  } finally {
    await page.send('Emulation.setScriptExecutionDisabled', { value: false });
  }
});
