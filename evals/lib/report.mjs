// SPDX-License-Identifier: MIT
// Aggregate one or more runs into results.json and a readable summary.md:
// pass rate by model and condition (with the spread over repetitions), by
// output format, by component and by assertion kind; token use, turns, tool
// calls and cost; and the failure clusters, each with examples, so a cluster
// points at something to fix in the library, the manifest or the skill.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { CONDITION_LABELS, CONDITIONS } from './conditions.mjs';
import { FORMATS } from './formats.mjs';
import { BASELINE, CALIBRATION } from './paths.mjs';
import { readResults } from './run.mjs';

/** USD per million tokens. Cache writes are billed at 1.25x input; reads as listed. Check current pricing before relying on totals. */
export const PRICES = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-fable-5-2': { input: 8, output: 40, cacheRead: 0.2 },
};

export function cost(model, u = {}) {
  const p = PRICES[model];
  if (!p) return null;
  return ((u.input_tokens || 0) * p.input + (u.output_tokens || 0) * p.output + (u.cache_creation_input_tokens || 0) * p.input * 1.25 + (u.cache_read_input_tokens || 0) * p.cacheRead) / 1e6;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const pct = (x) => `${(x * 100).toFixed(0)}%`;
const spread = (xs) => (xs.length > 1 ? `${pct(mean(xs))} ± ${(sd(xs) * 100).toFixed(0)} (${pct(Math.min(...xs))}–${pct(Math.max(...xs))})` : pct(mean(xs)));
const groupBy = (xs, f) => {
  const m = new Map();
  for (const x of xs) {
    const k = f(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
};

export function loadCalibration() {
  return existsSync(CALIBRATION) ? JSON.parse(readFileSync(CALIBRATION, 'utf8')) : { tasks: {} };
}

/** Re-score a record without the assertions the reference solution also fails. */
export function adjust(rec, calibration) {
  // a11y is filtered per violation instead: library defects (axe rule on a
  // <void-*> element that a reference solution also triggers) are dropped and
  // the rest still count against the agent.
  const blocked = new Set(Object.keys(calibration.tasks[rec.task]?.failed || {}).filter((id) => id !== 'a11y'));
  const libAxe = new Set(calibration.libraryAxe || []);
  const own = (rec.axe || []).filter((v) => (v.impact === 'serious' || v.impact === 'critical') && (v.owners || [null]).some((o) => !libAxe.has(`${v.id}|${o}`)));
  const kept = rec.assertions
    .filter((a) => !blocked.has(a.id))
    .map((a) => (a.id === 'a11y' && rec.axe ? { ...a, pass: own.length === 0, detail: own.map((v) => `${v.id} (${v.impact}) ${v.nodes.join(', ')}`).join('; ') } : a));
  const passed = kept.filter((a) => a.pass).length;
  return { ...rec, blocked: [...blocked], kept, adjPassed: passed, adjTotal: kept.length, adjRate: kept.length ? passed / kept.length : 0, adjPass: passed === kept.length };
}

function summarise(recs) {
  const byRep = groupBy(recs, (r) => r.rep);
  const taskRates = [...byRep.values()].map((rs) => mean(rs.map((r) => (r.adjPass ? 1 : 0))));
  const assertionRates = [...byRep.values()].map((rs) => mean(rs.map((r) => r.adjRate)));
  const costs = recs.map((r) => cost(r.model, r.agent?.usage)).filter((c) => c != null);
  return {
    cases: recs.length,
    reps: byRep.size,
    taskPass: { mean: mean(taskRates), sd: sd(taskRates), min: Math.min(...taskRates), max: Math.max(...taskRates), perRep: taskRates },
    assertionPass: { mean: mean(assertionRates), sd: sd(assertionRates), perRep: assertionRates },
    tokens: {
      input: mean(recs.map((r) => r.agent?.usage?.input_tokens || 0)),
      output: mean(recs.map((r) => r.agent?.usage?.output_tokens || 0)),
      cacheRead: mean(recs.map((r) => r.agent?.usage?.cache_read_input_tokens || 0)),
      cacheWrite: mean(recs.map((r) => r.agent?.usage?.cache_creation_input_tokens || 0)),
    },
    turns: mean(recs.map((r) => r.agent?.turns || 0)),
    toolCalls: mean(recs.map((r) => r.agent?.toolCalls || 0)),
    costPerCase: costs.length ? mean(costs) : null,
    costTotal: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
    agentErrors: recs.filter((r) => r.agent?.error).length,
  };
}

function clusters(recs) {
  const add = (m, key, rec, example) => {
    if (!m.has(key)) m.set(key, { key, count: 0, byCondition: {}, examples: [] });
    const c = m.get(key);
    c.count++;
    c.byCondition[rec.condition] = (c.byCondition[rec.condition] || 0) + 1;
    if (c.examples.length < 3) c.examples.push({ case: rec.key, detail: example });
  };
  const staticM = new Map();
  const functional = new Map();
  const renderM = new Map();
  const consoleM = new Map();
  const axeM = new Map();
  const layoutM = new Map();
  for (const r of recs) {
    for (const f of r.findings || []) add(staticM, `${f.rule} ${f.tag}${f.attr ? ` ${f.attr}` : ''}${f.rule === 'invalid-value' && f.value ? `="${f.value}"` : ''}`, r, `${f.message} (line ${f.line})`);
    for (const a of r.kept || r.assertions) {
      if (a.pass) continue;
      if (a.kind === 'functional') add(functional, `${r.task} › ${a.id}`, r, a.detail);
      if (a.kind === 'render' && r.render) add(renderM, (a.detail || '').split('\n')[0].replace(/\d+:\d+/g, 'L:C').replace(/\/[^\s]+\//g, '').slice(0, 140), r, a.detail);
      if (a.kind === 'render' && !r.render) add(renderM, a.detail || 'no output', r, a.detail);
      if (a.kind === 'layout') add(layoutM, `${r.task}`, r, a.detail);
    }
    if ((r.kept || r.assertions).some((a) => a.id === 'console' && !a.pass)) {
      for (const msg of new Set((r.console || []).map((m) => m.replace(/\d+/g, 'N').replace(/https?:\/\/\S+/g, 'URL').slice(0, 160)))) add(consoleM, msg, r, msg);
    }
    if ((r.kept || r.assertions).some((a) => a.id === 'a11y' && !a.pass)) {
      for (const v of r.axe || []) if (v.impact === 'serious' || v.impact === 'critical') add(axeM, `${v.id} on ${(v.owners || []).map((o) => o || 'page markup').join(', ')}`, r, `${v.help}: ${v.nodes.join(', ')}`);
    }
  }
  const sorted = (m) => [...m.values()].sort((a, b) => b.count - a.count);
  return { static: sorted(staticM), functional: sorted(functional), render: sorted(renderM), console: sorted(consoleM), a11y: sorted(axeM), layout: sorted(layoutM) };
}

export function aggregate(runDirs) {
  const calibration = loadCalibration();
  const metas = runDirs.map((d) => JSON.parse(readFileSync(join(d, 'meta.json'), 'utf8')));
  const recs = runDirs.flatMap((d) => readResults(d)).map((r) => adjust(r, calibration));
  const models = [...new Set(recs.map((r) => r.model))];
  const conditions = CONDITIONS.filter((c) => recs.some((r) => r.condition === c));
  const byModelCondition = {};
  for (const m of models) {
    byModelCondition[m] = {};
    for (const c of conditions) {
      const rs = recs.filter((r) => r.model === m && r.condition === c);
      if (rs.length) byModelCondition[m][c] = summarise(rs);
    }
  }
  const dim = (f) => {
    const out = {};
    for (const [k, rs] of groupBy(recs, f)) {
      out[k] = {};
      for (const c of conditions) {
        const x = rs.filter((r) => r.condition === c);
        if (x.length) out[k][c] = { cases: x.length, taskPass: mean(x.map((r) => (r.adjPass ? 1 : 0))), assertionPass: mean(x.map((r) => r.adjRate)) };
      }
    }
    return out;
  };
  const byComponent = {};
  for (const r of recs) {
    for (const tag of r.components || []) {
      byComponent[tag] ??= {};
      const e = (byComponent[tag][r.condition] ??= { cases: 0, pass: 0, findings: 0 });
      e.cases++;
      if (r.adjPass) e.pass++;
      e.findings += (r.findings || []).filter((f) => f.tag === tag).length;
    }
  }
  const byKind = {};
  for (const r of recs) {
    for (const a of r.kept) {
      const e = ((byKind[a.kind] ??= {})[r.condition] ??= { n: 0, pass: 0 });
      e.n++;
      if (a.pass) e.pass++;
    }
  }
  const byTask = {};
  for (const r of recs) {
    const e = ((byTask[r.task] ??= { format: r.format })[`${r.model} ${r.condition}`] ??= { n: 0, pass: 0, rate: 0 });
    e.n++;
    e.pass += r.adjPass ? 1 : 0;
    e.rate += r.adjRate;
  }
  return {
    generatedAt: new Date().toISOString(),
    runs: metas,
    modes: [...new Set(metas.map((m) => m.mode))],
    models,
    conditions,
    libraryAxe: calibration.libraryAxe || [],
    libraryBlocked: Object.fromEntries(Object.entries(calibration.tasks).filter(([, t]) => Object.keys(t.failed).length).map(([id, t]) => [id, t.failed])),
    byModelCondition,
    byFormat: dim((r) => r.format),
    byComponent,
    byKind,
    byTask,
    clusters: clusters(recs),
  };
}

function markdown(agg, baseline) {
  const L = [];
  const simulated = agg.modes.some((m) => m === 'stub') || agg.runs.some((r) => r.mode === 'replay' && /stub/.test(r.replayOf || ''));
  L.push(`# Voidable agent evals: ${agg.runs.map((r) => r.runId).join(', ')}`, '');
  L.push(`Generated ${agg.generatedAt}. Mode: ${agg.modes.join(', ')}. Library: ${agg.runs[0]?.voidable || '?'}. Effort: ${agg.runs[0]?.effort || '?'}.`, '');
  if (simulated) {
    L.push('> **Stub data.** These cases were produced by the local stub (lib/stub.mjs), which writes the reference solutions. The numbers test the harness; they say nothing about any model, and token counts are byte estimates.', '');
  }
  L.push('## Pass rate by model and condition', '');
  L.push('Task pass: share of tasks where every assertion passed (mean ± sd over repetitions, min–max). Assertion pass: mean share of assertions passed. Assertions the reference solution also fails are excluded (see "Library-blocked").', '');
  L.push('| Model | Condition | Cases | Task pass | Assertion pass | Δ task pass vs baseline | In tok | Out tok | Cache read | Turns | Tool calls | $/case | $ total |');
  L.push('|---|---|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const m of agg.models) {
    for (const c of agg.conditions) {
      const s = agg.byModelCondition[m][c];
      if (!s) continue;
      const b = baseline?.summary?.[m]?.[c];
      const delta = b ? `${s.taskPass.mean - b.taskPass >= 0 ? '+' : ''}${((s.taskPass.mean - b.taskPass) * 100).toFixed(0)} pts` : '—';
      L.push(`| ${m} | ${CONDITION_LABELS[c]} | ${s.cases} | ${spread(s.taskPass.perRep)} | ${spread(s.assertionPass.perRep)} | ${delta} | ${Math.round(s.tokens.input)} | ${Math.round(s.tokens.output)} | ${Math.round(s.tokens.cacheRead)} | ${s.turns.toFixed(1)} | ${s.toolCalls.toFixed(1)} | ${s.costPerCase == null ? '—' : s.costPerCase.toFixed(4)} | ${s.costTotal == null ? '—' : s.costTotal.toFixed(2)} |`);
    }
  }
  L.push('');
  const table = (title, obj, label = (k) => k) => {
    L.push(`## ${title}`, '');
    L.push(`| | ${agg.conditions.map((c) => c).join(' | ')} |`);
    L.push(`|---|${agg.conditions.map(() => '---').join('|')}|`);
    for (const [k, v] of Object.entries(obj).sort()) L.push(`| ${label(k)} | ${agg.conditions.map((c) => (v[c] ? `${pct(v[c].taskPass)} task / ${pct(v[c].assertionPass)} assert (n=${v[c].cases})` : '—')).join(' | ')} |`);
    L.push('');
  };
  table('By output format (all models pooled)', agg.byFormat, (k) => FORMATS[k]?.label || k);
  L.push('## By component (tasks that need it; all models pooled)', '');
  L.push(`| Component | ${agg.conditions.join(' | ')} |`);
  L.push(`|---|${agg.conditions.map(() => '---').join('|')}|`);
  for (const [tag, v] of Object.entries(agg.byComponent).sort()) {
    L.push(`| \`${tag}\` | ${agg.conditions.map((c) => (v[c] ? `${pct(v[c].pass / v[c].cases)} (n=${v[c].cases}, ${v[c].findings} check findings)` : '—')).join(' | ')} |`);
  }
  L.push('');
  L.push('## By assertion kind', '');
  L.push(`| Kind | ${agg.conditions.join(' | ')} |`);
  L.push(`|---|${agg.conditions.map(() => '---').join('|')}|`);
  for (const [k, v] of Object.entries(agg.byKind)) L.push(`| ${k} | ${agg.conditions.map((c) => (v[c] ? `${pct(v[c].pass / v[c].n)} (n=${v[c].n})` : '—')).join(' | ')} |`);
  L.push('');
  const cl = (title, list, n = 15) => {
    L.push(`## ${title}`, '');
    if (!list.length) {
      L.push('None.', '');
      return;
    }
    for (const c of list.slice(0, n)) {
      L.push(`- **${c.key}**: ${c.count}× (${Object.entries(c.byCondition).map(([k, v]) => `${k} ${v}`).join(', ')})`);
      for (const e of c.examples.slice(0, 2)) L.push(`  - \`${e.case}\`: ${String(e.detail).replace(/\s+/g, ' ').slice(0, 220)}`);
    }
    L.push('');
  };
  L.push('# Failure clusters', '');
  cl('Wrong markup (voidable check findings: rule, element, attribute)', agg.clusters.static, 25);
  cl('Functional failures (task › check)', agg.clusters.functional, 25);
  cl('Render failures', agg.clusters.render);
  cl('Console errors', agg.clusters.console);
  cl('Accessibility (axe serious/critical)', agg.clusters.a11y);
  cl('Layout overflow at 390 px', agg.clusters.layout);
  L.push('## Library-blocked assertions', '');
  L.push('The reference solution fails these too, so they are excluded from the scores above and reported as library findings (from results/calibration.json):', '');
  L.push('Accessibility violations on Voidable elements that the reference solutions also trigger (not counted against agents): ' + (agg.libraryAxe.length ? agg.libraryAxe.map((k) => `\`${k.replace('|', ' on ')}\``).join(', ') : 'none') + '.', '');
  const lb = Object.entries(agg.libraryBlocked).map(([id, f]) => [id, Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'a11y'))]).filter(([, f]) => Object.keys(f).length);
  if (!lb.length) L.push('None.');
  for (const [task, failed] of lb) for (const [id, detail] of Object.entries(failed)) L.push(`- \`${task}\` › ${id}: ${String(detail).replace(/\s+/g, ' ').slice(0, 300)}`);
  L.push('');
  return L.join('\n');
}

export function readBaseline() {
  return existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : { history: [] };
}

/** Write results.json and summary.md into the first run dir; optionally append to the baseline. */
export function writeReport(runDirs, { baseline = false, label } = {}) {
  const agg = aggregate(runDirs);
  const base = readBaseline();
  // Compare like with like: stub numbers never serve as the baseline of a real run.
  const stubOnly = agg.modes.every((m) => m === 'stub');
  const prev = base.history.filter((h) => (h.modes || []).every((m) => m === 'stub') === stubOnly).at(-1);
  const out = runDirs[0];
  const jsonPath = join(out, 'results.json');
  const summaryPath = join(out, 'summary.md');
  writeFileSync(jsonPath, JSON.stringify(agg, null, 2) + '\n');
  writeFileSync(summaryPath, markdown(agg, prev));
  if (baseline) {
    const summary = {};
    for (const [m, cs] of Object.entries(agg.byModelCondition)) {
      summary[m] = {};
      for (const [c, s] of Object.entries(cs)) {
        summary[m][c] = {
          cases: s.cases,
          reps: s.reps,
          taskPass: round(s.taskPass.mean),
          taskPassSd: round(s.taskPass.sd),
          assertionPass: round(s.assertionPass.mean),
          tokensIn: Math.round(s.tokens.input),
          tokensOut: Math.round(s.tokens.output),
          turns: round(s.turns, 1),
          toolCalls: round(s.toolCalls, 1),
          costPerCase: s.costPerCase == null ? null : round(s.costPerCase, 5),
        };
      }
    }
    base.history.push({
      label: label || basename(out),
      date: agg.generatedAt,
      modes: agg.modes,
      runs: agg.runs.map((r) => r.runId),
      voidable: agg.runs[0]?.voidable,
      tasks: agg.runs[0]?.tasks.length,
      summary,
      topClusters: {
        static: agg.clusters.static.slice(0, 10).map((c) => ({ key: c.key, count: c.count })),
        functional: agg.clusters.functional.slice(0, 10).map((c) => ({ key: c.key, count: c.count })),
      },
    });
    writeFileSync(BASELINE, JSON.stringify(base, null, 2) + '\n');
  }
  return { agg, jsonPath, summaryPath };
}

const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

/** Project the cost of a full run from the token use measured in `runDir`. */
export function estimate(runDir, { tasks, reps, models, conditions }) {
  const recs = readResults(runDir);
  const meta = JSON.parse(readFileSync(join(runDir, 'meta.json'), 'utf8'));
  const lines = [`Projection from ${recs.length} case(s) in ${basename(runDir)} (mode ${meta.mode}) for ${tasks} tasks × ${reps} reps:`];
  if (meta.mode === 'stub') lines.push('  (stub token counts are byte estimates, not model numbers)');
  const target = models || [...new Set(recs.map((r) => r.model))];
  let total = 0;
  for (const m of target) {
    for (const c of conditions) {
      const same = recs.filter((r) => r.condition === c && r.model === m);
      const src = same.length ? same : recs.filter((r) => r.condition === c);
      if (!src.length) continue;
      const u = {
        input_tokens: mean(src.map((r) => r.agent?.usage?.input_tokens || 0)),
        output_tokens: mean(src.map((r) => r.agent?.usage?.output_tokens || 0)),
        cache_creation_input_tokens: mean(src.map((r) => r.agent?.usage?.cache_creation_input_tokens || 0)),
        cache_read_input_tokens: mean(src.map((r) => r.agent?.usage?.cache_read_input_tokens || 0)),
      };
      const per = cost(m, u) ?? 0;
      const n = tasks * reps;
      total += per * n;
      lines.push(`  ${m.padEnd(18)} ${c.padEnd(6)} ${n} cases × $${per.toFixed(4)} = $${(per * n).toFixed(2)}${same.length ? '' : ` (tokens from ${src[0].model})`}`);
    }
  }
  lines.push(`  total ≈ $${total.toFixed(2)}`);
  return lines.join('\n');
}
