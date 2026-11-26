#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Version lint (`mise run lint:versions`). Every package shares one version,
// computed at release time and stamped into the release checkout, so the
// repository must hold no version of its own:
//
//   - every stamped field (npm package.json files, the gem's VERSION, mix.exs)
//     holds the placeholder 0.0.0, or with `--stamped X.Y.Z` holds X.Y.Z;
//   - every internal @voidable/* dependency is `workspace:*`, which pnpm packs
//     as the exact sibling version;
//   - the gemspec takes its version from VERSION and composer.json has none;
//   - no tracked file hand-types a version of a Voidable package (CDN URLs,
//     demo pins, install snippets, constants in the gem).
import { GEM, HEX, COMPOSER, PLACEHOLDER, SEMVER, git, npmPackages, read } from './lib.mjs';
import { current } from './stamp.mjs';

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'devDependencies', 'optionalDependencies'];
const NPM_NAME = /^@voidable\//;

// Hand-typed versions of a Voidable package. Each pattern names what it catches.
const LITERALS = [
  [/@voidable\/(?:ui|theme|ui-[a-z]+)@v?\d+(?:\.\d+){0,2}\b/g, 'npm package pinned to a typed version (CDN URL or install command)'],
  [/@voidable\/(?:ui|theme|ui-[a-z]+)@[\^~]\d/g, 'npm package with a typed range'],
  [/gem\s+["']voidable-hotwire["']\s*,\s*["'][~><=\d]/g, 'voidable-hotwire Gemfile requirement'],
  [/["']voidable-hotwire["']\s*,\s*["'][~><=]*\s*\d/g, 'voidable-hotwire version requirement'],
  [/\{\s*:live_voidable\s*,\s*["'][~><=]*\s*\d/g, 'live_voidable mix requirement'],
  [/voidable\/laravel["']?\s*[:=]\s*["']?[\^~><=]*\s*v?\d/g, 'voidable/laravel Composer constraint'],
];

// Files the literal scan skips: lockfiles record resolved versions, and the
// release tooling's own tests use example versions.
const SKIP = [/(^|\/)pnpm-lock\.yaml$/, /(^|\/)package-lock\.json$/, /(^|\/)(Gemfile|mix|composer)\.lock$/, /^scripts\/release\//, /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|gz|tgz)$/];

export function scanText(text) {
  const hits = [];
  for (const [re, what] of LITERALS) {
    for (const m of text.matchAll(re)) {
      const line = text.slice(0, m.index).split('\n').length;
      hits.push({ line, match: m[0], what });
    }
  }
  return hits;
}

export function check({ stamped } = {}) {
  const expected = stamped ?? PLACEHOLDER;
  if (!SEMVER.test(expected)) throw new Error(`not a semantic version: ${expected}`);
  const errors = [];
  const err = (file, msg) => errors.push(`${file}: ${msg}`);

  for (const { file, version } of current()) {
    if (version !== expected) err(file, `version is ${version ?? '(missing)'}, expected ${expected}${stamped ? '' : ' (the committed placeholder; releases stamp the real version)'}`);
  }

  // Internal dependencies in every workspace manifest.
  const manifests = git(['ls-files', '--', 'package.json', '*/package.json']).split('\n').filter(Boolean);
  const workspace = new Set(npmPackages().map((p) => p.file));
  for (const file of manifests) {
    const pkg = JSON.parse(read(file));
    const published = workspace.has(file);
    for (const field of DEP_FIELDS) {
      for (const [name, spec] of Object.entries(pkg[field] || {})) {
        if (!NPM_NAME.test(name)) continue;
        if (published && spec !== 'workspace:*') err(file, `${field}.${name} is "${spec}"; internal dependencies of published packages must be "workspace:*" (packed as the exact release version)`);
        if (!published && /^[\^~<>=v]*\s*\d/.test(spec)) err(file, `${field}.${name} is "${spec}"; use "workspace:*", a file: link or "latest", not a typed version`);
      }
    }
  }

  const gemspec = read(GEM.gemspec);
  if (!/spec\.version\s*=\s*Voidable::Hotwire::VERSION\b/.test(gemspec)) err(GEM.gemspec, 'spec.version must be Voidable::Hotwire::VERSION');

  const composer = JSON.parse(read(COMPOSER.manifest));
  if ('version' in composer) err(COMPOSER.manifest, 'must not have a "version" field; Packagist reads the split repository tag');

  // No semver string literal anywhere in the gem's Ruby code except VERSION.
  for (const file of git(['ls-files', '--', `${GEM.dir}/lib`, `${GEM.dir}/config`, `${GEM.dir}/app`]).split('\n').filter(Boolean)) {
    const lines = read(file).split('\n');
    lines.forEach((l, i) => {
      if (file === GEM.versionFile && /^\s*VERSION = "/.test(l)) return;
      if (/["'](?!0\.0\.0["'])\d+\.\d+\.\d+["']/.test(l)) err(`${file}:${i + 1}`, `typed version in the gem: ${l.trim()}`);
    });
  }

  // Hand-typed versions in any tracked text file.
  for (const file of git(['ls-files']).split('\n').filter(Boolean)) {
    if (SKIP.some((re) => re.test(file))) continue;
    let text;
    try {
      text = read(file);
    } catch {
      continue; // deleted in the working tree
    }
    if (text.includes('\0')) continue;
    for (const h of scanText(text)) err(`${file}:${h.line}`, `${h.what}: "${h.match}"`);
  }

  if (!/files: ~w\([^)]*\bmix\.exs\b/.test(read(HEX.mixfile))) {
    // Not a version problem, but stamping relies on mix.exs travelling in the package.
    err(HEX.mixfile, 'package files must include mix.exs');
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--stamped');
  const stamped = i >= 0 ? process.argv[i + 1] : undefined;
  try {
    const errors = check({ stamped });
    if (errors.length) {
      for (const e of errors) console.error(`ERROR: ${e}`);
      console.error(`\nlint:versions: ${errors.length} problem(s). Voidable versions are computed at release; see CONTRIBUTING.md#releases.`);
      process.exit(1);
    }
    console.log(`lint:versions: OK (${stamped ? `stamped ${stamped}` : `placeholder ${PLACEHOLDER}`}, no hand-typed Voidable versions)`);
  } catch (e) {
    console.error(`lint:versions failed: ${e.message}`);
    process.exit(1);
  }
}
