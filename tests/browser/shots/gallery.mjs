// SPDX-License-Identifier: MIT
//
// Builds the review gallery: a static page (no server, opens from a folder or
// any web host) made of the library's own components and theme.
//
//   node shots/gallery.mjs --head DIR --out DIR [--base DIR] [--title TEXT]
//                          [--head-label TEXT] [--base-label TEXT] [--webp]
//
// One capture directory: a grid of every image, filterable, click to zoom.
// Two (--base and --head): the images that changed, sorted by how much, each with
// side-by-side, an overlay slider and the highlighted difference, and a summary.
//
// --webp stores the images as lossless WebP (about a third of the size of the
// PNG); it needs the optional `sharp` package and is what the docs site uses.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareDirs } from './diff.mjs';
import { FONT_CSS, TOOLING_ROOT, bundleUi } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, 'gallery');

export function parseArgs(argv) {
  const o = { head: null, base: null, out: null, title: null, headLabel: null, baseLabel: null, webp: false };
  const map = { '--head': 'head', '--base': 'base', '--out': 'out', '--title': 'title', '--head-label': 'headLabel', '--base-label': 'baseLabel' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--webp') o.webp = true;
    else if (map[argv[i]]) o[map[argv[i]]] = argv[++i];
    else throw new Error(`unknown option ${argv[i]}`);
  }
  if (!o.head || !o.out) throw new Error('--head DIR and --out DIR are required');
  for (const k of ['head', 'base', 'out']) if (o[k]) o[k] = resolve(o[k]);
  return o;
}

async function copyImage(src, dest, webp) {
  mkdirSync(dirname(dest), { recursive: true });
  if (!webp) return cpSync(src, dest);
  const sharp = (await import('sharp')).default;
  await sharp(src).webp({ lossless: true, effort: 4 }).toFile(dest.replace(/\.png$/, '.webp'));
}
const ext = (p, webp) => (webp ? p.replace(/\.png$/, '.webp') : p);

export async function buildGallery(opts) {
  const { head, base, out, webp } = opts;
  const manifest = JSON.parse(readFileSync(join(head, 'manifest.json'), 'utf8'));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  let items;
  let baseManifest = null;
  if (base) {
    ({ items, base: baseManifest } = compareDirs(base, head, out));
  } else {
    items = manifest.shots.map((s) => ({ page: s.page, look: s.look, scheme: s.scheme, width: s.width, head: s.file, status: 'same', height: s.height }));
  }

  // Images: the head of every item, and the base of what changed or went away.
  const copies = [];
  for (const it of items) {
    if (it.head) copies.push([join(head, it.head), join(out, 'img/head', ext(it.head, webp)), webp]);
    if (it.base && it.status !== 'same') copies.push([join(base, it.base), join(out, 'img/base', ext(it.base, webp)), webp]);
    if (it.diff && webp) copies.push([join(out, it.diff), join(out, ext(it.diff, webp)), true]);
  }
  for (let i = 0; i < copies.length; i += 16) await Promise.all(copies.slice(i, i + 16).map(([s, d, w]) => copyImage(s, d, w)));
  const publish = items.map((it) => ({
    ...it,
    head: it.head && `img/head/${ext(it.head, webp)}`,
    base: it.base && it.status !== 'same' ? `img/base/${ext(it.base, webp)}` : it.status === 'same' && it.head ? `img/head/${ext(it.head, webp)}` : undefined,
    diff: it.diff && ext(it.diff, webp),
  }));
  if (webp) for (const it of items) if (it.diff) rmSync(join(out, it.diff), { force: true });

  // Order: a comparison by amount of change; one capture by page, look, scheme, width.
  const pageIx = new Map(manifest.pages.map((p, i) => [p.id, i]));
  const lookIx = new Map(manifest.looks.map((l, i) => [l.id, i]));
  const rank = { changed: 0, removed: 1, added: 2, same: 3 };
  publish.sort((a, b) =>
    base
      ? rank[a.status] - rank[b.status] || (b.ratio ?? 0) - (a.ratio ?? 0) || pageIx.get(a.page) - pageIx.get(b.page)
      : pageIx.get(a.page) - pageIx.get(b.page) || lookIx.get(a.look) - lookIx.get(b.look) || a.scheme.localeCompare(b.scheme) || b.width - a.width,
  );
  const count = (s) => publish.filter((i) => i.status === s).length;
  const data = {
    mode: base ? 'compare' : 'single',
    title: opts.title || (base ? 'Visual comparison' : 'Reference pages'),
    headLabel: opts.headLabel || 'head',
    baseLabel: opts.baseLabel || 'base',
    pages: manifest.pages,
    looks: manifest.looks,
    schemes: manifest.schemes,
    widths: manifest.widths,
    fallbackMarkup: manifest.fallbackMarkup ?? [],
    generated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    summary: { total: publish.length, changed: count('changed'), added: count('added'), removed: count('removed'), same: count('same') },
    baseSeconds: baseManifest?.seconds,
    items: publish,
  };

  // The page: the template, the components and the theme, fonts. Nothing from a network.
  const ui = await bundleUi(TOOLING_ROOT);
  writeFileSync(join(out, 'ui.js'), ui);
  cpSync(join(TOOLING_ROOT, 'packages/theme/dist/void.css'), join(out, 'void.css'));
  mkdirSync(join(out, 'fonts'), { recursive: true });
  const nm = join(here, '../node_modules/@fontsource-variable');
  cpSync(join(nm, 'inter/files/inter-latin-wght-normal.woff2'), join(out, 'fonts/inter.woff2'));
  cpSync(join(nm, 'inter/files/inter-latin-ext-wght-normal.woff2'), join(out, 'fonts/inter-ext.woff2'));
  cpSync(join(nm, 'jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2'), join(out, 'fonts/mono.woff2'));
  cpSync(join(nm, 'jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2'), join(out, 'fonts/mono-ext.woff2'));
  const faces = FONT_CSS.split('\n').filter((l) => !/Iowan/.test(l)).map((l) => l.replace('url(/fonts/', 'url(fonts/')).join('\n');
  writeFileSync(join(out, 'gallery.css'), `${faces}\n${readFileSync(join(TEMPLATE, 'gallery.css'), 'utf8')}`);
  cpSync(join(TEMPLATE, 'app.js'), join(out, 'app.js'));
  // JSON in a script: it opens from a folder, where fetch() is not allowed.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  writeFileSync(join(out, 'index.html'), readFileSync(join(TEMPLATE, 'index.html'), 'utf8').replace('<!--DATA-->', `<script type="application/json" id="gallery-data">${json}</script>`).replace('<!--TITLE-->', data.title));
  console.log(`gallery: ${data.summary.total} images${base ? `, ${data.summary.changed} changed, ${data.summary.added} added, ${data.summary.removed} removed` : ''} -> ${join(out, 'index.html')}`);
  return data;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await buildGallery(parseArgs(process.argv.slice(2)));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
