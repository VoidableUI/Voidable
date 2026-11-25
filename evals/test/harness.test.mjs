// SPDX-License-Identifier: MIT
// Unit tests of the harness that need no API key, browser or voidable binary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAgent } from '../lib/agent.mjs';
import { loadCassette } from '../lib/cassette.mjs';
import { CONDITIONS, buildContext, userMessage } from '../lib/conditions.mjs';
import { FORMATS } from '../lib/formats.mjs';
import { adjust, cost, PRICES } from '../lib/report.mjs';
import { solutionPath } from '../lib/stub.mjs';
import { PILOT, loadTasks, validate } from '../lib/tasks.mjs';
import { injectHead } from '../lib/render.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'evals-test-'));

test('the task set is valid, spread over formats, and every task has a reference solution', async () => {
  const tasks = await loadTasks();
  assert.ok(tasks.length >= 25 && tasks.length <= 30, `${tasks.length} tasks`);
  const formats = new Set(tasks.map((t) => t.format));
  for (const f of ['html', 'react', 'erb', 'heex', 'blade', 'svelte']) assert.ok(formats.has(f), `no ${f} task`);
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length, 'duplicate task ids');
  for (const t of tasks) {
    assert.ok(existsSync(solutionPath(t)), `${t.id} has no reference solution`);
    assert.ok(t.checks.length >= 1, `${t.id} has no checks`);
    for (const c of t.components) assert.match(c, /^void-[a-z-]+$/, `${t.id}: component ${c}`);
  }
  for (const id of PILOT) assert.ok(tasks.some((t) => t.id === id), `pilot task ${id} missing`);
});

test('prompts carry no Voidable specifics', () => {
  assert.throws(() => validate({ id: 'x', title: 'x', format: 'html', components: [], prompt: 'use <void-input>', checks: [] }), /Voidable specifics/);
  assert.throws(() => validate({ id: 'x', title: 'x', format: 'html', components: [], prompt: 'ok', checks: [{ id: 'a11y', title: 't', run() {} }] }), /reserved/);
});

test('the none condition tells the agent only the package names', () => {
  const task = { id: 't', format: 'react', components: [], prompt: 'Build it.' };
  const { system, tools } = buildContext('none', task, { files: {}, log: [] });
  assert.deepEqual(tools.map((t) => t.name), ['write_file']);
  assert.match(system, /@voidable\/ui/);
  assert.doesNotMatch(system, /void-field|void-button|slot=|voidable_ref/);
  assert.match(userMessage(task), /Write it to `App\.tsx`/);
  assert.deepEqual(CONDITIONS, ['none', 'ref', 'skill']);
});

test('the stub agent runs through the SDK tool runner, records, and replays identically', async () => {
  const dir = tmp();
  const task = { id: 'smoke', format: 'html', components: ['void-button'], prompt: 'Make a button.', checks: [] };
  const cassette = join(dir, 'c.json');
  const rec = await runAgent({ task, condition: 'none', mode: 'stub', cassette, stubOptions: { solution: '<void-button>Hi</void-button>' } });
  assert.equal(rec.error, null);
  assert.equal(rec.output, '<void-button>Hi</void-button>');
  assert.equal(rec.turns, 2);
  assert.equal(rec.toolCalls, 1);
  assert.ok(rec.usage.input_tokens > 0);
  const saved = loadCassette(cassette);
  assert.equal(saved.entries.length, 2);
  assert.equal(saved.entries[0].request.model, 'claude-haiku-5-5');
  assert.equal(saved.entries[0].request.thread, undefined, 'the runner must send full history (thread: false)');
  assert.ok(!readFileSync(cassette, 'utf8').includes('offline'), 'the API key placeholder leaked into the cassette');
  const again = await runAgent({ task, condition: 'none', mode: 'replay', cassette });
  assert.equal(again.output, rec.output);
  assert.deepEqual(again.usage, rec.usage);
  assert.equal(again.turns, rec.turns);
});

test('replay fails loudly when the conversation diverges from the cassette', async () => {
  const dir = tmp();
  const task = { id: 'smoke', format: 'html', components: [], prompt: 'Make a button.', checks: [] };
  const cassette = join(dir, 'c.json');
  await runAgent({ task, condition: 'none', mode: 'stub', cassette, stubOptions: { solution: 'x' } });
  const short = loadCassette(cassette);
  short.entries.pop();
  const { saveCassette } = await import('../lib/cassette.mjs');
  saveCassette(cassette, short.meta, short.entries);
  const r = await runAgent({ task, condition: 'none', mode: 'replay', cassette });
  assert.match(r.error, /cassette exhausted/);
});

test('live mode refuses to run without ANTHROPIC_API_KEY', async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    await assert.rejects(runAgent({ task: { id: 't', format: 'html', components: [], prompt: 'x' }, condition: 'none', mode: 'live' }), /ANTHROPIC_API_KEY/);
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test('library-blocked assertions and library axe violations are not held against the agent', () => {
  const calibration = {
    tasks: { t: { failed: { 'needs-fix': 'reference fails too', a11y: 'library' } } },
    libraryAxe: ['aria-input-field-name|void-input'],
  };
  const rec = {
    task: 't',
    assertions: [
      { id: 'works', kind: 'functional', pass: true },
      { id: 'needs-fix', kind: 'functional', pass: false },
      { id: 'a11y', kind: 'a11y', pass: false },
    ],
    axe: [{ id: 'aria-input-field-name', impact: 'serious', nodes: ['x'], owners: ['void-input'] }],
  };
  const a = adjust(rec, calibration);
  assert.deepEqual(a.kept.map((x) => [x.id, x.pass]), [['works', true], ['a11y', true]]);
  assert.equal(a.adjPass, true);
  const own = adjust({ ...rec, axe: [...rec.axe, { id: 'image-alt', impact: 'critical', nodes: ['img'], owners: [null] }] }, calibration);
  assert.equal(own.adjPass, false, 'a violation in page markup still counts');
});

test('cost uses the price table, with cache writes at 1.25x input', () => {
  for (const m of ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-2']) assert.ok(PRICES[m], m);
  assert.equal(cost('claude-sonnet-5-5', { input_tokens: 1e6, output_tokens: 1e6 }), 12);
  assert.equal(cost('claude-sonnet-5-5', { cache_creation_input_tokens: 1e6 }), 2.5);
  assert.equal(cost('unknown-model', {}), null);
});

test('every format names its file and setup without Voidable API details', () => {
  for (const [id, f] of Object.entries(FORMATS)) {
    assert.ok(f.file && f.setup && f.label, id);
    assert.doesNotMatch(f.setup, /<void-[a-z]|slot=/, `${id} setup leaks Voidable markup`);
  }
});

test('injectHead puts the library before the agent’s own head content', () => {
  const out = injectHead('<!doctype html><html><head><title>x</title></head><body></body></html>');
  assert.ok(out.indexOf('/__eval/ui.js') < out.indexOf('<title>x</title>'));
  assert.match(injectHead('<p>fragment</p>'), /<body>\n<p>fragment<\/p>/);
});
