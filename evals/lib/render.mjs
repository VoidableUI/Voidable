// SPDX-License-Identifier: MIT
// Turn an agent's file into a page Chromium can load.
//
//   html    the document as written, with the library injected into <head>
//   react   bundled with esbuild (TSX, automatic JSX runtime), mounted into #root
//   svelte  compiled with svelte/compiler, bundled with esbuild, mounted into #app
//   erb     rendered by ActionView 8 (fixtures/erb/render.rb), placed in a layout
//   heex    rendered by Phoenix.LiveView 1.1's HEEx engine (fixtures/heex/render.exs)
//   blade   rendered by Illuminate View, Laravel's Blade (fixtures/blade/render.php)
//
// The server templates are rendered by the real template engines with the
// task's data as assigns, then loaded as a static page: server round-trips
// (Turbo responses, LiveView events, Livewire requests) are not exercised.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { ASSETS, EVALS, FIXTURES, ROOT } from './paths.mjs';

const require = createRequire(import.meta.url);

/** Build the library bundle and theme stylesheet once into .cache/assets. */
export async function buildAssets({ force = false } = {}) {
  mkdirSync(ASSETS, { recursive: true });
  const ui = join(ASSETS, 'ui.js');
  const theme = join(ASSETS, 'theme.css');
  const dist = join(ROOT, 'packages', 'ui', 'dist', 'index.js');
  if (!existsSync(dist)) throw new Error('packages/ui/dist is missing; run `mise run build` first');
  // Rebuild when the built library or theme is newer than the cached bundle;
  // a stale cache makes the contract and scoring tests judge an old build.
  const newest = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile()).reduce((t, e) => Math.max(t, statSync(join(e.parentPath, e.name)).mtimeMs), 0);
  const stale = (out, dir) => !existsSync(out) || statSync(out).mtimeMs < newest(dir);
  const themeDir = dirname(require.resolve('@voidable/theme'));
  if (force || stale(ui, dirname(dist))) {
    const entry = join(ASSETS, 'ui-entry.js');
    writeFileSync(entry, "export * from '@voidable/ui';\n");
    await build({ entryPoints: [entry], bundle: true, format: 'esm', outfile: ui, absWorkingDir: EVALS, logLevel: 'silent', nodePaths: [join(EVALS, 'node_modules')] });
  }
  if (force || stale(theme, themeDir)) {
    await build({ entryPoints: [require.resolve('@voidable/theme')], bundle: true, outfile: theme, logLevel: 'silent' });
  }
  return { ui, theme, axe: require.resolve('axe-core/axe.min.js') };
}

