// SPDX-License-Identifier: MIT
//
// Shared facts about what Voidable releases. Every package shares one version
// number; this module knows where each ecosystem keeps it.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The first unified release. Used only while no `vX.Y.Z` tag exists.
export const BOOTSTRAP_VERSION = '0.8.0';

// Placeholder committed in every manifest. Real versions are stamped at release.
export const PLACEHOLDER = '0.0.0';

export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

// Paths whose changes can produce a release (git pathspecs). Matches the old
// per-package workflows: anything under a package directory, plus the release
// workflow itself. Storybook, the placeholder `voidable` gem and the demo
// apps (packages/*/demo, demo-vite: none is published or deployed) are not
// released, so changes there alone do not count.
export const RELEASE_PATHSPECS = [
  'packages',
  ':(exclude)packages/storybook',
  ':(exclude)packages/voidable-gem',
  ':(exclude,glob)packages/*/demo*/**',
  '.github/workflows/release.yml',
];

// Paths whose changes redeploy the docs site and Storybook even without a release.
export const PAGES_PATHSPECS = ['docs', 'packages/storybook'];

export const CORE = ['@voidable/theme', '@voidable/ui'];

/** Publishable npm packages: every non-private packages/*\/package.json. */
export function npmPackages() {
  const out = [];
  for (const dir of readdirSync(join(ROOT, 'packages')).sort()) {
    const file = join(ROOT, 'packages', dir, 'package.json');
    if (!existsSync(file)) continue;
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    if (pkg.private) continue;
    out.push({ name: pkg.name, dir: `packages/${dir}`, file: `packages/${dir}/package.json`, pkg });
  }
  // Theme first, then core, then adapters alphabetically.
  const rank = (n) => (CORE.includes(n) ? CORE.indexOf(n) : CORE.length);
  return out.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}

export const GEM = {
  name: 'voidable-hotwire',
  dir: 'packages/hotwire/gem',
  versionFile: 'packages/hotwire/gem/lib/voidable/hotwire/version.rb',
  gemspec: 'packages/hotwire/gem/voidable-hotwire.gemspec',
};

export const HEX = {
  name: 'live_voidable',
  dir: 'packages/liveview/hex',
  mixfile: 'packages/liveview/hex/mix.exs',
};

export const COMPOSER = {
  name: 'voidable/laravel',
  dir: 'packages/alpine/laravel',
  manifest: 'packages/alpine/laravel/composer.json',
  splitRepo: 'VoidableUI/laravel',
};

// The repository the git helpers read. Tests point it at a scratch repository.
export const GIT_DIR = process.env.VOIDABLE_RELEASE_GIT_DIR || ROOT;

export function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: GIT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

export function tryGit(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

export function parse(v) {
  const m = SEMVER.exec(v);
  if (!m) throw new Error(`not a semantic version: ${v}`);
  return m.slice(1).map(Number);
}

export function compare(a, b) {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

export function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}
