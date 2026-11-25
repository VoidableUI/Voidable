// SPDX-License-Identifier: MIT
//
// Shared by the capture, the gallery and the comparison: finding the themes and
// skins of a checkout, building a reference page into a document, and serving
// it. Nothing here reads packages/*/src: like the rest of the browser suite it
// photographs what is built (packages/*/dist).
//
// A checkout is a `root`: the repository the screenshots are taken OF. It is
// not always the one the tooling runs from. `mise run shots:compare` runs this
// tooling against the built packages of two other checkouts (git worktrees of
// two refs), so a base ref that has none of this code can still be captured.
import * as esbuild from 'esbuild';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES } from './pages.mjs';

export const TOOLING_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const here = dirname(fileURLToPath(import.meta.url));

export const WIDTHS = [1440, 390];
export const HEIGHTS = { 1440: 900, 390: 844 };
export const SCHEMES = ['dark', 'light'];

/** The reference markup directory of a checkout, and the one of the tooling's own, as a fallback. */
const referenceDir = (root) => join(root, 'packages/storybook/stories/reference');

/**
 * The themes and skins a checkout ships, read from the theme package's
 * generated export list (dist/exports.json), never from a list in this code:
 * a theme or skin added to the package is captured by the next run.
 * A look is a theme (data-void-theme) or a skin on the default theme
 * (data-void-skin); `id` names it in file names and filters.
 */
export function discoverLooks(root) {
  const dist = join(root, 'packages/theme/dist');
  let themes;
  let skins;
  const list = join(dist, 'exports.json');
  if (existsSync(list)) {
    ({ themes = [], skins = [] } = JSON.parse(readFileSync(list, 'utf8')));
  } else {
    const names = (dir) => (existsSync(join(dist, dir)) ? readdirSync(join(dist, dir)).filter((f) => /^[\w-]+\.css$/.test(f)).map((f) => f.replace(/\.css$/, '')) : []);
    themes = names('themes');
    skins = names('skins');
  }
  return [
    ...themes.map((t) => ({ id: t, kind: 'theme', name: t })),
    ...skins.map((s) => ({ id: `skin-${s}`, kind: 'skin', name: s })),
  ];
}

/** The text of reference/<name>.html from `root`, or from the tooling's checkout when `root` has none. */
export function readReference(root, name) {
  const own = join(referenceDir(root), `${name}.html`);
  if (existsSync(own)) return { html: readFileSync(own, 'utf8'), fallback: false };
  const fallback = join(referenceDir(TOOLING_ROOT), `${name}.html`);
  if (!existsSync(fallback)) throw new Error(`reference/${name}.html exists in neither ${root} nor the tooling checkout`);
  return { html: readFileSync(fallback, 'utf8'), fallback: true };
}

/** The markup of a page: the bar (if any) and the files, as the Storybook screens and the theme builder frame them. */
export function pageMarkup(root, page) {
  let fallback = false;
  const part = (name) => {
    const r = readReference(root, name);
    fallback ||= r.fallback;
    return r.html;
  };
  const body = page.files.map(part).join('\n');
  let bar = '';
  if (page.nav !== false) {
    bar = part('nav');
    if (page.nav) bar = bar.replace(`data-nav="${page.nav}"`, `data-nav="${page.nav}" aria-current="page"`);
    if (page.overlay) bar = bar.replace('<void-nav-bar>', '<void-nav-bar data-void-surface="media">');
  }
  // Photographs are served from /media.
  const markup = `${bar}${body}`.replaceAll('src="media/', 'src="/media/');
  const shell = page.nav === false ? markup : `<void-shell${page.overlay ? ' nav="overlay"' : ''}>${markup}</void-shell>`;
  return { html: shell, fallback };
}

// The faces the theme names and ships no files for. Bundled so no capture needs
// a network, and so every machine draws the same glyphs. 'Iowan Old Style' is
// the first face of the Paper theme's serif stack; it is a macOS font, so it is
// mapped to a bundled serif, otherwise Paper would be drawn in whatever serif
// the machine happens to have.
const FONT_FILES = {
  '/fonts/inter.woff2': '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  '/fonts/inter-ext.woff2': '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2',
  '/fonts/mono.woff2': '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  '/fonts/mono-ext.woff2': '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2',
  '/fonts/serif.woff2': '@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2',
  '/fonts/serif-ext.woff2': '@fontsource-variable/source-serif-4/files/source-serif-4-latin-ext-wght-normal.woff2',
};
const face = (family, url, range, weight = '100 900') =>
  `@font-face{font-family:'${family}';src:url(${url}) format('woff2');font-weight:${weight};font-style:normal;font-display:block;unicode-range:${range}}`;
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
export const FONT_CSS = [
  face('Inter', '/fonts/inter.woff2', LATIN),
  face('Inter', '/fonts/inter-ext.woff2', LATIN_EXT),
  face('JetBrains Mono', '/fonts/mono.woff2', LATIN),
  face('JetBrains Mono', '/fonts/mono-ext.woff2', LATIN_EXT),
  face('Iowan Old Style', '/fonts/serif.woff2', LATIN),
  face('Iowan Old Style', '/fonts/serif-ext.woff2', LATIN_EXT),
].join('\n');

