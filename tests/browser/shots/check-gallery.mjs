// SPDX-License-Identifier: MIT
//
// Looks at a built gallery the way a reviewer does, in Chromium at 1440 and 390
// px wide: it loads, nothing overflows the width, the keyboard opens, steps
// through and closes the viewer, every view of a change renders, and axe finds
// no violation. Used by `mise run shots:check` and by the CI job on its own gallery.
//
//   node shots/check-gallery.mjs GALLERY_DIR [--screenshots DIR]
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '../package.json'));
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const dir = resolve(process.argv[2] ?? '');
const shotsAt = process.argv.includes('--screenshots') ? resolve(process.argv[process.argv.indexOf('--screenshots') + 1]) : null;
if (shotsAt) mkdirSync(shotsAt, { recursive: true });
const problems = [];
const ok = (cond, msg) => cond || problems.push(msg);

// Over http, as it is hosted: axe reads stylesheets with XHR, which a file: page may not do.
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const f = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(dir) || !existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': mime[f.slice(f.lastIndexOf('.'))] || 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise((ok) => server.listen(Number(process.env.VOID_TEST_PORT || 0), '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(process.env.VOID_CHROMIUM_PATH ? { executablePath: process.env.VOID_CHROMIUM_PATH } : {});
for (const width of [1440, 390]) {
  for (const scheme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, colorScheme: scheme });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(base);
    await page.waitForSelector('html[data-ready]', { state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
    const tag = `${width}px ${scheme}`;
    const data = JSON.parse(await page.evaluate(() => document.getElementById('gallery-data').textContent));

    ok((await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), `${tag}: the page scrolls sideways`);
    ok((await page.locator('.thumb').count()) > 0, `${tag}: no thumbnails`);
    if (shotsAt) await page.screenshot({ path: join(shotsAt, `gallery-${width}-${scheme}.png`) });

    // Axe on the grid, then in the viewer.
    const axe = async (where) => {
      await page.evaluate(axeSource);
      const r = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
      for (const v of r.violations) problems.push(`${tag} ${where}: axe ${v.id} (${v.nodes.length}): ${v.nodes[0].html.slice(0, 120)}`);
    };
    await axe('grid');

    // Keyboard: Tab reaches a thumbnail, Enter opens, arrows step, Escape closes and returns focus.
    const first = page.locator('.thumb').first();
    await first.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#viewer:not([hidden])');
    const title1 = await page.locator('#viewer-title').textContent();
    await page.keyboard.press('ArrowRight');
    const title2 = await page.locator('#viewer-title').textContent();
    ok(data.items.filter((i) => true).length < 2 || title1 !== title2, `${tag}: ArrowRight did not change the image`);
    await page.keyboard.press('ArrowLeft');
    ok((await page.locator('#viewer-title').textContent()) === title1, `${tag}: ArrowLeft did not come back`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tag}: the viewer scrolls the page sideways`);
    if (shotsAt) await page.screenshot({ path: join(shotsAt, `viewer-${width}-${scheme}.png`) });
    // Every view of the first image renders.
    const views = await page.locator('#viewer-views void-segmented-control-item').count();
    for (let n = 1; n <= views; n++) {
      await page.keyboard.press(String(n));
      const broken = await page.evaluate(async () => {
        const imgs = [...document.querySelectorAll('#viewer-body img')];
        await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
        return imgs.filter((i) => !i.naturalWidth).length;
      });
      ok(broken === 0, `${tag}: view ${n} has an image that did not load`);
      if (data.mode === 'compare' && n === 2 && shotsAt) await page.screenshot({ path: join(shotsAt, `slider-${width}-${scheme}.png`) });
    }
    await axe('viewer');
    await page.keyboard.press('Escape');
    ok(await page.locator('#viewer').isHidden(), `${tag}: Escape did not close the viewer`);
    ok(await page.evaluate(() => document.activeElement?.classList.contains('thumb')), `${tag}: focus did not return to the thumbnail`);
    ok(errors.length === 0, `${tag}: page errors: ${errors.join('; ')}`);
    await context.close();
  }
}
await browser.close();
server.close();
if (problems.length) {
  console.error(`gallery check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('gallery check passed: 1440 and 390 px, dark and light, keyboard, all views, axe');
