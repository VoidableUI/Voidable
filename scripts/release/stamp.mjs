#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Write one version into every manifest that must carry it:
//
//   node scripts/release/stamp.mjs 0.8.0   # before building and packing a release
//   node scripts/release/stamp.mjs 0.0.0   # back to the committed placeholder
//
// The repository commits 0.0.0 everywhere; the release workflow stamps the
// computed version into its checkout and never commits it. Composer has no
// version field: Packagist reads the tag on the split repository.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GEM, HEX, ROOT, SEMVER, npmPackages, read } from './lib.mjs';

/** Replace exactly one match of re (whose group 1 is the version) in a file. */
function replaceOne(rel, re, version) {
  const src = read(rel);
  const matches = [...src.matchAll(new RegExp(re.source, 'gm'))];
  if (matches.length !== 1) throw new Error(`${rel}: expected one version field, found ${matches.length}`);
  const m = matches[0];
  const start = m.index + m[0].indexOf(m[1]);
  const out = src.slice(0, start) + version + src.slice(start + m[1].length);
  writeFileSync(join(ROOT, rel), out);
  return m[1];
}

export const FIELDS = [
  ...npmPackages().map((p) => ({ file: p.file, re: /^ {2}"version": "([^"]*)"/ })),
  { file: GEM.versionFile, re: /^\s*VERSION = "([^"]*)"/ },
  { file: HEX.mixfile, re: /^\s*version: "([^"]*)"/ },
];

export function stamp(version) {
  if (!SEMVER.test(version)) throw new Error(`not a semantic version: ${version}`);
  return FIELDS.map(({ file, re }) => ({ file, from: replaceOne(file, re, version), to: version }));
}

/** Current value of every stamped field. */
export function current() {
  return FIELDS.map(({ file, re }) => {
    const m = new RegExp(re.source, 'm').exec(read(file));
    return { file, version: m ? m[1] : null };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2];
  try {
    for (const { file, from, to } of stamp(version)) console.log(`${file}: ${from} -> ${to}`);
  } catch (e) {
    console.error(`stamp failed: ${e.message}`);
    process.exit(1);
  }
}
