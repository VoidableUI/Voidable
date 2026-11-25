// SPDX-License-Identifier: MIT
//
// Photographs the reference pages: every page, in every shipped theme and skin,
// in dark and light, at 1440x900 and 390x844, full page.
//
//   node shots/capture.mjs --out DIR [filters] [--root CHECKOUT] [--smoke]
//
// Filters take comma lists and may be repeated; no filter means all:
//   --page overview,form   --theme void,paper   --skin loft   --scheme dark   --width 390
// (`--theme` and `--skin` together name looks; `--look` takes ids such as skin-loft.)
//   --smoke      the small subset (SMOKE pages x void and Loft x both schemes x both widths)
//   --root DIR   a checkout whose built packages are photographed (default: this one)
//   --jobs N     pages photographed at once (default: 4)
//   --gallery D  also build the review gallery in D (shots/gallery.mjs)
//   --webp       store the gallery's images as lossless WebP (the docs site)
//   --stories    also photograph the Storybook stories (see stories.mjs), at one look
//
// Output: DIR/<page>/<look>.<scheme>.<width>.png and DIR/manifest.json.
//
// What makes two runs identical (see "Visual review" in CONTRIBUTING.md):
//   software rendering (no GPU), hinting and LCD text off, sRGB, device scale 1;
//   animations and transitions finished (0s), reduced motion, caret hidden,
//   scrollbars hidden; fonts bundled and awaited (document.fonts.ready);
//   fixed clock (2026-01-15T12:00:00Z), en-US, UTC; fixed data (it is in the HTML).
import { launch, newContext } from './browser.mjs';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SCHEMES, TOOLING_ROOT, WIDTHS, pageDocument, serveReference } from './lib.mjs';
import { PAGES, SMOKE_LOOKS } from './pages.mjs';

export function parseArgs(argv) {
  const opts = { out: null, root: TOOLING_ROOT, page: [], theme: [], skin: [], look: [], scheme: [], width: [], jobs: 4, smoke: false, stories: false, webp: false, gallery: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--smoke' || a === '--stories' || a === '--webp') opts[a.slice(2)] = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const value = argv[++i];
      if (!(key in opts) || value === undefined) throw new Error(`unknown or incomplete option ${a}`);
      if (Array.isArray(opts[key])) opts[key].push(...value.split(',').filter(Boolean));
      else opts[key] = key === 'jobs' ? Number(value) : value;
    } else throw new Error(`unexpected argument ${a}`);
  }
  if (!opts.out) throw new Error('--out DIR is required');
  opts.out = resolve(opts.out);
  opts.root = resolve(opts.root);
  if (opts.gallery) opts.gallery = resolve(opts.gallery);
  return opts;
}

const csv = (list) => (list.length ? new Set(list) : null);

/** The jobs a set of options asks for, from what the checkout ships. */
export function plan(opts, looks) {
  const pages = csv(opts.page);
  const themes = csv(opts.theme);
  const skins = csv(opts.skin);
  const ids = csv(opts.look);
  const schemes = csv(opts.scheme);
  const widths = csv(opts.width.map(Number).map(String));
  const lookWanted = (l) => {
    if (opts.smoke && !SMOKE_LOOKS.includes(l.id)) return false;
    if (ids && !ids.has(l.id)) return false;
    if (themes || skins) return (l.kind === 'theme' && themes?.has(l.name)) || (l.kind === 'skin' && skins?.has(l.name));
    return true;
  };
  const jobs = [];
  for (const page of PAGES) {
    if (pages && !pages.has(page.id)) continue;
    if (opts.smoke && !page.smoke) continue;
    for (const look of looks.filter(lookWanted))
      for (const scheme of SCHEMES) {
        if (schemes && !schemes.has(scheme)) continue;
        for (const width of WIDTHS) {
          if (widths && !widths.has(String(width))) continue;
          jobs.push({ page, look, scheme, width });
        }
      }
  }
  return jobs;
}