export const HEAD = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script src="/__eval/harness.js"></script>
<script type="importmap">{"imports":{"@voidable/ui":"/__eval/ui.js","@voidable/ui/":"/__eval/ui-sub/"}}</script>
<link rel="stylesheet" href="/__eval/theme.css">
<script type="module" src="/__eval/ui.js"></script>`;

const layout = (body, { scripts = '', title = 'Eval' } = {}) =>
  `<!doctype html>\n<html lang="en">\n<head>\n${HEAD}\n<title>${title}</title>\n</head>\n<body>\n${body}\n${scripts}\n</body>\n</html>\n`;

/** Inject the library at the start of <head> of an agent-written document. */
export function injectHead(doc) {
  if (/<head[^>]*>/i.test(doc)) return doc.replace(/<head[^>]*>/i, (m) => `${m}\n${HEAD}\n`);
  if (/<html[^>]*>/i.test(doc)) return doc.replace(/<html[^>]*>/i, (m) => `${m}\n<head>\n${HEAD}\n</head>\n`);
  return layout(doc);
}

const cssStub = {
  name: 'css-stub',
  setup(b) {
    // The theme is already on the page; CSS imports from components are no-ops.
    b.onResolve({ filter: /\.css$|^@voidable\/theme/ }, (a) => ({ path: a.path, namespace: 'css-stub' }));
    b.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({ contents: '', loader: 'js' }));
  },
};

const sveltePlugin = {
  name: 'svelte',
  setup(b) {
    b.onLoad({ filter: /\.svelte$/ }, async (a) => {
      const { compile } = await import('svelte/compiler');
      const src = readFileSync(a.path, 'utf8');
      try {
        const out = compile(src, { filename: a.path, generate: 'client', css: 'injected' });
        return { contents: out.js.code, loader: 'js', resolveDir: EVALS, warnings: out.warnings.map((w) => ({ text: w.message })) };
      } catch (e) {
        return { errors: [{ text: e.message, location: e.start ? { line: e.start.line, column: e.start.column, file: a.path } : null }] };
      }
    });
  },
};

async function bundle(dir, entrySource, plugins) {
  const entry = join(dir, 'entry.js');
  writeFileSync(entry, entrySource);
  try {
    await build({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      outfile: join(dir, 'app.js'),
      absWorkingDir: EVALS,
      nodePaths: [join(EVALS, 'node_modules')],
      jsx: 'automatic',
      loader: { '.tsx': 'tsx', '.ts': 'ts' },
      // One copy of the elements: the page's import map points these at the library bundle.
      external: ['@voidable/ui', '@voidable/ui/*'],
      plugins,
      logLevel: 'silent',
      define: { 'process.env.NODE_ENV': '"development"' },
    });
    return null;
  } catch (e) {
    return (e.errors || []).map((x) => `${x.location ? `${x.location.line}:${x.location.column} ` : ''}${x.text}`).join('\n') || String(e.message);
  }
}

const resolved = new Map();
/** The mise-pinned binary for a tool (ruby, elixir, php), else whatever is on PATH. */
export function tool(name) {
  if (!resolved.has(name)) {
    const r = spawnSync('mise', ['which', name], { encoding: 'utf8', cwd: ROOT });
    resolved.set(name, r.status === 0 && r.stdout.trim() ? r.stdout.trim() : name);
  }
  return resolved.get(name);
}

function runFixture(name, args, opts = {}) {
  const cmd = tool(name);
  // Elixir needs erl next to it; put every pinned server-side tool on PATH.
  const bins = [...new Set([cmd, tool('erl'), tool('ruby'), tool('php')].filter((p) => p.includes('/')).map((p) => dirname(p)))];
  const env = { ...process.env, ...(opts.env || {}), PATH: [...bins, process.env.PATH].join(':') };
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180_000, ...opts, env });
  if (r.error) return { error: `${cmd}: ${r.error.message}` };
  if (r.status !== 0) return { error: (r.stderr || r.stdout || `exit ${r.status}`).trim().split('\n').slice(0, 30).join('\n') };
  return { html: r.stdout };
}

/**
 * Render `source` (the agent's file for `task`) into `dir/index.html`.
 * @returns {{ ok: boolean, error?: string, engine: string }}
 */
export async function render(task, source, dir) {
  mkdirSync(dir, { recursive: true });
  const data = task.data || {};
  const write = (html) => writeFileSync(join(dir, 'index.html'), html);
  switch (task.format) {
    case 'html': {
      write(injectHead(source));
      return { ok: true, engine: 'static html' };
    }
    case 'react': {
      writeFileSync(join(dir, 'App.tsx'), source);
      const err = await bundle(
        dir,
        `import '@voidable/ui';\nimport { createElement } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.tsx';\ncreateRoot(document.getElementById('root')).render(createElement(App));\n`,
        [cssStub],
      );
      if (err) return { ok: false, error: `esbuild: ${err}`, engine: 'esbuild + react 19' };
      write(layout('<div id="root"></div>', { scripts: '<script type="module" src="app.js"></script>' }));
      return { ok: true, engine: 'esbuild + react 19' };
    }
    case 'svelte': {
      writeFileSync(join(dir, 'App.svelte'), source);
      const err = await bundle(
        dir,
        `import '@voidable/ui';\nimport { mount } from 'svelte';\nimport App from './App.svelte';\nmount(App, { target: document.getElementById('app') });\n`,
        [cssStub, sveltePlugin],
      );
      if (err) return { ok: false, error: `svelte: ${err}`, engine: 'svelte 5 compiler' };
      write(layout('<div id="app"></div>', { scripts: '<script type="module" src="app.js"></script>' }));
      return { ok: true, engine: 'svelte 5 compiler' };
    }
    case 'erb': {
      writeFileSync(join(dir, 'index.html.erb'), source);
      writeFileSync(join(dir, 'data.json'), JSON.stringify(data));
      const r = runFixture('ruby', [join(FIXTURES, 'erb', 'render.rb'), dir]);
      if (r.error) return { ok: false, error: `ActionView: ${r.error}`, engine: 'ActionView 8' };
      write(layout(r.html));
      return { ok: true, engine: 'ActionView 8' };
    }
    case 'heex': {
      writeFileSync(join(dir, 'index.html.heex'), source);
      writeFileSync(join(dir, 'data.json'), JSON.stringify(data));
      // mise keeps Hex in <elixir install>/.mix; a bare environment does not point MIX_HOME there.
      const mixHome = join(dirname(dirname(tool('elixir'))), '.mix');
      const r = runFixture('elixir', [join(FIXTURES, 'heex', 'render.exs'), dir], {
        env: {
          MIX_INSTALL_DIR: process.env.MIX_INSTALL_DIR || join(EVALS, '.cache', 'mix'),
          ...(!process.env.MIX_HOME && existsSync(mixHome) ? { MIX_HOME: mixHome } : {}),
        },
      });
      if (r.error) return { ok: false, error: `HEEx: ${r.error}`, engine: 'Phoenix LiveView 1.1 HEEx' };
      write(layout(r.html));
      return { ok: true, engine: 'Phoenix LiveView 1.1 HEEx' };
    }
    case 'blade': {
      writeFileSync(join(dir, 'view.blade.php'), source);
      writeFileSync(join(dir, 'data.json'), JSON.stringify(data));
      const r = runFixture('php', [join(FIXTURES, 'blade', 'render.php'), dir]);
      if (r.error) return { ok: false, error: `Blade: ${r.error}`, engine: 'Illuminate View (Blade)' };
      write(layout(r.html));
      return { ok: true, engine: 'Illuminate View (Blade)' };
    }
    default:
      throw new Error(`no renderer for format ${task.format}`);
  }
}
