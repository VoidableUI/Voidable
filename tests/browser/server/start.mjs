// SPDX-License-Identifier: MIT
//
// `node server/start.mjs <app>`: puts the built packages into a server app
// (server/apps.mjs), prepares it and runs it in the foreground. Playwright
// starts one per app as a web server, waits for its ready URL and stops it
// (SIGTERM) when the run ends.
import * as esbuild from 'esbuild';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apps } from './apps.mjs';

const name = process.argv[2];
const app = apps[name];
if (!app) {
  console.error(`unknown app "${name}"; known: ${Object.keys(apps).join(', ')}`);
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const env = { ...process.env, ...app.env };

// The toolchains pinned in mise.toml, ahead of whatever else is on PATH (a
// system Ruby, say), so the app runs on the versions the repository declares.
for (const tool of app.tools ?? []) {
  const where = spawnSync('mise', ['where', tool], { cwd: app.cwd, encoding: 'utf8' });
  if (where.status !== 0) {
    console.error(`[${name}] mise cannot find ${tool}: ${where.stderr.trim()} (run \`mise install ${tool}\`)`);
    process.exit(1);
  }
  env.PATH = `${join(where.stdout.trim(), 'bin')}:${env.PATH}`;
}

// 1. This repository's built packages, as the app will load them.
const out = join(app.cwd, app.assetsDir);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [file, spec] of Object.entries(app.assets)) {
  const target = join(out, file);
  if (spec.esm) {
    await esbuild.build({ stdin: { contents: spec.esm, resolveDir: root, loader: 'js' }, bundle: true, format: 'esm', outfile: target, logLevel: 'warning', legalComments: 'none' });
  } else if (spec.css) {
    await esbuild.build({ entryPoints: [require.resolve(spec.css)], bundle: true, outfile: target, logLevel: 'warning' });
  }
}

// 2. Prepare (install dependencies, create the database).
for (const [cmd, args] of app.prepare) {
  const r = spawnSync(cmd, args, { cwd: app.cwd, env, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[${name}] "${cmd} ${args.join(' ')}" failed with ${r.status ?? r.signal}`);
    process.exit(1);
  }
}

// 3. Run, forwarding Playwright's stop signal.
const [cmd, args] = app.start(app.port);
const child = spawn(cmd, args, { cwd: app.cwd, env, stdio: 'inherit' });
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 0 : 1)));
