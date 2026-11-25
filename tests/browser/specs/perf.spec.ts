// SPDX-License-Identifier: MIT
//
// Performance budgets (budgets.ts). Runs in the `perf` project: Chromium,
// after every other project has finished, one test at a time. Each test
// prints what it measured and the budget it was held to.
import { test, expect, load, type Page } from '../helpers/test';
import { TOLERANCE, calibrationMs, leaks, reference } from '../budgets';
import * as esbuild from 'esbuild';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

test.describe.configure({ mode: 'serial' });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let scale = 1;

/** Median of `runs` measurements: one slow outlier does not fail a budget. */
async function median(runs: number, measure: () => Promise<number>): Promise<number> {
  const xs: number[] = [];
  for (let i = 0; i < runs; i++) xs.push(await measure());
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length / 2)];
}

function within(name: string, measured: number, ref: number, unit: string, scaled = true) {
  const budget = ref * TOLERANCE * (scaled ? scale : 1);
  const line = `${name}: ${measured.toFixed(1)} ${unit} (reference ${ref} ${unit}, budget ${budget.toFixed(1)} ${unit}${scaled && scale > 1 ? `, scaled x${scale.toFixed(2)} for this machine` : ''})`;
  console.log(`[perf] ${line}`);
  test.info().annotations.push({ type: 'perf', description: line });
  expect(measured, line).toBeLessThanOrEqual(budget);
}

const run = <T,>(page: Page, name: string) => page.evaluate((n) => (window as any).perf[n](), name) as Promise<T>;

// Before every workload: warm up the parser, JIT and style system, then
// measure the plain-DOM calibration again, so a machine that is busy right now
// (another job, a GC-heavy neighbour) gets proportionally more time.
test.beforeEach(async ({ page }) => {
  await load(page, '/perf');
  await run(page, 'calibrate');
  await run(page, 'mixed1000');
  const ms = await median(5, () => run<number>(page, 'calibrate'));
  scale = Math.max(1, ms / calibrationMs);
  const line = `calibration: ${ms.toFixed(1)} ms (reference machine ${calibrationMs} ms): timing budgets scaled x${scale.toFixed(2)}`;
  console.log(`[perf] ${line}`);
  test.info().annotations.push({ type: 'perf', description: line });
});

test('first render of 1,000 mixed components', async ({ page }) => {
  within('1,000 mixed components', await median(5, () => run<number>(page, 'mixed1000')), reference.mixed1000Ms, 'ms');
});

test('500-row table: first render and one Turbo morph', async ({ page }) => {
  const results: { first: number; morph: number; intact: { rows: number; menus: number; row7: string } }[] = [];
  for (let i = 0; i < 3; i++) {
    await load(page, '/perf');
    results.push(await run(page, 'table500'));
  }
  const med = (k: 'first' | 'morph') => results.map((r) => r[k]).sort((a, b) => a - b)[1];
  expect(results[0].intact).toEqual({ rows: 500, menus: 500, row7: 'Row 7 b' });
  within('500-row table, first render', med('first'), reference.table500FirstMs, 'ms');
  within('500-row table, one Turbo morph', med('morph'), reference.table500MorphMs, 'ms');
});

test('a select with 5,000 options', async ({ page }) => {
  const ms = await median(5, async () => {
    const r = await run<{ ms: number; value: string }>(page, 'select5000');
    expect(r.value).toBe('4321');
    return r.ms;
  });
  within('select with 5,000 options', ms, reference.select5000Ms, 'ms');
});

test('200 dialog open and close cycles, without leaks', async ({ page }) => {
  const runs: { ms: number; nodeGrowth: number; heapGrowthKB: number | null }[] = [];
  for (let i = 0; i < 3; i++) runs.push(await run(page, 'dialog200'));
  within('200 dialog open/close cycles', runs.map((r) => r.ms).sort((a, b) => a - b)[1], reference.dialog200Ms, 'ms');
  const heap = runs.map((r) => r.heapGrowthKB ?? 0).sort((a, b) => a - b)[1];
  console.log(`[perf] dialog cycles: node growth ${runs.map((r) => r.nodeGrowth).join('/')}, heap growth ${runs.map((r) => r.heapGrowthKB?.toFixed(0)).join('/')} KB (limit ${leaks.heapGrowthKB} KB)`);
  for (const r of runs) expect(r.nodeGrowth, 'DOM nodes left behind').toBeLessThanOrEqual(leaks.nodeGrowth);
  expect(heap, 'retained heap after GC').toBeLessThanOrEqual(leaks.heapGrowthKB);
});

test('gzipped bundle size: the root entry and a single component', async () => {
  const size = async (contents: string) => {
    const out = await esbuild.build({
      stdin: { contents, resolveDir: root, loader: 'js' },
      bundle: true,
      minify: true,
      format: 'esm',
      write: false,
      legalComments: 'none',
      logLevel: 'silent',
    });
    return gzipSync(out.outputFiles[0].contents, { level: 9 }).length / 1024;
  };
  within('gzipped root entry', await size(`import '@voidable/ui';`), reference.rootEntryGzipKB, 'kB', false);
  within('gzipped single component (button)', await size(`import '@voidable/ui/button';`), reference.singleComponentGzipKB, 'kB', false);
});
