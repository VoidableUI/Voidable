// SPDX-License-Identifier: MIT
// Headless Chromium (playwright-core) and a static server for rendered cases.
//
// VOID_CHROMIUM_PATH picks the browser (default /usr/bin/chromium when it
// exists, else Playwright's own download).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';
import { buildAssets } from './render.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/** Serve `/case/<id>/...` from `casesDir` and the library under `/__eval/`. */
export async function startServer(casesDir) {
  const assets = await buildAssets();
  const harness = join(import.meta.dirname, 'harness-page.js');
  const send = (res, status, type, body) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(body);
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = decodeURIComponent(url.pathname);
    if (p === '/__eval/harness.js') return send(res, 200, TYPES['.js'], readFileSync(harness));
    if (p === '/__eval/ui.js') return send(res, 200, TYPES['.js'], readFileSync(assets.ui));
    if (p === '/__eval/theme.css') return send(res, 200, TYPES['.css'], readFileSync(assets.theme));
    if (p.startsWith('/__eval/ui-sub/')) return send(res, 200, TYPES['.js'], "export * from '/__eval/ui.js';\n");
    if (p === '/favicon.ico') return send(res, 204, 'image/x-icon', '');
    // An agent that links the library or theme itself gets the same files.
    if (/voidable/i.test(p) && /\.css$/.test(p)) return send(res, 200, TYPES['.css'], readFileSync(assets.theme));
    if (/voidable/i.test(p) && /\.m?js$/.test(p)) return send(res, 200, TYPES['.js'], "export * from '/__eval/ui.js';\n");
    if (p.startsWith('/case/')) {
      const file = normalize(join(casesDir, p.slice('/case/'.length)));
      if (file.startsWith(casesDir) && existsSync(file) && statSync(file).isFile()) {
        return send(res, 200, TYPES[extname(file)] || 'application/octet-stream', readFileSync(file));
      }
    }
    send(res, 404, 'text/plain', 'not found');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { origin: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)), assets };
}

export function chromiumPath() {
  if (process.env.VOID_CHROMIUM_PATH) return process.env.VOID_CHROMIUM_PATH;
  if (existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  return undefined;
}

export async function launch() {
  return chromium.launch({ executablePath: chromiumPath(), headless: true });
}
