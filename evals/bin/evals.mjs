#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Agent-friendliness evals for Voidable. See evals/README.md.
//
//   evals.mjs run [--tasks pilot|id,...] [--conditions none,ref,skill] [--models m,...]
//                 [--reps 3] [--mode live|stub|replay] [--from <run dir>] [--effort medium]
//                 [--concurrency 4] [--run-id <id>] [--resume]
//   evals.mjs report <run dir>... [--baseline]      write results.json + summary.md (and update the baseline)
//   evals.mjs estimate <run dir> [--tasks all] [--reps 3] [--models m,...]
//   evals.mjs calibrate [--tasks ...]               score the reference solutions
//   evals.mjs list                                  print the task set
//   evals.mjs contract                              rewrite CONTRACT.md from contract/contract.mjs
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DEFAULT_MODEL } from '../lib/agent.mjs';
import { calibrate } from '../lib/calibrate.mjs';
import { CONDITIONS } from '../lib/conditions.mjs';
import { estimate, writeReport } from '../lib/report.mjs';
import { RUNS } from '../lib/paths.mjs';
import { runEval } from '../lib/run.mjs';
import { loadTasks } from '../lib/tasks.mjs';

const list = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : undefined);
const [cmd, ...rest] = process.argv.slice(2);
const { values: v, positionals } = parseArgs({
  args: rest,
  allowPositionals: true,
  options: {
    tasks: { type: 'string' },
    conditions: { type: 'string' },
    models: { type: 'string' },
    reps: { type: 'string' },
    mode: { type: 'string' },
    from: { type: 'string' },
    effort: { type: 'string' },
    concurrency: { type: 'string' },
    'run-id': { type: 'string' },
    resume: { type: 'boolean' },
    baseline: { type: 'boolean' },
    label: { type: 'string' },
  },
});
const runDirOf = (p) => (existsSync(p) ? resolve(p) : join(RUNS, p));

switch (cmd) {
  case 'run': {
    const mode = v.mode || (process.env.ANTHROPIC_API_KEY ? 'live' : 'stub');
    if (mode === 'live' && !process.env.ANTHROPIC_API_KEY) throw new Error('--mode live needs ANTHROPIC_API_KEY');
    if (mode === 'replay' && !v.from) throw new Error('--mode replay needs --from <run dir>');
    const tasks = await loadTasks(list(v.tasks));
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const runId = v['run-id'] || `${stamp}-${mode}`;
    const runDir = await runEval({
      tasks,
      conditions: list(v.conditions) || CONDITIONS,
      models: list(v.models) || [DEFAULT_MODEL],
      reps: Number(v.reps || 1),
      mode,
      from: v.from ? runDirOf(v.from) : undefined,
      effort: v.effort,
      concurrency: Number(v.concurrency || 4),
      runId,
      resume: v.resume,
    });
    const { summaryPath } = writeReport([runDir], { label: v.label });
    console.log(`\nresults: ${runDir}\nsummary: ${summaryPath}`);
    break;
  }
  case 'report': {
    if (!positionals.length) throw new Error('report needs at least one run directory');
    const { summaryPath, jsonPath } = writeReport(positionals.map(runDirOf), { baseline: v.baseline, label: v.label });
    console.log(`summary: ${summaryPath}\nresults: ${jsonPath}`);
    break;
  }
  case 'estimate': {
    if (!positionals.length) throw new Error('estimate needs a run directory');
    const all = await loadTasks(list(v.tasks) || []);
    console.log(estimate(runDirOf(positionals[0]), { tasks: all.length, reps: Number(v.reps || 3), models: list(v.models), conditions: list(v.conditions) || CONDITIONS }));
    break;
  }
  case 'calibrate': {
    const res = await calibrate(await loadTasks(list(v.tasks)), { write: !v.tasks });
    const bad = Object.entries(res.tasks).filter(([, r]) => r.passed !== r.total);
    console.log(`\n${Object.keys(res.tasks).length - bad.length}/${Object.keys(res.tasks).length} reference solutions pass every assertion`);
    break;
  }
  case 'contract': {
    const { writeContractDoc } = await import('../contract/doc.mjs');
    console.log(writeContractDoc());
    break;
  }
  case 'list': {
    for (const t of await loadTasks()) console.log(`${t.id.padEnd(28)} ${t.format.padEnd(7)} ${t.title}  [${t.components.join(' ')}]`);
    break;
  }
  default:
    console.error('usage: evals.mjs run|report|estimate|calibrate|list|contract (see evals/README.md)');
    process.exit(2);
}
