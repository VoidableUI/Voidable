// SPDX-License-Identifier: MIT
//
// Test server for the browser suite. Started by Playwright's `webServer`.
//
//   /build/*            bundles written by scripts/build.mjs
//   /<name>             pages/<name>.html. A page that does not start with
//                       <!doctype is a body fragment and is wrapped in the
//                       standard layout (harness, theme, @voidable/ui).
//                       ?theme=dark|light|none sets <html data-theme>.
//                       @voidable/ui loads after parsing (as a module script
//                       or a deferred bundle would); ?load=sync loads it
//                       synchronously in <head>, before any markup exists.
//   /app/<name>/<sid>   GET renders pages/<name>.mjs's render(state) for the
//                       state stored under <sid>; POST (JSON) merges into it.
//                       This is a real server round trip, so Turbo page
//                       refreshes and stream responses go over HTTP.
//   /echo               echoes the query string (GET form submissions) as JSON
//                       in <pre id="echo">.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VOID_TEST_PORT || 4417);

if (!process.env.VOID_SKIP_BUNDLE) {
  execFileSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };
const states = new Map();

export function layout(body, { theme = 'dark', title = 'Void UI test', load = 'defer', testing = false } = {}) {
  const attr = theme === 'none' ? '' : ` data-theme="${theme}"`;
  return `<!doctype html>
<html lang="en"${attr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<script src="/build/harness.js"></script>
<link rel="stylesheet" href="/build/theme.css">
<script${load === 'defer' ? ' defer' : ''} src="/build/ui.js"></script>
${testing ? '<script defer src="/build/testing.js"></script>' : ''}
</head>
<body>
${body}
</body>
</html>`;
}

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function send(res, status, body, type = types['.html']) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = decodeURIComponent(url.pathname);

    if (path.startsWith('/build/')) {
      const file = normalize(join(root, '.build', path.slice('/build/'.length)));
      if (!file.startsWith(join(root, '.build')) || !existsSync(file) || statSync(file).isDirectory()) return send(res, 404, 'not found', 'text/plain');
      return send(res, 200, readFileSync(file), types[extname(file)] || 'application/octet-stream');
    }

    if (path === '/echo') {
      const entries = [...url.searchParams.entries()];
      return send(res, 200, layout(`<pre id="echo">${escape(JSON.stringify(entries))}</pre>`));
    }

    const app = /^\/app\/([\w-]+)\/([\w-]+)$/.exec(path);
    if (app) {
      const [, name, sid] = app;
      const file = join(root, 'pages', `${name}.mjs`);
      if (!existsSync(file)) return send(res, 404, 'no such app', 'text/plain');
      const mod = await import(pathToFileURL(file).href);
      if (req.method === 'POST') {
        const patch = JSON.parse((await readBody(req)) || '{}');
        states.set(sid, { ...(states.get(sid) ?? mod.initialState?.() ?? {}), ...patch });
        // A Turbo Stream response when the page asks for one.
        if ((req.headers.accept || '').includes('text/vnd.turbo-stream.html') && mod.stream) {
          return send(res, 200, mod.stream(states.get(sid)), 'text/vnd.turbo-stream.html; charset=utf-8');
        }
        return send(res, 204, '');
      }
      const state = states.get(sid) ?? mod.initialState?.() ?? {};
      states.set(sid, state);
      return send(res, 200, mod.render(state, { layout, sid, query: url.searchParams }));
    }

    const name = path === '/' ? 'index' : path.slice(1).replace(/\.html$/, '');
    const file = normalize(join(root, 'pages', `${name}.html`));
    if (!file.startsWith(join(root, 'pages')) || !existsSync(file)) return send(res, 404, 'not found', 'text/plain');
    const src = readFileSync(file, 'utf8');
    if (/^\s*<!doctype/i.test(src)) return send(res, 200, src);
    return send(res, 200, layout(src, { theme: url.searchParams.get('theme') || 'dark', title: name, load: url.searchParams.get('load') || 'defer', testing: url.searchParams.has('testing') }));
  } catch (err) {
    console.error(err);
    send(res, 500, String(err.stack || err), 'text/plain');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`browser test server on http://127.0.0.1:${port}`));
