// Saves the step 09 review screenshots into review/09/. Build first, then:
//   node tests/e2e/screenshots.ts
// Every page at 390 (2x) and 1440 wide, plus the compact year bar showing,
// the comparison (2020 with 2024) and the women chart on the story page.
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { serve, launch } from './browser.ts';

const OUT = resolve(import.meta.dirname, '../../review/09');
await mkdir(OUT, { recursive: true });

const PAGES = [
  { name: 'congress', path: '' },
  { name: 'governors', path: 'governors/' },
  { name: 'governors-state', path: 'governors/?year=2018', pick: '.gov__pick[data-st="MN"]' },
  { name: 'senate', path: 'senate/?year=2018' },
  { name: 'story', path: 'story/' },
  { name: 'sources', path: 'sources/' },
];

const srv = await serve();
const browser = await launch();
const page = await browser.page();
try {
  for (const [w, scale] of [[390, 2], [1440, 1]] as const) {
    await page.viewport(w, 900, scale);
    for (const p of PAGES) {
      await page.goto(srv.url + p.path);
      if (p.pick) await page.click(p.pick);
      await page.eval('scrollTo(0, 0)');
      await page.settle(300);
      const h = await page.eval<number>('document.documentElement.scrollHeight');
      const file = `${OUT}/${p.name}-${w}.png`;
      await writeFile(file, await page.screenshot({ x: 0, y: 0, width: w, height: h }));
      console.log(file);
    }
    // The compact year bar, scrolled over the map and cards.
    await page.goto(srv.url + '?year=2018&chamber=senate');
    await page.eval(`(() => { const r = document.querySelector('[data-year-control]').getBoundingClientRect(); scrollTo(0, scrollY + r.bottom + 120); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
    await page.settle(300);
    const file = `${OUT}/year-bar-${w}.png`;
    // A viewport capture, not the whole page, so the fixed bar sits where it does on screen.
    const r = await page.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(file, Buffer.from(r.data, 'base64'));
    console.log(file);
    // Comparing 2020 with 2024: the whole board, then the women chart.
    await page.goto(srv.url + '?year=2020&chamber=senate&compare=2024');
    await page.settle(300);
    const clipOf = (sel: string) => page.eval<{ x: number; y: number; width: number; height: number }>(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX - 8), y: r.top + scrollY - 8, width: Math.min(${w}, r.width + 16), height: r.height + 16 }; })()`);
    await writeFile(`${OUT}/compare-senate-${w}.png`, await page.screenshot(await clipOf('.board')));
    await page.goto(srv.url + '?year=2020&chamber=house&compare=2024');
    await page.settle(300);
    await writeFile(`${OUT}/compare-house-${w}.png`, await page.screenshot(await clipOf('.board')));
    await page.goto(srv.url + 'story/');
    await page.settle(300);
    await writeFile(`${OUT}/women-${w}.png`, await page.screenshot(await clipOf('.story__women')));
    console.log('compare and women shots', w);
  }
} finally {
  await browser.close();
  await srv.close();
}
