// SPDX-License-Identifier: MIT
// plan() against scratch git repositories. Run with: mise run release:test
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scratch = [];
after(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

function scratchRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'voidable-release-'));
  scratch.push(dir);
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
  const run = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', env }).trim();
  run('init', '-q', '-b', 'master');
  run('config', 'user.email', 't@example.com');
  run('config', 'user.name', 'T');
  run('config', 'commit.gpgsign', 'false');
  run('config', 'tag.gpgsign', 'false');
  let n = 0;
  const commit = (path, message) => {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), String(n++));
    run('add', '-A');
    run('commit', '-q', '-m', message);
    return run('rev-parse', 'HEAD');
  };
  return { dir, run, commit };
}

function planIn(dir, args = []) {
  const out = execFileSync('node', [join(here, 'version.mjs'), 'plan', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, VOIDABLE_RELEASE_GIT_DIR: dir },
  });
  return Object.fromEntries(out.trim().split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2)));
}

test('bootstrap to 0.8.0 when only legacy per-package tags exist', () => {
  const r = scratchRepo();
  r.commit('packages/ui/a', 'feat(ui): a');
  r.run('tag', 'ui-v0.6.1');
  r.run('tag', 'gem-hotwire-v0.7.2');
  r.commit('packages/ui/b', 'fix(ui)!: b\n\nBREAKING CHANGE: c');
  const p = planIn(r.dir);
  assert.equal(p.release, 'true');
  assert.equal(p.version, '0.8.0');
  assert.equal(p.tag, 'v0.8.0');
  assert.match(p.previous_tag, /-v0\.\d\.\d$/);
});

test('bootstrap refuses when a legacy tag is already at 0.8.0', () => {
  const r = scratchRepo();
  r.commit('packages/ui/a', 'feat(ui): a');
  r.run('tag', 'theme-v0.8.0');
  assert.throws(() => planIn(r.dir), /not above/);
});

test('bumps from the last unified tag, counting only package paths', () => {
  const r = scratchRepo();
  r.commit('packages/ui/a', 'feat(ui): a');
  r.run('tag', 'v0.8.0');
  r.commit('docs/x.mdx', 'feat(docs): docs-only feature');
  r.commit('packages/storybook/y', 'feat(storybook): not released');
  r.commit('.github/workflows/ci.yml', 'fix(ci): not released');
  r.commit('packages/react/c', 'chore(react): not a releasing type');
  let p = planIn(r.dir);
  assert.equal(p.release, 'false');
  assert.equal(p.previous_tag, 'v0.8.0');
  assert.equal(p.version, '0.8.1'); // candidate, used only by a dry run

  r.commit('packages/theme/z', 'fix(theme): z');
  p = planIn(r.dir);
  assert.equal(p.release, 'true');
  assert.equal(p.version, '0.8.1');

  r.commit('packages/ui/f', 'feat(ui): f');
  assert.equal(planIn(r.dir).version, '0.9.0');

  r.commit('packages/hotwire/gem/w', 'fix(hotwire)!: w');
  assert.equal(planIn(r.dir).version, '0.9.0');

  r.commit('.github/workflows/release.yml', 'fix(ci): release workflow counts');
  assert.equal(planIn(r.dir).release, 'true');
});

test('a commit that already carries its tag resumes at that version', () => {
  const r = scratchRepo();
  r.commit('packages/ui/a', 'feat(ui): a');
  r.run('tag', 'v0.8.0');
  r.commit('packages/ui/b', 'feat(ui): b');
  r.run('tag', 'v0.9.0');
  const p = planIn(r.dir);
  assert.equal(p.release, 'true');
  assert.equal(p.version, '0.9.0');
  assert.equal(p.previous_tag, 'v0.8.0');
  assert.match(p.reason, /resuming/);
});

test('non-semver v tags are ignored', () => {
  const r = scratchRepo();
  r.commit('packages/ui/a', 'feat(ui): a');
  r.run('tag', 'v0.8.0');
  r.commit('packages/ui/b', 'fix(ui): b');
  r.run('tag', 'v1-experiment');
  const p = planIn(r.dir);
  assert.equal(p.previous_tag, 'v0.8.0');
  assert.equal(p.version, '0.8.1');
});

test('pages_changed follows docs and storybook paths in the push', () => {
  const r = scratchRepo();
  const a = r.commit('packages/ui/a', 'feat(ui): a');
  r.run('tag', 'v0.8.0');
  const b = r.commit('docs/page.mdx', 'docs: page');
  assert.equal(planIn(r.dir, ['--before', a]).pages_changed, 'true');
  r.commit('packages/react/x', 'chore(react): x');
  assert.equal(planIn(r.dir, ['--before', b]).pages_changed, 'false');
  assert.equal(planIn(r.dir, ['--before', '0000000000000000000000000000000000000000']).pages_changed, 'true');
});