/** What makes a photograph repeatable: nothing moves, nothing blinks, no scrollbar takes width. */
export const DETERMINISM_CSS = `
*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important;caret-color:transparent!important}
html{scrollbar-width:none!important}
::-webkit-scrollbar{display:none!important}
`;

/** The document for one page in one look and scheme. */
export function pageDocument(root, page, look, scheme) {
  const attrs = [`lang="en"`, `data-theme="${scheme}"`];
  if (look.kind === 'theme') attrs.push(`data-void-theme="${look.name}"`);
  if (look.kind === 'skin') attrs.push(`data-void-skin="${look.name}"`);
  const links = [`<link rel="stylesheet" href="/theme/void.css">`];
  if (look.kind === 'theme') links.push(`<link rel="stylesheet" href="/theme/themes/${look.name}.css">`);
  if (look.kind === 'skin') links.push(`<link rel="stylesheet" href="/theme/skins/${look.name}.css">`);
  const { html, fallback } = pageMarkup(root, page);
  return {
    fallback,
    html: `<!doctype html>
<html ${attrs.join(' ')}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.id}</title>
<style>${FONT_CSS}</style>
${links.join('\n')}
<style>${DETERMINISM_CSS}</style>
<script src="/harness.js"></script>
<script src="/ui.js"></script>
</head>
<body>
${html}
<script type="module">
  import { hydrate } from '/hydrate.js';
  hydrate();
  window.__hydrated = true;
</script>
</body>
</html>`,
  };
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

/** Bundles the checkout's built @voidable/ui into one classic script that sets window.VoidUI. */
export async function bundleUi(root) {
  const entry = join(root, 'packages/ui/dist/index.js');
  if (!existsSync(entry)) throw new Error(`${entry} is missing: run \`mise run build\` in ${root} first.`);
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    globalName: 'VoidUI',
    write: false,
    logLevel: 'warning',
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  return result.outputFiles[0].text;
}

/**
 * Serves the reference pages of `root`:
 *   /p/<page>?look=<id>&scheme=dark|light   the document
 *   /theme/*   packages/theme/dist
 *   /ui.js     the built components
 *   /harness.js, /hydrate.js, /fonts/*   shared helpers and bundled fonts
 *   /media/*   the photographs
 * Listens on VOID_TEST_PORT when set, otherwise on a free port.
 */
export async function serveReference(root) {
  const ui = await bundleUi(root);
  const looks = discoverLooks(root);
  const themeDist = join(root, 'packages/theme/dist');
  const harness = readFileSync(join(TOOLING_ROOT, 'tests/browser/src/harness.js'));
  const hydrate = readFileSync(join(referenceDir(TOOLING_ROOT), 'hydrate.js'));
  const mediaDir = [join(root, 'docs/public/media'), join(TOOLING_ROOT, 'docs/public/media')].find(existsSync);

  const send = (res, status, body, type) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(body);
  };
  const file = (res, dir, rel) => {
    const f = normalize(join(dir, rel));
    if (!f.startsWith(dir) || !existsSync(f) || statSync(f).isDirectory()) return send(res, 404, 'not found', 'text/plain');
    return send(res, 200, readFileSync(f), types[extname(f)] || 'application/octet-stream');
  };

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      const path = decodeURIComponent(url.pathname);
      if (path === '/ui.js') return send(res, 200, ui, types['.js']);
      if (path === '/harness.js') return send(res, 200, harness, types['.js']);
      if (path === '/hydrate.js') return send(res, 200, hydrate, types['.js']);
      if (path.startsWith('/fonts/')) {
        const spec = FONT_FILES[path];
        if (!spec) return send(res, 404, 'not found', 'text/plain');
        return send(res, 200, readFileSync(join(here, '../node_modules', spec)), types['.woff2']);
      }
      if (path.startsWith('/theme/')) return file(res, themeDist, path.slice('/theme/'.length));
      if (path.startsWith('/media/') && mediaDir) return file(res, mediaDir, path.slice('/media/'.length));
      const m = /^\/p\/([\w-]+)$/.exec(path);
      if (m) {
        const page = PAGES.find((p) => p.id === m[1]);
        const look = looks.find((l) => l.id === url.searchParams.get('look'));
        if (!page || !look) return send(res, 404, 'no such page or look', 'text/plain');
        return send(res, 200, pageDocument(root, page, look, url.searchParams.get('scheme') === 'light' ? 'light' : 'dark').html, types['.html']);
      }
      return send(res, 404, 'not found', 'text/plain');
    } catch (err) {
      console.error(err);
      send(res, 500, String(err.stack || err), 'text/plain');
    }
  });
  const port = Number(process.env.VOID_TEST_PORT || 0);
  await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    looks,
    close: () => new Promise((ok) => server.close(ok)),
  };
}
