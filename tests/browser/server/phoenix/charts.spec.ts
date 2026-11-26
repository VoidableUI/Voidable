// SPDX-License-Identifier: MIT
//
// The four charts rendered by LiveView components (packages/liveview/demo, /lab/charts): the server's data
// is the JSON data attribute of each element, present in the first static render, and a server update redraws.

import { test, expect, settle, ready } from '../shared';

test.beforeEach(async ({ page }) => {
  await page.goto('/lab/charts');
  await page.waitForSelector('.phx-connected');
  await ready(page);
});

const count = (page: import('@playwright/test').Page, sel: string) => page.locator(sel).count();
const prop = (page: import('@playwright/test').Page, id: string, name: string) =>
  page.evaluate(([id, name]) => JSON.parse(JSON.stringify((document.getElementById(id) as any)[name])), [id, name]);

test('every chart draws the data the server rendered', async ({ page }) => {
  await expect.poll(() => count(page, '#bars .void-bar-chart-bar')).toBe(3);
  await expect.poll(() => count(page, '#line .void-line-chart-line')).toBe(1);
  await expect.poll(() => count(page, '#donut .void-donut-chart-segment')).toBe(3);
  await expect.poll(() => count(page, '#gauge-segments .void-gauge-segment')).toBe(2);
  await expect(page.locator('#gauge .void-gauge-center-value')).toContainText('20');
  expect(await prop(page, 'bars', 'data')).toEqual({ labels: ['Q1', 'Q2', 'Q3'], series: [{ name: 'Revenue', values: [4, 8, 6] }] });
  expect(await prop(page, 'gauge-segments', 'zones')).toEqual([{ from: 0, to: 100, color: 'success' }]);
});

test('the first static render already carries the data, with no hook and no generated id', async ({ page }) => {
  const html = await (await page.request.get('/lab/charts')).text();
  expect(html).toMatch(/<void-bar-chart[^>]* data="\{&quot;labels&quot;/);
  expect(html).toMatch(/<void-gauge[^>]* zones="\[/);
  expect(html).not.toContain('data-void-props');
  expect(html).not.toContain('VoidProps');
});

test('each chart has a data table for assistive technology, and the drawing is hidden from it', async ({ page }) => {
  await expect(page.locator('#bars svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#bars table caption')).toHaveText('Revenue by quarter');
  await expect(page.locator('#bars tbody tr')).toHaveCount(3);
});

test('the charts keep their accessible names', async ({ page }) => {
  await expect(page.locator('#bars')).toHaveAttribute('aria-label', 'Revenue by quarter');
  await expect(page.locator('#gauge')).toHaveAttribute('aria-label', 'Disk usage');
});

test('a server update redraws the charts with the new data', async ({ page }) => {
  await page.locator('#grow').click();
  await expect.poll(() => prop(page, 'bars', 'data')).toEqual({ labels: ['Q1', 'Q2', 'Q3'], series: [{ name: 'Revenue', values: [8, 16, 12] }] });
  await expect.poll(() => prop(page, 'line', 'data')).toMatchObject({ series: [{ values: [6, 10, 8, 14] }] });
  await expect.poll(() => prop(page, 'donut', 'data')).toMatchObject({ segments: [{ value: 80 }, { value: 50 }, { value: 30 }] });
  await settle(page);
  await expect(page.locator('#gauge .void-gauge-center-value')).toContainText('40');
  expect(await count(page, '#bars .void-bar-chart-bar')).toBe(3);
});
