// SPDX-License-Identifier: MIT
//
// `node server/start.mjs <app>`: puts the built packages into a server app
// (server/apps.mjs), prepares it and runs it in the foreground. Playwright
// starts one per app as a web server, waits for its ready URL and stops it
// (SIGTERM) when the run ends.
import * as esbuild from 'esbuild';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
const env = { ...process.env, PORT: String(app.port), ...app.env };

// The toolchains pinned in mise.toml, ahead of whatever else is on PATH (a
// system Ruby, say), so the app runs on the versions the repository declares.
// Where mise has not installed a tool (CI installs Ruby, Erlang/Elixir and PHP
// with their prebuilt setup actions, at the versions mise.toml pins, and runs
// with MISE_TASK_RUN_AUTO_INSTALL=false), the tool already on PATH is used.
const binaries = { ruby: 'ruby', erlang: 'erl', elixir: 'elixir', php: 'php' };
for (const tool of app.tools ?? []) {
  const where = spawnSync('mise', ['where', tool], { cwd: app.cwd, encoding: 'utf8' });
  if (where.status === 0) {
    env.PATH = `${join(where.stdout.trim(), 'bin')}:${env.PATH}`;
    continue;
  }
  const onPath = spawnSync('sh', ['-c', `command -v ${binaries[tool] ?? tool}`], { env, encoding: 'utf8' });
  if (onPath.status !== 0) {
    console.error(`[${name}] ${tool} is neither installed by mise nor on PATH (run \`mise install ${tool}\`): ${where.stderr.trim()}`);
    process.exit(1);
  }
  console.error(`[${name}] using ${tool} from PATH (${onPath.stdout.trim()}); mise has not installed it`);
}

// 1. This repository's built packages, as the app will load them.
const out = app.assetsDir ? join(app.cwd, app.assetsDir) : null;
if (out) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
}
for (const [file, spec] of Object.entries(app.assets ?? {})) {
  const target = join(out, file);
  mkdirSync(dirname(target), { recursive: true });
  if (spec.esm) {
    await esbuild.build({ stdin: { contents: spec.esm, resolveDir: root, loader: 'js' }, bundle: true, format: 'esm', outfile: target, logLevel: 'warning', legalComments: 'none' });
  } else if (spec.css) {
    await esbuild.build({ entryPoints: [require.resolve(spec.css)], bundle: true, outfile: target, logLevel: 'warning' });
  }
}

// 2. Prepare (install dependencies, create the database). A step is a command
// ([cmd, args]), or { write: [file, text] }. A command that downloads from a
// package registry (RubyGems, Hex, Packagist, npm) carries `retry: true` as a
// third element: registries fail now and then, and one such failure must not
// fail a run, so it is tried up to three times with a pause between attempts.
const attempts = 3;
const pause = (s) => spawnSync('sleep', [String(s)]);
for (const step of app.prepare) {
  if (!Array.isArray(step)) {
    // Never overwrite a file a developer made (the Laravel example's .env).
    if (!existsSync(join(app.cwd, step.write[0]))) writeFileSync(join(app.cwd, step.write[0]), step.write[1]);
    continue;
  }
  const [cmd, args, opts = {}] = step;
  let r;
  for (let attempt = 1; attempt <= (opts.retry ? attempts : 1); attempt++) {
    r = spawnSync(cmd, args, { cwd: app.cwd, env, stdio: 'inherit' });
    if (r.status === 0) break;
    if (opts.retry && attempt < attempts) {
      console.error(`[${name}] "${cmd} ${args.join(' ')}" failed with ${r.status ?? r.signal}; retrying in ${attempt * 10}s (attempt ${attempt + 1} of ${attempts})`);
      pause(attempt * 10);
    }
  }
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
