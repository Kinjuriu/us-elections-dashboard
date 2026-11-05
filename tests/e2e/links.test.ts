// Every internal link, script, stylesheet and image in dist/ must resolve to a
// file that exists, and every #fragment must match an id on the target page.
// Needs a build first (`npm run test:e2e` does that). No browser needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';

const DIST = resolve(import.meta.dirname, '../../dist');
const BASE = '/us-elections-dashboard/';

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const exists = (p: string) => stat(p).then((s) => s.isFile(), () => false);

async function target(path: string): Promise<string | null> {
  const rel = path.slice(BASE.length);
  for (const c of [join(DIST, rel), join(DIST, rel, 'index.html'), join(DIST, rel + '.html')]) {
    if (await exists(c)) return c;
  }
  return null;
}

test('every internal link in dist/ resolves', async () => {
  const files = await htmlFiles(DIST);
  assert.ok(files.length >= 5, 'the five pages are built');
  const ids = new Map<string, Set<string>>();
  const idsOf = async (file: string) => {
    if (!ids.has(file)) {
      const html = await readFile(file, 'utf8');
      ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    }
    return ids.get(file)!;
  };
  const broken: string[] = [];
  let checked = 0;
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const here = BASE + file.slice(DIST.length + 1).replace(/index\.html$/, '');
    for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      const raw = m[1].replace(/&amp;/g, '&');
      if (!raw || /^(https?:|mailto:|tel:|data:|javascript:)/.test(raw)) continue;
      const url = new URL(raw, 'http://x' + here);
      checked++;
      const found = await target(decodeURIComponent(url.pathname));
      if (!found || !url.pathname.startsWith(BASE)) { broken.push(`${here} -> ${raw}`); continue; }
      if (url.hash.length > 1 && found.endsWith('.html') && !(await idsOf(found)).has(url.hash.slice(1))) {
        broken.push(`${here} -> ${raw} (no #${url.hash.slice(1)})`);
      }
    }
  }
  assert.ok(checked > 40, `checked ${checked} links`);
  assert.deepEqual(broken, []);
  void dirname;
});
