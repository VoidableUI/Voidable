// SPDX-License-Identifier: MIT
//
// axe-core over a page with every component, in the dark and the light theme,
// plus open overlays. Known violations live in axe-baseline.json, reviewed by
// hand: a violation that is not in the baseline fails, and so does a baseline
// entry that no longer occurs (delete it; the fix worked).
//
// The baseline counts violating nodes per rule and per component (the nearest
// void-* ancestor), which survives generated ids and markup reshuffles.
// Regenerate with VOID_UPDATE_AXE_BASELINE=1 and review the diff; every rule
// in the baseline needs a reason under "_notes".
//
// Chromium only: the rules are engine-independent and one baseline is enough
// to review; the other engines' accessibility trees are covered elsewhere.
import { test, expect, load, settle, type Page } from '../helpers/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const baselineFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'axe-baseline.json');
type Counts = Record<string, Record<string, number>>;
const baseline: Record<string, Counts> = JSON.parse(readFileSync(baselineFile, 'utf8'));
const updating = !!process.env.VOID_UPDATE_AXE_BASELINE;
const collected: Record<string, Counts> = {};

test.skip(({ browserName }) => browserName !== 'chromium', 'axe runs on Chromium; see the header comment');
test.describe.configure({ mode: 'serial' });

async function axe(page: Page): Promise<Counts> {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      resultTypes: ['violations'],
    });
    const counts: Record<string, Record<string, number>> = {};
    for (const v of result.violations) {
      for (const node of v.nodes) {
        let el: Element | null = document.querySelector(node.target[0]);
        while (el && !el.tagName.startsWith('VOID-')) el = el.parentElement;
        const owner = el ? el.tagName.toLowerCase() : 'page';
        counts[v.id] ??= {};
        counts[v.id][owner] = (counts[v.id][owner] ?? 0) + 1;
      }
    }
    return counts;
  });
}

function compare(name: string, found: Counts) {
  collected[name] = found;
  if (updating) return;
  const known = baseline[name] ?? {};
  const fresh: string[] = [];
  const fixed: string[] = [];
  for (const [rule, owners] of Object.entries(found)) {
    for (const [owner, n] of Object.entries(owners)) {
      const k = known[rule]?.[owner] ?? 0;
      if (n > k) fresh.push(`${rule} on ${owner}: ${n} (baseline ${k})`);
    }
  }
  for (const [rule, owners] of Object.entries(known)) {
    for (const [owner, k] of Object.entries(owners)) {
      const n = found[rule]?.[owner] ?? 0;
      if (n < k) fixed.push(`${rule} on ${owner}: ${n} (baseline ${k})`);
    }
  }
  expect(fresh, `new axe violations in "${name}" (fix them, or add them to axe-baseline.json with a reason)`).toEqual([]);
  expect(fixed, `axe violations in "${name}" that are gone: lower their counts in axe-baseline.json`).toEqual([]);
  const notes = (baseline as any)._notes ?? {};
  expect(Object.keys(found).filter((rule) => !notes[rule]), 'baselined rules without a reason in axe-baseline.json "_notes"').toEqual([]);
}

test.afterAll(() => {
  if (!updating) return;
  const merged = { ...baseline, ...collected } as Record<string, unknown>;
  const sorted = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
  writeFileSync(baselineFile, JSON.stringify(sorted, null, 2) + '\n');
});

test('the kitchen page shows every component @voidable/ui defines', async ({ page }) => {
  const manifest = require('@voidable/ui/custom-elements.json');
  const tags: string[] = manifest.modules.flatMap((m: any) => (m.declarations ?? []).map((d: any) => d.tagName).filter(Boolean));
  await load(page, '/kitchen');
  const present = await page.evaluate((tags) => tags.filter((t) => document.querySelector(t)), tags);
  expect(tags.filter((t) => !present.includes(t)), 'add these to pages/kitchen.html').toEqual([]);
});

for (const theme of ['dark', 'light']) {
  test(`every component, ${theme} theme`, async ({ page }) => {
    await load(page, `/kitchen?theme=${theme}`);
    compare(`kitchen ${theme}`, await axe(page));
  });

  test(`open overlays, ${theme} theme`, async ({ page }) => {
    await load(page, `/overlays?theme=${theme}`);
    await page.locator('#open-drw').click();
    await page.locator('#open-nested').click();
    await page.locator('#nested-dd-t').click();
    await settle(page);
    compare(`overlays open ${theme}`, await axe(page));
  });

  test(`form, ${theme} theme`, async ({ page }) => {
    await load(page, `/form?theme=${theme}`);
    compare(`form ${theme}`, await axe(page));
  });
}
