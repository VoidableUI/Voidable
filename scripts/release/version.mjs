#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Decides whether a commit releases and at which unified version.
//
//   node scripts/release/version.mjs plan     # key=value lines (GITHUB_OUTPUT format)
//   node scripts/release/version.mjs next     # just the version
//
// Rules (conventional commits since the last `vX.Y.Z` tag, counting only
// commits that touch RELEASE_PATHSPECS):
//   feat                         -> minor
//   fix, perf, revert            -> patch
//   `type!:` or BREAKING CHANGE  -> major, but minor while the major is 0
//   anything else                -> no release
// With no `vX.Y.Z` tag at all, the version is BOOTSTRAP_VERSION, which must
// be above every legacy per-package tag. When HEAD already carries a
// `vX.Y.Z` tag (a re-run after a partial failure) that version is reused.
import { appendFileSync } from 'node:fs';
import {
  BOOTSTRAP_VERSION,
  PAGES_PATHSPECS,
  RELEASE_PATHSPECS,
  SEMVER,
  compare,
  git,
  parse,
  tryGit,
} from './lib.mjs';

const RANK = { patch: 1, minor: 2, major: 3 };
const HEADER = /^(?<type>[A-Za-z]+)(?:\((?<scope>[^()\r\n]*)\))?(?<bang>!)?: \S/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE: /m;

/** Release level of one commit message, or null if it does not release. */
export function classify(message) {
  const [header, ...body] = message.replace(/\r\n/g, '\n').split('\n');
  const m = HEADER.exec(header);
  if (!m) return null;
  if (m.groups.bang || BREAKING_FOOTER.test(body.join('\n'))) return 'major';
  const type = m.groups.type.toLowerCase();
  if (type === 'feat') return 'minor';
  if (type === 'fix' || type === 'perf' || type === 'revert') return 'patch';
  return null;
}

/** Highest level among messages, or null. */
export function levelOf(messages) {
  let level = null;
  for (const msg of messages) {
    const l = classify(msg);
    if (l && (!level || RANK[l] > RANK[level])) level = l;
  }
  return level;
}

/** Apply a level to a version. While major is 0, a breaking change bumps the minor. */
export function bump(version, level) {
  const [major, minor, patch] = parse(version);
  if (level === 'major' && major === 0) level = 'minor';
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  if (level === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`unknown level: ${level}`);
}

/** Legacy per-package tags such as `ui-v0.6.1`, as { tag, prefix, version }. */
export function legacyTags(tagList) {
  const out = [];
  for (const tag of tagList) {
    const m = /^([a-z][a-z-]*)-v(\d+\.\d+\.\d+)$/.exec(tag);
    if (m) out.push({ tag, prefix: m[1], version: m[2] });
  }
  return out;
}

/** Check that BOOTSTRAP_VERSION is above every legacy tag. Returns the highest legacy tag. */
export function checkBootstrap(tagList, bootstrap = BOOTSTRAP_VERSION) {
  const legacy = legacyTags(tagList);
  let max = null;
  for (const t of legacy) if (!max || compare(t.version, max.version) > 0) max = t;
  if (max && compare(bootstrap, max.version) <= 0) {
    throw new Error(`bootstrap version ${bootstrap} is not above existing tag ${max.tag}`);
  }
  return max;
}

function unifiedTagsAt(ref) {
  return (tryGit(['tag', '--points-at', ref, '--list', 'v*']) || '')
    .split('\n')
    .filter((t) => SEMVER.test(t.slice(1)))
    .sort((a, b) => compare(b.slice(1), a.slice(1)));
}

function lastUnifiedTag(ref) {
  // Nearest reachable vX.Y.Z tag, ignoring anything that is not strict semver.
  let candidate = ref;
  for (;;) {
    const t = tryGit(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*.[0-9]*.[0-9]*', candidate]);
    if (!t) return null;
    if (SEMVER.test(t.slice(1))) return t;
    candidate = `${t}^`;
  }
}

function messagesSince(tag, head) {
  const raw = git(['log', '--no-merges', '--full-history', '--format=%B%x1e', `${tag}..${head}`, '--', ...RELEASE_PATHSPECS]);
  return raw.split('\x1e').map((s) => s.trim()).filter(Boolean);
}

function touched(before, head, pathspecs) {
  // An unknown "before" (new branch, force push, shallow history) counts as changed.
  if (!before || /^0+$/.test(before) || tryGit(['cat-file', '-e', `${before}^{commit}`]) === null) return true;
  return git(['diff', '--name-only', before, head, '--', ...pathspecs]) !== '';
}

/**
 * Plan a release for `head`.
 * @param {{head?: string, before?: string}} opts  before: the commit before the push, for docs-only deploys
 */
export function plan({ head = 'HEAD', before } = {}) {
  const sha = git(['rev-parse', head]);
  const atHead = unifiedTagsAt(sha);
  const allTags = (tryGit(['tag', '--list']) || '').split('\n').filter(Boolean);
  const out = { sha, release: false, version: '', tag: '', previous_tag: '', reason: '' };

  if (atHead.length) {
    out.tag = atHead[0];
    out.version = out.tag.slice(1);
    out.release = true;
    out.reason = `${out.tag} already points at this commit; resuming`;
    out.previous_tag = lastUnifiedTag(`${sha}^`) || legacyPrevious(`${sha}^`) || '';
  } else {
    const last = lastUnifiedTag(sha);
    if (!last) {
      const max = checkBootstrap(allTags);
      out.version = BOOTSTRAP_VERSION;
      out.release = true;
      out.reason = `no vX.Y.Z tag yet: first unified release (highest legacy tag ${max ? max.tag : 'none'})`;
      out.previous_tag = legacyPrevious(sha) || '';
    } else {
      const level = levelOf(messagesSince(last, sha));
      out.previous_tag = last;
      out.release = level !== null;
      // A candidate version is always computed so a dry run can pack something.
      out.version = bump(last.slice(1), level || 'patch');
      out.reason = level
        ? `${level} bump from ${last}`
        : `no releasing commits under package paths since ${last}`;
    }
    out.tag = `v${out.version}`;
  }

  out.pages_changed = before === undefined ? false : touched(before, sha, PAGES_PATHSPECS);
  return out;
}

/** Most recent legacy per-package tag reachable from ref (for the first release's notes). */
function legacyPrevious(ref) {
  return tryGit(['describe', '--tags', '--abbrev=0', '--match', '*-v[0-9]*', ref]);
}

function main() {
  const [cmd = 'plan', ...rest] = process.argv.slice(2);
  const opt = (name) => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const p = plan({ head: opt('--head') || 'HEAD', before: opt('--before') });
  if (cmd === 'next') {
    process.stdout.write(`${p.version}\n`);
    return;
  }
  if (cmd !== 'plan') throw new Error(`unknown command ${cmd}`);
  const lines = Object.entries(p).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  process.stdout.write(lines);
  const file = opt('--github-output');
  if (file) appendFileSync(file, lines);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (e) {
    console.error(`release plan failed: ${e.message}`);
    process.exit(1);
  }
}
