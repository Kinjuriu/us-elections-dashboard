// A small headless-Chrome driver for the end-to-end check and the review
// screenshots. No packages: it serves dist/ with node:http, starts the
// installed Chrome with a debugging port and talks to it over the DevTools
// protocol with Node's built-in WebSocket.
//
// Chrome is looked for at the usual macOS path; set CHROME_PATH to override.
import { createServer, type Server } from 'node:http';
import { readFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';

const DIST = resolve(import.meta.dirname, '../../dist');
const BASE = '/us-elections-dashboard/';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
};

/** Serve dist/ under the GitHub Pages base path. */
export async function serve(): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (!path.startsWith(BASE)) { res.writeHead(404).end(); return; }
    let file = join(DIST, path.slice(BASE.length));
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };
  return { url: `http://127.0.0.1:${port}${BASE}`, close: () => new Promise((r) => server.close(() => r())) };
}

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

export class Page {
  private id = 0;
  private pending = new Map<number, Pending>();
  private listeners = new Map<string, ((p: any) => void)[]>();
  readonly errors: string[] = [];

  private ws: WebSocket;
  private sessionId: string;

  constructor(ws: WebSocket, sessionId: string) {
    this.ws = ws;
    this.sessionId = sessionId;
  }

  /** Route one message from the browser socket to this page. */
  handle(msg: any) {
    if (msg.sessionId !== this.sessionId) return;
    if (msg.id !== undefined) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    } else if (msg.method) {
      for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
    }
  }

  send<T = any>(method: string, params: object = {}): Promise<T> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId: this.sessionId }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject }));
  }

  on(method: string, fn: (p: any) => void) {
    this.listeners.set(method, [...(this.listeners.get(method) ?? []), fn]);
  }

  once(method: string): Promise<any> {
    return new Promise((r) => {
      const fn = (p: any) => {
        this.listeners.set(method, (this.listeners.get(method) ?? []).filter((f) => f !== fn));
        r(p);
      };
      this.on(method, fn);
    });
  }

  async viewport(width: number, height: number, scale = 1) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < 640 });
  }

  async goto(url: string) {
    const loaded = this.once('Page.loadEventFired');
    await this.send('Page.navigate', { url });
    await loaded;
    // Web fonts, then a frame for layout.
    await this.eval('document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => r(true))))');
  }

  /** Evaluate an expression in the page and return its value. */
  async eval<T = any>(expression: string): Promise<T> {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.text}: ${r.exceptionDetails.exception?.description ?? expression}`);
    return r.result.value as T;
  }

  /** Click the centre of the first element matching a selector, as a mouse would. */
  async click(selector: string) {
    const box = await this.eval<{ x: number; y: number } | null>(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    if (!box) throw new Error(`No element for ${selector}`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
    }
    await this.settle();
  }

  async key(key: string, code = key) {
    for (const type of ['keyDown', 'keyUp']) {
      await this.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: key === 'Escape' ? 27 : key === 'Enter' ? 13 : 0 });
    }
    await this.settle();
  }

  /** Wait for data transitions (200ms) to finish. */
  settle(ms = 300) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** PNG of the whole page, or of a clip in page coordinates. */
  async screenshot(clip?: { x: number; y: number; width: number; height: number }): Promise<Buffer> {
    const r = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
    });
    return Buffer.from(r.data, 'base64');
  }
}

export interface Browser {
  page(): Promise<Page>;
  close(): Promise<void>;
}

/** `headed: true` opens a real, visible window (for reproducing things headless Chrome does not). */
export async function launch(opts: { headed?: boolean; args?: string[] } = {}): Promise<Browser> {
  const profile = await mkdtemp(join(tmpdir(), 'cdp-'));
  const proc: ChildProcess = spawn(CHROME, [
    ...(opts.headed ? [] : ['--headless=new']), ...(opts.args ?? []), '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await new Promise<string>((resolveUrl, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chrome did not start')), 15000);
    proc.stderr!.on('data', (d: Buffer) => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(t); resolveUrl(m[1]); }
    });
    proc.on('error', reject);
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const pages: Page[] = [];
  let id = 0;
  const pending = new Map<number, (v: any) => void>();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.sessionId) { for (const p of pages) p.handle(msg); return; }
    if (msg.id !== undefined) pending.get(msg.id)?.(msg.result);
  };
  const browserSend = (method: string, params: object = {}) => {
    const i = ++id;
    ws.send(JSON.stringify({ id: i, method, params }));
    return new Promise<any>((r) => pending.set(i, r));
  };

  return {
    async page() {
      const { targetId } = await browserSend('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await browserSend('Target.attachToTarget', { targetId, flatten: true });
      const page = new Page(ws, sessionId);
      pages.push(page);
      await page.send('Page.enable');
      await page.send('Runtime.enable');
      page.on('Runtime.exceptionThrown', (p) => page.errors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
      page.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') page.errors.push(p.args.map((a: any) => a.value ?? a.description).join(' ')); });
      return page;
    },
    async close() {
      ws.close();
      proc.kill();
      await new Promise((r) => proc.once('exit', r));
      // Chrome's helpers can still be writing for a moment after exit.
      await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
    },
  };
}
