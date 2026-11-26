// Screenshots of the built docs site (host only): node scripts/tmp/docshots.mjs
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const dist = resolve('docs/dist');
const out = resolve('tmp/docshots');
mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(dist, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  else if (!existsSync(f) && existsSync(f + '.html')) f += '.html';
  if (!f.startsWith(dist) || !existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const pages = {
  home: '/',
  start: '/getting-started/installation/',
  overview: '/components/overview/',
  dialog: '/components/dialog/',
  input: '/components/input/',
  chart: '/components/bar-chart/',
  builder: '/theme/',
  upgrading: '/guides/upgrading/',
};
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(pages);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
for (const name of only) {
  for (const width of [1440, 390]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, colorScheme: scheme, reducedMotion: 'reduce' });
      await ctx.addInitScript((s) => { try { localStorage.setItem('starlight-theme', s); } catch {} }, scheme);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(origin + pages[name], { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => {
        const undef = [...document.querySelectorAll('*')].filter((e) => e.localName.startsWith('void-') && !customElements.get(e.localName));
        const tags = new Set(undef.map((e) => e.localName));
        return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, undefinedTags: [...tags].slice(0, 12) };
      });
      console.log(`${name} ${width} ${scheme}: overflow=${m.scrollW > m.clientW ? m.scrollW + '>' + m.clientW : 'no'} undefined=${m.undefinedTags.join(',') || '-'} errors=${errors.length}`);
      await page.screenshot({ path: join(out, `${name}-${width}-${scheme}.png`), fullPage: true });
      await ctx.close();
    }
  }
}
await browser.close();
server.close();
