// SPDX-License-Identifier: MIT
// Orchestrate a run: every (model, condition, task, repetition) case gets an
// agent attempt and a score. Results stream to results.jsonl so an
// interrupted run keeps what it finished and `--resume` skips those cases.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent } from './agent.mjs';
import { launch, startServer } from './browser.mjs';
import { FORMATS } from './formats.mjs';
import { RUNS } from './paths.mjs';
import { scoreCase } from './score.mjs';
import * as voidable from './voidable.mjs';

export const caseKey = (c) => `${c.model}__${c.condition}__${c.task.id}__r${c.rep}`;

export function readResults(runDir) {
  const f = join(runDir, 'results.jsonl');
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

async function pool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * @param {object} o
 * @param {object[]} o.tasks
 * @param {string[]} o.conditions
 * @param {string[]} o.models
 * @param {number} o.reps
 * @param {'live'|'replay'|'stub'} o.mode
 * @param {string} o.runId
 * @param {string} [o.from] run directory whose cassettes to replay
 * @param {string} [o.effort]
 * @param {number} [o.concurrency]
 * @param {boolean} [o.resume]
 * @param {(line: string) => void} [o.log]
 */
export async function runEval(o) {
  voidable.assertBinary();
  const log = o.log || ((l) => process.stdout.write(l + '\n'));
  const runDir = join(RUNS, o.runId);
  mkdirSync(join(runDir, 'cases'), { recursive: true });
  const meta = {
    runId: o.runId,
    startedAt: new Date().toISOString(),
    mode: o.mode,
    replayOf: o.from || null,
    models: o.models,
    conditions: o.conditions,
    reps: o.reps,
    effort: o.effort || 'medium',
    tasks: o.tasks.map((t) => t.id),
    voidable: voidable.version(),
  };
  writeFileSync(join(runDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  const done = new Set(o.resume ? readResults(runDir).map((r) => r.key) : []);

  const cases = [];
  for (const model of o.models)
    for (const condition of o.conditions)
      for (const task of o.tasks)
        for (let rep = 1; rep <= o.reps; rep++) cases.push({ model, condition, task, rep });
  const todo = cases.filter((c) => !done.has(caseKey(c)));
  log(`${o.runId}: ${todo.length} case(s) (${cases.length - todo.length} already done), mode ${o.mode}`);

  const server = await startServer(join(runDir, 'cases'));
  const browser = await launch();
  const cache = {};
  let n = 0;
  try {
    await pool(todo, o.concurrency || 4, async (c) => {
      const key = caseKey(c);
      const cassette = o.mode === 'replay' ? join(o.from, 'cassettes', `${key}.json`) : join(runDir, 'cassettes', `${key}.json`);
      let agent;
      try {
        agent = await runAgent({ task: c.task, condition: c.condition, model: c.model, mode: o.mode, cassette, effort: o.effort, cache });
      } catch (e) {
        agent = { model: c.model, mode: o.mode, output: null, error: String(e.message || e), usage: {}, turns: 0, toolCalls: 0, toolLog: [] };
      }
      const ext = (c.task.file || FORMATS[c.task.format].file).replace(/^[^.]*/, '');
      if (agent.output != null) {
        mkdirSync(join(runDir, 'outputs'), { recursive: true });
        writeFileSync(join(runDir, 'outputs', `${key}${ext}`), agent.output);
      }
      let score;
      try {
        score = await scoreCase({ task: c.task, source: agent.output, caseDir: join(runDir, 'cases', key), casesRoot: join(runDir, 'cases'), server, browser });
      } catch (e) {
        score = { assertions: [{ id: 'harness', kind: 'harness', pass: false, detail: String(e.stack || e).slice(0, 600) }], pass: false, rate: 0, passed: 0, total: 1, findings: [], usedTags: [] };
      }
      const { output, ...agentRest } = agent;
      const rec = {
        key,
        task: c.task.id,
        format: c.task.format,
        components: c.task.components,
        condition: c.condition,
        model: c.model,
        rep: c.rep,
        agent: agentRest,
        ...score,
      };
      appendFileSync(join(runDir, 'results.jsonl'), JSON.stringify(rec) + '\n');
      n++;
      const failed = score.assertions.filter((a) => !a.pass).map((a) => a.id);
      log(`[${n}/${todo.length}] ${key}: ${score.passed}/${score.total}${failed.length ? ` failed ${failed.join(',')}` : ''}${agent.error ? ` (agent: ${agent.error})` : ''}`);
    });
  } finally {
    await browser.close();
    await server.close();
  }
  meta.finishedAt = new Date().toISOString();
  writeFileSync(join(runDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  return runDir;
}
