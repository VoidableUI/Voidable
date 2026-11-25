#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Packaging lint (`mise run lint:packaging`). Packs every published npm package
// exactly as the release does (`pnpm pack`, which rewrites workspace:*), then
// inspects the tarballs:
//
//   - publint --strict and @arethetypeswrong/cli (ESM-only profile) pass;
//   - no source map or type map ships, and nothing references a map or source
//     file that is absent from the tarball;
//   - every `exports` target exists in the tarball (wildcards match at least
//     one file), `types` comes first in each condition block, and no two
//     specifiers resolve to the same target;
//   - the manifest carries description, keywords, homepage, bugs, license,
//     repository, sideEffects and publishConfig.
//
// Tarballs are built in a temporary directory outside the working tree.
// Run `mise run build` first (the mise task depends on it).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, npmPackages } from '../release/lib.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'voidable-packaging-'));
const errors = [];
const err = (name, msg) => errors.push(`${name}: ${msg}`);

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name), base) : [join(dir, e.name).slice(base.length + 1)],
  );
}

function globToRegExp(pattern) {
  return new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
}

/** Every string target in an exports value, with the condition path that led to it. */
function targets(value, path = []) {
  if (typeof value === 'string') return [{ target: value, path }];
  if (value === null || value === undefined) return [];
  return Object.entries(value).flatMap(([k, v]) => targets(v, [...path, k]));
}

function checkManifest(name, pkg) {
  for (const f of ['description', 'homepage', 'license', 'sideEffects', 'publishConfig']) {
    if (pkg[f] === undefined) err(name, `package.json has no "${f}"`);
  }
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) err(name, 'package.json has no "keywords"');
  if (!pkg.bugs?.url) err(name, 'package.json has no "bugs.url"');
  if (!/^git\+https:\/\/.+\.git$/.test(pkg.repository?.url ?? '')) err(name, 'repository.url must be a git+https URL ending in .git');
  if (!pkg.repository?.directory) err(name, 'repository.directory is missing');
  if (pkg.publishConfig?.access !== 'public') err(name, 'publishConfig.access must be "public"');
}

function checkExports(name, pkg, files) {
  const seen = new Map();
  const exp = pkg.exports;
  if (!exp) return err(name, 'no "exports" map');
  for (const [spec, value] of Object.entries(exp)) {
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.includes('types') && keys[0] !== 'types') err(name, `exports["${spec}"]: "types" must be the first condition`);
    }
    for (const { target, path } of targets(value)) {
      const id = `${path.join('.')}:${target}`;
      if (seen.has(id)) err(name, `exports["${spec}"] and exports["${seen.get(id)}"] resolve to the same ${path.join('.') || 'default'} target ${target}`);
      seen.set(id, spec);
      const rel = target.replace(/^\.\//, '');
      if (rel.includes('*')) {
        const re = globToRegExp(rel);
        if (!files.some((f) => re.test(f))) err(name, `exports["${spec}"] target ${target} matches no file in the tarball`);
      } else if (!files.includes(rel)) {
        err(name, `exports["${spec}"] target ${target} is not in the tarball`);
      }
    }
  }
}

function checkMaps(name, dir, files) {
  for (const f of files) {
    if (/\.(css|js|mjs|cjs)\.map$|\.d\.[cm]?ts\.map$|\.map$/.test(f)) err(name, `${f} ships; maps point at sources that are not published`);
    if (/\.(js|mjs|cjs|css|d\.ts)$/.test(f)) {
      const m = /[#@] sourceMappingURL=(\S+)/.exec(readFileSync(join(dir, f), 'utf8'));
      if (m && !m[1].startsWith('data:')) err(name, `${f} references ${m[1]}, which is not shipped`);
    }
  }
}

function run(cmd, args, name, what) {
  try {
    execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    err(name, `${what} failed:\n${`${e.stdout ?? ''}${e.stderr ?? ''}`.trim().replace(/^/gm, '    ')}`);
  }
}

try {
  for (const { name, dir } of npmPackages()) {
    const out = join(tmp, name.replace(/\W+/g, '-'));
    execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: join(ROOT, dir), stdio: 'pipe' });
    const tgz = join(out, readdirSync(out).find((f) => f.endsWith('.tgz')));
    const unpacked = join(out, 'x');
    execFileSync('mkdir', ['-p', unpacked]);
    execFileSync('tar', ['-xzf', tgz, '-C', unpacked]);
    const root = join(unpacked, 'package');
    const files = walk(root);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    console.log(`${name}: ${files.length} files, ${(statSync(tgz).size / 1024).toFixed(1)} kB packed`);

    checkManifest(name, pkg);
    checkExports(name, pkg, files);
    checkMaps(name, root, files);
    run('pnpm', ['exec', 'publint', 'run', '--strict', tgz], name, 'publint');
    // A CSS-only package has no types or JavaScript for attw to resolve, and a
    // package with both (the theme: stylesheets, and a module of token names)
    // has stylesheet entry points attw cannot resolve either: those are left out.
    if (files.some((f) => f.endsWith('.js'))) {
      const stylesheets = Object.entries(pkg.exports ?? {})
        .filter(([spec, value]) => !spec.includes('*') && targets(value).every(({ target }) => target.endsWith('.css')))
        .map(([spec]) => spec);
      const exclude = stylesheets.length ? ['--exclude-entrypoints', ...stylesheets] : [];
      run('pnpm', ['exec', 'attw', tgz, '--profile', 'esm-only', '--format', 'ascii', ...exclude], name, 'attw');
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`\npackaging lint failed: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('packaging lint passed');
