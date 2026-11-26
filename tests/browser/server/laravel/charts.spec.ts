// SPDX-License-Identifier: MIT
//
// The four charts drawn by the package's Blade components (examples/laravel, /lab/charts): the server's data
// is the JSON `data` attribute of each element, present in the first response, a Livewire update with
// unchanged data leaves the charts alone, and changed data redraws them.
import { test, expect, settle, ready, type Page } from '../shared';

test.beforeEach(async ({ page }) => {
  await page.goto('/lab/charts');
  await page.waitForFunction(() => !!(window as any).Livewire && !!(window as any).Alpine?.version && !!document.querySelector('[wire\\:id]'));
  await ready(page);
  await expect.poll(() => page.locator('#bars svg').getAttribute('data-phase')).toBe('idle');
});

const data = (page: Page, id: string) => page.evaluate((id) => JSON.parse(JSON.stringify((document.getElementById(id) as any).data)), id);

test('the first response already carries the data as one JSON attribute', async ({ page }) => {
  const html = await (await page.request.get('/lab/charts')).text();
  expect(html).toMatch(/<void-bar-chart[^>]* data="\{&quot;labels&quot;:\[&quot;Q1&quot;/);
  expect(html).toMatch(/<void-gauge[^>]* zones="\[\{&quot;from&quot;:0/);
  expect(html).not.toContain('data-series');
});

test('every chart draws the server data', async ({ page }) => {
  await expect(page.locator('#bars .void-bar-chart-bar')).toHaveCount(3);
  await expect(page.locator('#line .void-line-chart-line')).toHaveCount(1);
  await expect(page.locator('#donut .void-donut-chart-segment')).toHaveCount(3);
  await expect(page.locator('#gauge-segments .void-gauge-segment')).toHaveCount(2);
  await expect(page.locator('#gauge .void-gauge-center-value')).toContainText('20');
  expect(await data(page, 'bars')).toEqual({ labels: ['Q1', 'Q2', 'Q3'], series: [{ name: 'Revenue', values: [4, 8, 6] }] });
});

test('each chart has a data table in the accessibility tree, and the drawing is hidden from it', async ({ page }) => {
  await expect(page.locator('#bars svg')).toHaveAttribute('aria-hidden', 'true');
  const table = page.getByRole('table', { name: 'Revenue by quarter' });
  await expect(table.getByRole('row')).toHaveCount(4);
  await expect(table.getByRole('cell', { name: '8' })).toBeAttached();
  await expect(page.locator('#gauge-segments table')).toBeVisible();
});

test('a Livewire update with unchanged data leaves the charts alone: same data, no new animation', async ({ page }) => {
  await page.evaluate(() => {
    for (const id of ['bars', 'line', 'donut', 'gauge-segments']) {
      const el = document.getElementById(id) as any;
      el.__data = el.data;
      el.__phases = [];
      new MutationObserver(() => el.__phases.push(el.querySelector('svg')?.getAttribute('data-phase'))).observe(el, { attributes: true, subtree: true, attributeFilter: ['data-phase'] });
    }
  });
  await page.click('#bump');
  await expect(page.locator('#version')).toHaveText('Server version 2');
  await settle(page);
  const result = await page.evaluate(() =>
    ['bars', 'line', 'donut', 'gauge-segments'].map((id) => {
      const el = document.getElementById(id) as any;
      return { id, same: el.data === el.__data, phases: el.__phases };
    }),
  );
  for (const r of result) {
    expect(r.same, `${r.id} kept its data object`).toBe(true);
    expect(r.phases, `${r.id} did not animate again`).toEqual([]);
  }
});

test('changed server data redraws the charts', async ({ page }) => {
  await page.click('#grow');
  await expect.poll(() => data(page, 'bars')).toEqual({ labels: ['Q1', 'Q2', 'Q3'], series: [{ name: 'Revenue', values: [8, 16, 12] }] });
  await expect.poll(() => data(page, 'donut')).toMatchObject({ segments: [{ value: 80 }, { value: 50 }, { value: 30 }] });
  await settle(page);
  await expect(page.locator('#gauge .void-gauge-center-value')).toContainText('40');
  await expect(page.getByRole('table', { name: 'Revenue by quarter' }).getByRole('cell', { name: '16' })).toBeAttached();
});
