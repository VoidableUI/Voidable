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

test('5,000-row table: sort, filter and select-all stay interactive', async ({ page }) => {
  test.setTimeout(300_000);
  type R = { first: number; sortText: number; sortNumber: number; filterFirst: number; filterNext: number; selectAll: number; events: number; selected: number; ordered: string };
  const measure = async (native: boolean, runs: number) => {
    const results: R[] = [];
    for (let i = 0; i < runs; i++) {
      await load(page, '/perf');
      results.push((await page.evaluate((n) => (window as any).perf.data5000(n), native)) as R);
    }
    return results;
  };
  // What the table itself costs: native checkboxes in the rows. Budgeted.
  const results = await measure(true, 3);
  const med = (k: 'sortText' | 'sortNumber' | 'filterFirst' | 'filterNext' | 'selectAll') => results.map((r) => r[k]).sort((a, b) => a - b)[1];
  // Select-all is one pass and one event; the rows are in the order the number sort gives.
  for (const r of results) expect({ events: r.events, selected: r.selected }).toEqual({ events: 1, selected: 5000 });
  expect(results[0].ordered).toBe('0');
  within('5,000-row table, sort by text', med('sortText'), reference.table5000SortTextMs, 'ms');
  within('5,000-row table, sort by number', med('sortNumber'), reference.table5000SortNumberMs, 'ms');
  within('5,000-row table, filter', med('filterFirst'), reference.table5000FilterFirstMs, 'ms');
  within('5,000-row table, next keystroke of the filter', med('filterNext'), reference.table5000FilterNextMs, 'ms');
  within('5,000-row table, select all', med('selectAll'), reference.table5000SelectAllMs, 'ms');
  // A void-checkbox in every row is a component each: measured, not budgeted.
  const [boxes] = await measure(false, 1);
  expect({ events: boxes.events, selected: boxes.selected }).toEqual({ events: 1, selected: 5000 });
  console.log(`[perf] 5,000 rows with void-checkbox: first render ${boxes.first.toFixed(0)} ms, sort by text ${boxes.sortText.toFixed(0)} ms, sort by number ${boxes.sortNumber.toFixed(0)} ms, filter ${boxes.filterFirst.toFixed(0)} ms, next keystroke ${boxes.filterNext.toFixed(0)} ms, select all ${boxes.selectAll.toFixed(0)} ms`);
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
  within('gzipped single component (button)', await size(`import '@voidable/ui/components/button';`), reference.singleComponentGzipKB, 'kB', false);
});