/** Forces the pseudo-classes a page names with data-force="hover active" on everything inside the marked element. */
async function forceStates(page) {
  const marked = await page.evaluate(() => [...document.querySelectorAll('[data-force]')].length);
  if (!marked) return;
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await client.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-force]' });
  for (const id of nodeIds) {
    const { attributes } = await client.send('DOM.getAttributes', { nodeId: id });
    const forced = attributes[attributes.indexOf('data-force') + 1].split(/\s+/).filter(Boolean);
    const inside = await client.send('DOM.querySelectorAll', { nodeId: id, selector: '*' });
    for (const nodeId of inside.nodeIds) await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: forced });
  }
  // focus-visible is also drawn by the browser, on the focused element, only when the page is focused.
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
}

/** Waits for everything that can still change: fonts, the components, the chart draw-in, two frames. */
async function settle(page) {
  await page.waitForFunction(() => window.__hydrated === true && typeof window.__settle === 'function' && !!customElements.get('void-button'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await window.__settle(document);
  });
}

export async function photograph(browser, base, job, outFile) {
  const { page: def, look, scheme, width } = job;
  const context = await newContext(browser, { width, scheme });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));
  try {
    await page.goto(`${base}/p/${def.id}?look=${look.id}&scheme=${scheme}`, { waitUntil: 'load' });
    await settle(page);
    if (def.setup) {
      await def.setup(page);
      await settle(page);
    }
    await forceStates(page);
    // Fonts may be requested late by what setup opened.
    await page.evaluate(() => document.fonts.ready);
    mkdirSync(join(outFile, '..'), { recursive: true });
    await page.screenshot({ path: outFile, fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    return { errors, height };
  } finally {
    await context.close();
  }
}

export async function capture(opts) {
  const started = Date.now();
  rmSync(opts.out, { recursive: true, force: true });
  mkdirSync(opts.out, { recursive: true });
  const server = await serveReference(opts.root);
  const browser = await launch();
  const jobs = plan(opts, server.looks);
  const shots = [];
  const failures = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      const rel = `${job.page.id}/${job.look.id}.${job.scheme}.${job.width}.png`;
      try {
        const { errors, height } = await photograph(browser, server.url, job, join(opts.out, rel));
        shots.push({ page: job.page.id, look: job.look.id, scheme: job.scheme, width: job.width, file: rel, height, ...(errors.length ? { errors } : {}) });
        if (errors.length) failures.push(`${rel}: ${errors.join('; ')}`);
      } catch (err) {
        failures.push(`${rel}: ${err.message.split('\n')[0]}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.jobs) }, worker));
  let storyPages = [];
  if (opts.stories) {
    const { buildStorybook, photographStories } = await import('./stories.mjs');
    buildStorybook(opts.root);
    const r = await photographStories(browser, opts.root, opts.out, { jobs: opts.jobs, schemes: csv(opts.scheme), widths: csv(opts.width.map(String)) });
    shots.push(...r.shots);
    failures.push(...r.failures);
    storyPages = r.stories;
  }
  await browser.close();
  await server.close();

  const fallback = [];
  for (const page of PAGES) {
    if (!shots.some((s) => s.page === page.id)) continue;
    if (pageDocument(opts.root, page, server.looks[0], 'dark').fallback) fallback.push(page.id);
  }
  shots.sort((a, b) => a.file.localeCompare(b.file));
  const manifest = {
    version: 1,
    pages: PAGES.filter((p) => shots.some((s) => s.page === p.id)).map(({ id, title, group }) => ({ id, title, group })),
    storyPages,
    looks: server.looks.filter((l) => shots.some((s) => s.look === l.id)),
    schemes: SCHEMES.filter((s) => shots.some((x) => x.scheme === s)),
    widths: WIDTHS.filter((w) => shots.some((s) => s.width === w)),
    fallbackMarkup: fallback,
    shots,
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
  writeFileSync(join(opts.out, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);
  console.log(`${shots.length} screenshots in ${manifest.seconds}s -> ${opts.out}`);
  if (fallback.length) console.log(`note: ${fallback.join(', ')} use the markup of this checkout: the photographed ref has no such reference file`);
  if (failures.length) {
    console.error(`${failures.length} problem(s):\n  ${failures.join('\n  ')}`);
    return { manifest, failures };
  }
  return { manifest, failures };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const { failures } = await capture(opts);
    if (opts.gallery) {
      const { buildGallery } = await import('./gallery.mjs');
      await buildGallery({ head: opts.out, out: opts.gallery, webp: opts.webp });
      console.log(`open ${join(opts.gallery, 'index.html')}`);
    }
    process.exit(failures.length ? 1 : 0);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
