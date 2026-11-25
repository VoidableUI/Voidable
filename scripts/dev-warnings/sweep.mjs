#!/usr/bin/env node
// Load every Storybook story and every page of the built docs site in headless
// Chromium with the `@voidable/ui/dev` entry running, collect what it warns
// about and fail on any warning: each is a real mistake in the repo or a false
// positive in the detector, and both get fixed. Needs a Chromium: set
// CHROMIUM_PATH (default /usr/bin/chromium). Run through `mise run
// warnings:sweep`, which builds Storybook and the docs first.
//
//   node scripts/dev-warnings/sweep.mjs [--only storybook|docs] [--filter text]
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const only = flag('--only');
const filter = flag('--filter');
const concurrency = Number(process.env.SWEEP_CONCURRENCY ?? 6);
// Extra wait after the dev entry reports the page settled.
const SETTLE_MS = Number(process.env.SWEEP_SETTLE_MS ?? 100);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain',
  '.ico': 'image/x-icon', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};

/** Serve `dir` over HTTP; `/__voidable/dev.js` is the built dev entry. */
function serve(dir) {
  const devEntry = resolve(root, 'packages/ui/dist');
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let path = decodeURIComponent(url.pathname);
    let file;
    if (path.startsWith('/__voidable/')) file = join(devEntry, path.slice('/__voidable/'.length));
    else {
      file = join(dir, path);
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
      else if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
    }
    if (!file.startsWith(dir) && !file.startsWith(devEntry) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Warnings found per message: message -> Set of page names. */
const found = new Map();
let pagesChecked = 0;

async function visit(browser, url, name) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const here = [];
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'warning' && text.startsWith('[voidable]')) here.push(text);
  });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    // The same entry an app imports in development. A copy bundled into the page
    // (Storybook) is already running; the guard makes this a no-op then.
    await page.addScriptTag({ type: 'module', content: "import '/__voidable/dev.js';" }).catch(() => {});
    // Wait for the dev entry's own notion of "settled" (nothing loading or defining for a while).
    await page.waitForFunction(() => globalThis[Symbol.for('voidable.dev')], undefined, { timeout: 10000 });
    await page.evaluate(() => globalThis[Symbol.for('voidable.dev')].settled());
    await page.waitForTimeout(SETTLE_MS);
  } catch (error) {
    here.push(`[sweep] could not load ${name}: ${String(error).split('\n')[0]}`);
  }
  await context.close();
  pagesChecked++;
  for (const text of here) {
    if (!found.has(text)) found.set(text, new Set());
    found.get(text).add(name);
  }
}

async function pool(items, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

const executablePath = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
if (!existsSync(executablePath)) {
  console.error(`sweep: no Chromium at ${executablePath}; set CHROMIUM_PATH`);
  process.exit(2);
}
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const servers = [];

try {
  if (only !== 'docs') {
    const dir = resolve(root, 'storybook-static');
    if (!existsSync(dir)) throw new Error('storybook-static is missing: run `mise run build` first');
    const { server, origin } = await serve(dir);
    servers.push(server);
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
    const stories = Object.values(index.entries).filter((e) => e.type === 'story' && (!filter || e.id.includes(filter)));
    console.log(`storybook: ${stories.length} stories`);
    await pool(stories, (s) => visit(browser, `${origin}/iframe.html?id=${encodeURIComponent(s.id)}&viewMode=story`, `story ${s.id}`));
  }
  if (only !== 'storybook') {
    const dir = resolve(root, 'docs/dist');
    if (!existsSync(dir)) throw new Error('docs/dist is missing: run `mise run docs_build` first');
    const { server, origin } = await serve(dir);
    servers.push(server);
    const pages = htmlFiles(dir)
      .map((f) => `/${relative(dir, f).split(sep).join('/')}`)
      .filter((p) => !filter || p.includes(filter));
    console.log(`docs: ${pages.length} pages`);
    await pool(pages, (p) => visit(browser, `${origin}${p}`, `docs ${p}`));
  }
} finally {
  await browser.close();
  for (const s of servers) s.close();
}

console.log(`checked ${pagesChecked} pages`);
if (found.size === 0) {
  console.log('no warnings');
} else {
  console.error(`\n${found.size} distinct warning(s):\n`);
  for (const [text, pages] of found) {
    const names = [...pages];
    console.error(`${text}\n    on ${names.slice(0, 4).join(', ')}${names.length > 4 ? ` and ${names.length - 4} more` : ''}\n`);
  }
  process.exit(1);
}
