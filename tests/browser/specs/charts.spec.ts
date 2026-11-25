// SPDX-License-Identifier: MIT
//
// Chart and gauge rendering in a real layout engine: what is drawn, measured
// with getBBox and the rendered box, not the markup.
import { test, expect, load, settle, expectedFailure, type Page } from '../helpers/test';

test.beforeEach(async ({ page }) => load(page, '/charts'));

const addChart = (page: Page, tag: string, id: string, data: unknown) =>
  page.evaluate(([tag, id, data]) => (window as any).addChart(tag, id, data), [tag, id, data] as const);

/** Painted area of each matching shape inside an element (bounding-box width x height). */
const drawn = (page: Page, id: string, selector: string) =>
  page.evaluate(
    ([id, selector]) =>
      [...document.getElementById(id)!.querySelectorAll<SVGGraphicsElement>(selector)].map((el) => {
        const b = el.getBBox();
        return Math.round(b.width * b.height);
      }),
    [id, selector] as const,
  );

test('the gauge draws its value on first render', async ({ page }) => {
  await expect(page.locator('#gauge .void-gauge-center-value')).toContainText('20');
});

test('the gauge follows a value set after mount', async ({ page }) => {
  expectedFailure('#38', 'gauge ignores value changes after mount: the label stays at the first value');
  await page.evaluate(() => ((document.getElementById('gauge') as any).value = 80));
  await settle(page);
  await expect(page.locator('#gauge .void-gauge-center-value')).toContainText('80');
});

test('a donut draws one ring segment per value', async ({ page }) => {
  await addChart(page, 'void-donut-chart', 'donut', { segments: [{ name: 'A', value: 48 }, { name: 'B', value: 23 }, { name: 'C', value: 29 }] });
  const areas = await drawn(page, 'donut', '.void-donut-chart-segment');
  expect(areas.filter((a) => a > 0)).toHaveLength(3);
});

test('a donut with a single 100% segment draws a full ring', async ({ page }) => {
  expectedFailure('#38', 'a 2π arc has coincident end points, so the only segment is not drawn');
  await addChart(page, 'void-donut-chart', 'donut-full', { segments: [{ name: 'Organic', value: 100 }] });
  const areas = await drawn(page, 'donut-full', '.void-donut-chart-segment');
  expect(areas).toHaveLength(1);
  expect(areas[0]).toBeGreaterThan(100 * 100);
});

test('a NaN value does not make the other donut segments vanish', async ({ page }) => {
  expectedFailure('#38', 'a NaN value makes the total NaN and every segment disappears');
  await addChart(page, 'void-donut-chart', 'donut-nan', { segments: [{ name: 'A', value: 48 }, { name: 'B', value: NaN }, { name: 'C', value: 29 }] });
  const areas = await drawn(page, 'donut-nan', '.void-donut-chart-segment');
  expect(areas.filter((a) => a > 0).length).toBeGreaterThanOrEqual(2);
});

test('a NaN value keeps the other bars inside the plot, with no NaN attributes', async ({ page, pageErrors }) => {
  expectedFailure('#38', 'a NaN value breaks the y scale: the other bars run off the plot and NaN lands in attributes');
  await addChart(page, 'void-bar-chart', 'bar-nan', { labels: ['Mon', 'Tue', 'Wed'], series: [{ name: 'Requests', values: [12, NaN, 18] }] });
  const fit = await page.evaluate(() => {
    const svg = document.querySelector('#bar-nan svg') as SVGSVGElement;
    const box = svg.getBoundingClientRect();
    const rects = [...svg.querySelectorAll('rect')].map((r) => r.getBoundingClientRect()).filter((r) => r.height > 0);
    return { bars: rects.length, inside: rects.every((r) => r.top >= box.top - 1 && r.bottom <= box.bottom + 1), nan: svg.outerHTML.includes('NaN') };
  });
  expect(fit.nan).toBe(false);
  expect(fit.inside).toBe(true);
  expect(fit.bars).toBeGreaterThanOrEqual(2);
  expect(pageErrors).toEqual([]);
});
