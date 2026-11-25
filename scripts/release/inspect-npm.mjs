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
  return { name: pkg.name, version: pkg.version, siblings, errors };
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
