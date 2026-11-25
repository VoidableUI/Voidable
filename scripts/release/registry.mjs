#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Read-only registry queries. Nothing here publishes.
//
//   node scripts/release/registry.mjs published npm @voidable/ui 0.8.0   # prints true/false
//   node scripts/release/registry.mjs published gem|hex|composer 0.8.0
//   node scripts/release/registry.mjs status 0.8.0    # table of every package
//   node scripts/release/registry.mjs guard 0.8.0     # fail if any registry is already past 0.8.0
//
// A query that cannot be answered (network error, unexpected status) exits 2,
// so a release job stops rather than guessing.
import { execFileSync } from 'node:child_process';
import { COMPOSER, GEM, HEX, compare, npmPackages } from './lib.mjs';

const UA = { 'user-agent': 'voidable-release-script' };

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { accept: 'application/json', ...UA } });
    } catch (e) {
      if (attempt < 3) continue;
      throw new Error(`${url}: ${e.message}`);
    }
    if (res.status === 404) return null;
    if (res.ok) return res.json();
    if (attempt >= 3 || res.status < 500) throw new Error(`${url}: HTTP ${res.status}`);
  }
}

/** All published versions of one package. */
export async function versions(kind, name) {
  if (kind === 'npm') {
    const doc = await getJson(`https://registry.npmjs.org/${name.replace('/', '%2f')}`);
    return doc ? Object.keys(doc.versions || {}) : [];
  }
  if (kind === 'gem') {
    const doc = await getJson(`https://rubygems.org/api/v1/versions/${name}.json`);
    return doc ? doc.map((v) => v.number) : [];
  }
  if (kind === 'hex') {
    const doc = await getJson(`https://hex.pm/api/packages/${name}`);
    return doc ? (doc.releases || []).map((r) => r.version) : [];
  }
  if (kind === 'composer') {
    // The tag on the split repository is the release; Packagist follows it.
    const out = execFileSync('git', ['ls-remote', '--tags', `https://github.com/${COMPOSER.splitRepo}.git`], { encoding: 'utf8' });
    return out
      .split('\n')
      .map((l) => /refs\/tags\/v(\d+\.\d+\.\d+)$/.exec(l))
      .filter(Boolean)
      .map((m) => m[1]);
  }
  throw new Error(`unknown registry ${kind}`);
}

export function targets() {
  return [
    ...npmPackages().map((p) => ({ kind: 'npm', name: p.name })),
    { kind: 'gem', name: GEM.name },
    { kind: 'hex', name: HEX.name },
    { kind: 'composer', name: COMPOSER.name },
  ];
}

const nameFor = (kind, name) => name || targets().find((t) => t.kind === kind)?.name;

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'published') {
    const kind = args[0];
    const [name, version] = kind === 'npm' ? [args[1], args[2]] : [nameFor(kind), args[1]];
    const list = await versions(kind, name);
    process.stdout.write(`${list.includes(version)}\n`);
    return;
  }
  if (cmd === 'status' || cmd === 'guard') {
    const version = args[0];
    const rows = await Promise.all(
      targets().map(async (t) => {
        const list = (await versions(t.kind, t.name)).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
        const latest = list.sort(compare).at(-1) || '-';
        return { ...t, latest, published: list.includes(version), ahead: list.filter((v) => compare(v, version) > 0) };
      }),
    );
    for (const r of rows) {
      console.log(`${r.kind.padEnd(9)} ${r.name.padEnd(24)} latest ${r.latest.padEnd(8)} ${version}: ${r.published ? 'already published (skip)' : 'to publish'}`);
    }
    if (cmd === 'guard') {
      const bad = rows.filter((r) => r.ahead.length);
      if (bad.length) {
        for (const r of bad) console.error(`ERROR: ${r.kind} ${r.name} already has ${r.ahead.join(', ')}, above ${version}`);
        process.exit(1);
      }
    }
    return;
  }
  throw new Error('usage: registry.mjs published|status|guard ...');
}

main().catch((e) => {
  console.error(`registry query failed: ${e.message}`);
  process.exit(2);
});
