// SPDX-License-Identifier: MIT
//
// The per-component stories, for regression only. Storybook is built for the
// checkout (`mise run storybook_build` -> storybook-static/), every story is
// photographed at 1440 and 390 px in dark and light in ONE look (the default
// theme), and the images join the capture as the `stories` group. The gallery
// keeps them out of its main view; the comparison counts them separately.
//
// Nothing here goes to the network: the preview's webfonts and icon font are
// requested from a CDN, so the requests are answered with the bundled fonts
// or refused.
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { HEIGHTS, SCHEMES, TOOLING_ROOT, WIDTHS } from './lib.mjs';
import { newContext } from './capture.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.map': 'application/json' };

/** Serves a built Storybook. */
export async function serveStorybook(root) {
  const dir = join(root, 'storybook-static');
  if (!existsSync(join(dir, 'index.json'))) throw new Error(`${dir}/index.json is missing: run \`mise run storybook_build\` in ${root} first.`);
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = normalize(join(dir, path === '/' ? 'index.html' : path));
    if (!f.startsWith(dir) || !existsSync(f)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(readFileSync(f));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const stories = Object.values(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).entries).filter((e) => e.type === 'story');
  return { url: `http://127.0.0.1:${server.address().port}`, stories, close: () => new Promise((ok) => server.close(ok)) };
}

const fontFor = (url) => {
  const nm = join(TOOLING_ROOT, 'tests/browser/node_modules/@fontsource-variable');
  if (/inter/i.test(url)) return join(nm, 'inter/files/inter-latin-wght-normal.woff2');
  if (/jetbrains/i.test(url)) return join(nm, 'jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2');
  return null;
};

/** The shots of every story: [{ id, title, scheme, width, file }], written under outDir/stories/. */
export async function photographStories(browser, root, outDir, { look = 'void', jobs = 4 } = {}) {
  const sb = await serveStorybook(root);
  const harness = readFileSync(join(TOOLING_ROOT, 'tests/browser/src/harness.js'), 'utf8');
  const { DETERMINISM_CSS } = await import('./lib.mjs');
  const shots = [];
  const failures = [];
  const queue = sb.stories.flatMap((s) => SCHEMES.flatMap((scheme) => WIDTHS.map((width) => ({ s, scheme, width }))));
  let next = 0;
  const contexts = new Map();
  const contextFor = async (scheme, width) => {
    const key = `${scheme}-${width}`;
    if (!contexts.has(key)) {
      const context = await newContext(browser, { width, scheme });
      await context.addInitScript(harness);
      await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => {
        const font = fontFor(route.request().url());
        return font ? route.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(font) }) : route.abort();
      });
      contexts.set(key, context);
    }
    return contexts.get(key);
  };
  const worker = async () => {
    while (next < queue.length) {
      const { s, scheme, width } = queue[next++];
      const rel = `stories/${s.id}/${look}.${scheme}.${width}.png`;
      let page;
      try {
        page = await (await contextFor(scheme, width)).newPage();
        const url = `${sb.url}/iframe.html?id=${encodeURIComponent(s.id)}&viewMode=story&globals=${encodeURIComponent(`theme:${scheme};voidTheme:${look === 'void' ? 'void' : look}`)}`;
        await page.goto(url, { waitUntil: 'load' });
        await page.addStyleTag({ content: DETERMINISM_CSS });
        await page.waitForFunction(() => document.body.classList.contains('sb-show-main') || document.body.classList.contains('sb-show-errordisplay'), null, { timeout: 15000 });
        await page.evaluate(async () => {
          await document.fonts.ready;
          if (window.__settle) await window.__settle(document);
        });
        await page.screenshot({ path: join(outDir, rel), fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' });
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        shots.push({ page: `story:${s.id}`, look, scheme, width, file: rel, height, group: 'stories', title: s.title ? `${s.title} / ${s.name}` : s.id });
      } catch (err) {
        failures.push(`${rel}: ${String(err.message).split('\n')[0]}`);
      } finally {
        await page?.close();
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, worker));
  for (const c of contexts.values()) await c.close();
  await sb.close();
  return { shots, failures, stories: sb.stories.map((s) => ({ id: `story:${s.id}`, title: s.title ? `${s.title} / ${s.name}` : s.id, group: 'stories' })), heights: HEIGHTS };
}
