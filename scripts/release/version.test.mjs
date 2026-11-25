// SPDX-License-Identifier: MIT
// Run with: mise run release:test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bump, checkBootstrap, classify, legacyTags, levelOf } from './version.mjs';

// Headers and footers of the four commits on fix/final-review-blockers that
// carry breaking markers (f3fc199, 34af632, e898fdd, 8f5d862).
const BREAKING_ON_BRANCH = [
  'fix(ui,liveview)!: kebab-case attributes for seven camelCase properties (#40)\n\nBody.\n\nBREAKING CHANGE: the lowercased attributes collapsedwidth, showvalue,\nshowinput are no longer read.\n',
  'feat(ui,liveview)!: closable="false" turns off dialog and drawer closing\n\nBREAKING CHANGE: closable is now a tri-state.\n',
  'feat(hotwire)!: remove the deprecated VoidEventController\n\nBREAKING CHANGE: use the voidable controller.\n',
  'fix(ui)!: native-backed hosts are not form-associated; mirror native reset\n\nBREAKING CHANGE: void-radio value defaults to "on" (was "").\n\nRefs #5\n',
];

test('feat is minor, fix/perf/revert are patch', () => {
  assert.equal(classify('feat: add void-dialog'), 'minor');
  assert.equal(classify('feat(ui): add void-dialog'), 'minor');
  assert.equal(classify('fix(theme): contrast'), 'patch');
  assert.equal(classify('perf(ui): faster render'), 'patch');
  assert.equal(classify('revert: feat(ui): add x'), 'patch');
});

test('non-releasing types and free-form messages give nothing', () => {
  for (const m of ['chore: deps', 'docs: typo', 'ci: pin actions', 'test(ui): more', 'refactor: x', 'style: x', 'build: x',
    'Merge pull request #1 from x/y', 'WIP', 'feat:missing space', 'feat(ui) add x', '']) {
    assert.equal(classify(m), null, m);
  }
});

test('bang headers are breaking, including type(scope)!: with commas in the scope', () => {
  assert.equal(classify('feat!: drop x'), 'major');
  assert.equal(classify('fix(ui,liveview)!: kebab'), 'major');
  assert.equal(classify('chore(deps)!: drop node 18'), 'major');
});

test('BREAKING CHANGE and BREAKING-CHANGE footers are breaking on any type', () => {
  assert.equal(classify('fix: x\n\nBREAKING CHANGE: y'), 'major');
  assert.equal(classify('docs: x\n\nBREAKING-CHANGE: y'), 'major');
  // Only a footer at the start of a line counts, not a mention in prose.
  assert.equal(classify('fix: x\n\nThis is not a BREAKING CHANGE: really'), 'patch');
  // The repo's own "Breaking (0.x):" body note is informational, not a marker.
  assert.equal(classify('feat(ui): x\n\nBreaking (0.x): renamed y'), 'minor');
});

test('the four breaking commits on this branch are breaking', () => {
  for (const m of BREAKING_ON_BRANCH) assert.equal(classify(m), 'major', m.split('\n')[0]);
  assert.equal(levelOf(BREAKING_ON_BRANCH), 'major');
});

test('breaking changes bump the minor while major is 0, never reaching 1.0.0', () => {
  assert.equal(bump('0.8.0', 'major'), '0.9.0');
  assert.equal(bump('0.8.3', 'major'), '0.9.0');
  assert.equal(bump('0.99.0', 'major'), '0.100.0');
  assert.equal(bump('0.8.0', levelOf(BREAKING_ON_BRANCH)), '0.9.0');
});

test('ordinary bumps', () => {
  assert.equal(bump('0.8.0', 'minor'), '0.9.0');
  assert.equal(bump('0.8.0', 'patch'), '0.8.1');
  assert.equal(bump('0.8.4', 'minor'), '0.9.0');
  assert.equal(bump('1.2.3', 'major'), '2.0.0');
  assert.equal(bump('1.2.3', 'minor'), '1.3.0');
});

test('highest level wins', () => {
  assert.equal(levelOf(['fix: a', 'chore: b']), 'patch');
  assert.equal(levelOf(['fix: a', 'feat: b', 'docs: c']), 'minor');
  assert.equal(levelOf(['fix: a', 'feat: b', 'refactor!: c']), 'major');
  assert.equal(levelOf(['chore: a', 'docs: b']), null);
  assert.equal(levelOf([]), null);
});

test('legacy per-package tags are recognised; unified and odd tags are not', () => {
  const tags = legacyTags(['ui-v0.6.1', 'gem-hotwire-v0.7.2', 'ui-react-v0.4.4', 'v0.8.0', 'composer-alpine-v0.1.0', 'ui-v0.6.1-rc.1', 'random']);
  assert.deepEqual(tags.map((t) => t.tag), ['ui-v0.6.1', 'gem-hotwire-v0.7.2', 'ui-react-v0.4.4', 'composer-alpine-v0.1.0']);
});

test('bootstrap must exceed every legacy tag', () => {
  assert.equal(checkBootstrap(['ui-v0.6.1', 'theme-v0.7.0', 'gem-hotwire-v0.7.2'], '0.8.0').tag, 'gem-hotwire-v0.7.2');
  assert.throws(() => checkBootstrap(['ui-v0.6.1', 'theme-v0.8.0'], '0.8.0'), /not above/);
  assert.throws(() => checkBootstrap(['gem-hotwire-v0.9.1'], '0.8.0'), /not above/);
  assert.equal(checkBootstrap([], '0.8.0'), null);
});
