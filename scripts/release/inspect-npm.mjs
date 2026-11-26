#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Verify a packed npm tarball before it is published:
//
//   node scripts/release/inspect-npm.mjs dist/voidable-ui-react-0.8.0.tgz 0.8.0
//
// The packed package.json must carry the release version, and every
// @voidable/* dependency must be exactly that version (no workspace: protocol,
// no range), so an adapter can only ever resolve the core it was released with.
// Every file the package.json points at (main, module, types, bin and each
// target in exports) must be in the tarball: a package packed before its build
// has a valid package.json and none of the files it promises.
import { execFileSync } from 'node:child_process';

const FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'];

export function inspect(tgz, version) {
  const pkg = JSON.parse(execFileSync('tar', ['-xzOf', tgz, 'package/package.json'], { encoding: 'utf8' }));
  const errors = [];
  if (pkg.version !== version) errors.push(`version is ${pkg.version}, expected ${version}`);
  const siblings = [];
  for (const field of FIELDS) {
    for (const [name, spec] of Object.entries(pkg[field] || {})) {
      if (String(spec).startsWith('workspace:')) errors.push(`${field}.${name} still uses ${spec}`);
      if (!name.startsWith('@voidable/')) continue;
      siblings.push(`${field}.${name}=${spec}`);
      if (spec !== version) errors.push(`${field}.${name} is ${spec}, expected exactly ${version}`);
    }
  }
  const files = new Set(execFileSync('tar', ['-tzf', tgz], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').map((f) => f.replace(/^package\//, '')));
  for (const target of entryPoints(pkg)) {
    const rel = target.replace(/^\.\//, '');
    if (rel.includes('*')) {
      const [head, tail] = rel.split('*');
      if (![...files].some((f) => f.startsWith(head) && f.endsWith(tail))) errors.push(`nothing in the tarball matches ${target}`);
    } else if (!files.has(rel)) errors.push(`${target} is referenced by package.json but is not in the tarball`);
  }
  return { name: pkg.name, version: pkg.version, siblings, errors };
}

/** Every file path package.json promises: main, module, types, bin and all export targets. */
export function entryPoints(pkg) {
  const out = new Set();
  const walk = (v) => {
    if (typeof v === 'string') { if (v.startsWith('./')) out.add(v); }
    else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x);
  };
  for (const k of ['main', 'module', 'types', 'typings', 'browser', 'style']) if (typeof pkg[k] === 'string') out.add(pkg[k].startsWith('./') ? pkg[k] : `./${pkg[k]}`);
  walk(pkg.bin); walk(pkg.exports);
  return [...out];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [tgz, version] = process.argv.slice(2);
  const r = inspect(tgz, version);
  console.log(`${r.name}@${r.version}${r.siblings.length ? `  ${r.siblings.join(' ')}` : ''}`);
  if (r.errors.length) {
    for (const e of r.errors) console.error(`ERROR: ${tgz}: ${e}`);
    process.exit(1);
  }
}
