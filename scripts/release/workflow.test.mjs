// SPDX-License-Identifier: MIT
// The shape of the release workflow's job graph. The voidable binaries are an
// addition that must never gate, delay or roll back a package publish, so the
// graph is pinned here: the package jobs keep exactly the needs they had, and
// nothing depends on the binary jobs. Run with: mise run release:test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'workflows', 'release.yml');
const text = readFileSync(file, 'utf8');

/** Jobs of the workflow: { name: { needs: [...], text } }. A line-based reading is enough: the file is regular. */
function jobs() {
  const body = text.slice(text.indexOf('\njobs:\n') + 6);
  const out = {};
  let cur = null;
  for (const line of body.split('\n')) {
    const head = /^ {2}([a-z][a-z0-9-]*):\s*$/.exec(line);
    if (head) {
      cur = { name: head[1], needs: [], text: '' };
      out[cur.name] = cur;
    }
    if (!cur) continue;
    cur.text += `${line}\n`;
    const needs = /^ {4}needs: \[([^\]]*)\]\s*$/.exec(line);
    if (needs) cur.needs = needs[1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

const J = jobs();
const BINARY_JOBS = ['binaries', 'binaries-attach'];

function ancestors(name, seen = new Set()) {
  for (const n of J[name].needs) {
    if (!seen.has(n)) {
      seen.add(n);
      ancestors(n, seen);
    }
  }
  return seen;
}

test('the publishing jobs keep the needs they had', () => {
  assert.deepEqual(J.tag.needs, ['plan', 'ci']);
  assert.deepEqual(J['npm-core'].needs, ['plan', 'tag']);
  assert.deepEqual(J['npm-adapters'].needs, ['plan', 'npm-core']);
  assert.deepEqual(J.gem.needs, ['plan', 'npm-adapters']);
  assert.deepEqual(J.hex.needs, ['plan', 'npm-adapters']);
  assert.deepEqual(J.composer.needs, ['plan', 'npm-adapters']);
  assert.deepEqual(J['github-release'].needs, ['plan', 'npm-core', 'npm-adapters', 'gem', 'hex', 'composer']);
  assert.deepEqual(J['pages-build'].needs, ['plan', 'ci', 'github-release']);
  assert.deepEqual(J['pages-deploy'].needs, ['plan', 'pages-build']);
});

test('no job but the binary jobs depends, directly or not, on a binary job', () => {
  for (const name of Object.keys(J)) {
    if (BINARY_JOBS.includes(name)) continue;
    const up = ancestors(name);
    for (const b of BINARY_JOBS) assert.ok(!up.has(b), `${name} depends on ${b}`);
  }
});

test('binaries starts beside npm-core: it needs only plan and tag', () => {
  assert.deepEqual(J.binaries.needs, ['plan', 'tag']);
  assert.ok(!ancestors('binaries').has('npm-core'));
});

test('binaries-attach waits for the release and the build, and runs only when both succeeded', () => {
  assert.deepEqual(J['binaries-attach'].needs.slice().sort(), ['binaries', 'github-release', 'plan']);
  assert.match(J['binaries-attach'].text, /!cancelled\(\)/);
  assert.match(J['binaries-attach'].text, /needs\.github-release\.result == 'success'/);
  assert.match(J['binaries-attach'].text, /needs\.binaries\.result == 'success'/);
});

test('the release job does not download the binaries artifact', () => {
  assert.match(J['github-release'].text, /pattern: release-\*/);
  assert.match(J.binaries.text, /name: binaries-dist/);
  assert.doesNotMatch(J.binaries.text, /name: release-/);
});

test('only the binaries job may write attestations, and upload only the attach job writes contents', () => {
  for (const [name, job] of Object.entries(J)) {
    if (name !== 'binaries') assert.doesNotMatch(job.text, /attestations: write/, name);
  }
  assert.match(J.binaries.text, /id-token: write/);
  assert.match(J.binaries.text, /attestations: write/);
  assert.match(J.binaries.text, /contents: read/);
  assert.doesNotMatch(J.binaries.text, /contents: write/);
  assert.match(J['binaries-attach'].text, /contents: write/);
  assert.doesNotMatch(J['binaries-attach'].text, /id-token/);
});

test('every action is pinned to a commit SHA with a version comment', () => {
  const uses = [...text.matchAll(/^\s*(?:- )?uses: (\S+)(.*)$/gm)].filter((m) => !m[1].startsWith('./'));
  assert.ok(uses.length > 10);
  for (const [, ref, rest] of uses) {
    assert.match(ref, /@[0-9a-f]{40}$/, `${ref} is not pinned to a SHA`);
    assert.match(rest, /# \S+/, `${ref} has no version comment`);
  }
});
