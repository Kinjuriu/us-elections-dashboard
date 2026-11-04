// Saves the step 05 review screenshots into review/. Build first, then:
//   node tests/e2e/screenshots.ts
// Phones are captured at 2x, desktops at 1x.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { serve, launch } from './browser.ts';

const OUT = resolve(import.meta.dirname, '../../review');

/** What to capture: a query string and the part of the page, from one element's top to another's bottom. */
const SHOTS: { name: string; q: string; from: string; to: string }[] = [
  { name: 'default', q: '', from: 'body', to: '.board' },
  { name: 'house', q: '?year=2022&chamber=house', from: 'body', to: '.board' },
  { name: 'georgia', q: '?year=2020&chamber=senate&state=GA', from: 'body', to: '.board' },
  { name: 'compare-2018-2022', q: '?year=2022&chamber=senate&compare=2018', from: 'body', to: '.board' },
  { name: '2026', q: '?year=2026&chamber=senate', from: 'body', to: '.board' },
  { name: 'charts', q: '?year=2018&chamber=senate', from: '.charts', to: '.charts' },
];

const srv = await serve();
const browser = await launch();
const page = await browser.page();
try {
  for (const [w, scale] of [[375, 2], [1440, 1]] as const) {
    await page.viewport(w, 900, scale);
    for (const s of SHOTS) {
      await page.goto(srv.url + s.q);
      await page.settle(300);
      // The Georgia view scrolls to its panel; capture from the top so the sticky controls stay in place.
      await page.eval('scrollTo(0, 0)');
      await page.settle(300);
      const clip = await page.eval<{ x: number; y: number; width: number; height: number }>(`(() => {
        const a = document.querySelector(${JSON.stringify(s.from)}).getBoundingClientRect();
        const b = document.querySelector(${JSON.stringify(s.to)}).getBoundingClientRect();
        const top = Math.max(0, a.top + scrollY - (${JSON.stringify(s.from)} === 'body' ? 0 : 24));
        return { x: 0, y: top, width: ${w}, height: b.bottom + scrollY + 24 - top };
      })()`);
      const file = `${OUT}/05-${s.name}-${w}.png`;
      await writeFile(file, await page.screenshot(clip));
      console.log(file);
    }
  }
  if (page.errors.length) console.error('Console errors:', page.errors);
} finally {
  await browser.close();
  await srv.close();
}
