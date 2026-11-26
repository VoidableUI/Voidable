// SPDX-License-Identifier: MIT
//
// The pickers (#52) before and after their script: written as the final DOM
// (a native <select>, the content part of options), they take the same space
// before the upgrade as after it, and the upgrade moves none of their nodes.
import { test, expect, settle } from '../helpers/test';

const IDS = ['select', 'combobox', 'multiselect', 'after'];

test('the pickers do not shift the layout when their script arrives late', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/build/ui.js', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/pickers', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.readyState !== 'loading' && !!document.getElementById('after'));
  const boxes = () =>
    page.evaluate((ids) => ids.map((id) => {
      const r = document.getElementById(id)!.getBoundingClientRect();
      return { id, top: Math.round(r.top), height: Math.round(r.height) };
    }), IDS);
  const marks = () =>
    page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('select, option, void-combobox-content, void-multiselect-content, void-option'));
      nodes.forEach((n, i) => ((n as any).__mark = i));
      return nodes.length;
    });
  expect(await page.evaluate(() => customElements.get('void-select'))).toBeUndefined();
  const before = await boxes();
  const count = await marks();
  release();
  await page.waitForFunction(() => !!customElements.get('void-multiselect') && typeof (window as any).__settle === 'function');
  await settle(page);
  const after = await boxes();
  for (let i = 0; i < IDS.length; i++) {
    expect(Math.abs(after[i]!.top - before[i]!.top), `${IDS[i]} top`).toBeLessThanOrEqual(1);
    expect(Math.abs(after[i]!.height - before[i]!.height), `${IDS[i]} height`).toBeLessThanOrEqual(1);
  }
  // The same nodes, in the same places.
  const kept = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select, option, void-combobox-content, void-multiselect-content, void-option')).map((n) => (n as any).__mark),
  );
  expect(kept).toEqual(Array.from({ length: count }, (_, i) => i));
  // The choices the markup made: the select's value attribute, the option marked selected.
  await expect(page.locator('#select select')).toHaveValue('pro');
  await expect(page.locator('#combobox input')).toHaveValue('France');
  expect(await page.evaluate(() => (document.getElementById('combobox') as any).value)).toBe('fr');
});
