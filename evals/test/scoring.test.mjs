// SPDX-License-Identifier: MIT
// The scorer must pass a correct page and fail the plausible-but-wrong ones
// agents write. Runs in Chromium; skipped when Chromium, the built library or
// the voidable binary is missing (run `mise run evals:setup`).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, VOIDABLE_BIN } from '../lib/paths.mjs';
import { chromiumPath, launch, startServer } from '../lib/browser.mjs';
import { scoreCase } from '../lib/score.mjs';
import { readSolution } from '../lib/stub.mjs';
import { loadTasks } from '../lib/tasks.mjs';

const missing = [
  !existsSync(VOIDABLE_BIN) && 'voidable binary',
  !existsSync(join(ROOT, 'packages/ui/dist/index.js')) && 'built @voidable/ui',
  !chromiumPath() && !process.env.PLAYWRIGHT_BROWSERS_PATH && 'Chromium',
].filter(Boolean);
const skip = missing.length ? `needs ${missing.join(', ')} (mise run evals:setup)` : false;

let server, browser, root, tasks;
before(async () => {
  if (skip) return;
  root = mkdtempSync(join(tmpdir(), 'evals-score-'));
  server = await startServer(root);
  browser = await launch();
  tasks = Object.fromEntries((await loadTasks(['sign-in-html', 'confirm-dialog-html'])).map((t) => [t.id, t]));
});
after(async () => {
  await browser?.close();
  await server?.close();
});

let n = 0;
const score = (task, source) => scoreCase({ task, source, caseDir: join(root, `c${++n}`), casesRoot: root, server, browser });
const failed = (s) => s.assertions.filter((a) => !a.pass).map((a) => a.id).sort();

test('the sign-in reference solution passes every functional check', { skip }, async () => {
  const s = await score(tasks['sign-in-html'], readSolution(tasks['sign-in-html']));
  assert.deepEqual(failed(s).filter((id) => id !== 'a11y'), []);
  assert.deepEqual(s.findings, []);
  assert.ok(s.usedTags.includes('void-field'));
});

test('label on the input and color="primary" are caught statically and functionally', { skip }, async () => {
  const wrong = readSolution(tasks['sign-in-html'])
    .replace(/<void-field label="Email">\s*<void-input/, '<void-input label="Email"')
    .replace(/<\/void-input>\s*<\/void-field>/, '</void-input>')
    .replace('variant="filled">Sign in', 'color="primary">Sign in');
  const s = await score(tasks['sign-in-html'], wrong);
  const rules = s.findings.map((f) => `${f.rule} ${f.tag} ${f.attr}`);
  assert.ok(rules.includes('unknown-attribute void-input label'), rules.join('; '));
  assert.ok(rules.includes('invalid-value void-button color'), rules.join('; '));
  assert.ok(failed(s).includes('static'));
  assert.ok(failed(s).includes('labelled-fields'), `failed: ${failed(s)}`);
});

test('open="false" leaves the dialog open, which the checks see', { skip }, async () => {
  const wrong = readSolution(tasks['confirm-dialog-html']).replace('<void-dialog id="confirm"', '<void-dialog id="confirm" open="false"');
  const s = await score(tasks['confirm-dialog-html'], wrong);
  assert.ok(s.findings.some((f) => f.rule === 'boolean-false'), JSON.stringify(s.findings));
  assert.ok(failed(s).length > 1, `failed: ${failed(s)}`);
});

test('a page that throws is scored as a console failure', { skip }, async () => {
  const s = await score(tasks['confirm-dialog-html'], readSolution(tasks['confirm-dialog-html']).replace("const trigger = document.getElementById('delete-trigger');", "const trigger = document.getElementById('delete-trigger'); null.boom;"));
  assert.ok(failed(s).includes('console'));
  assert.ok(failed(s).includes('opens-modal'));
});
