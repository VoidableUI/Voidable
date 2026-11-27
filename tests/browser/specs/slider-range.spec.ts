// SPDX-License-Identifier: MIT
//
// The slider's native range input has to be given its bounds before its value (#140): a
// value above the default maximum of 100 was clamped to the default range and then to the
// new minimum, so the thumb sat at the start while the fill was right.
import { test, expect, load, type Page } from '../helpers/test';

const RANGES: Array<{ name: string; min: number; max: number; step: number; value: number }> = [
  { name: 'above 100', min: 500, max: 3500, step: 1, value: 2500 },
  { name: 'default range', min: 0, max: 100, step: 1, value: 30 },
  { name: 'negative', min: -50, max: -10, step: 1, value: -20 },
  { name: 'spanning zero', min: -100, max: 100, step: 5, value: 40 },
  { name: 'decimal', min: 0.5, max: 2.5, step: 0.1, value: 1.7 },
  { name: 'large step', min: 1000, max: 5000, step: 500, value: 4000 },
];

async function mount(page: Page, attrs: string): Promise<void> {
  await page.evaluate(async (a) => {
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = `<void-slider id="s" ${a}></void-slider>`;
    document.body.append(d);
    await (window as any).__settle(d);
  }, attrs);
}

const read = (page: Page) =>
  page.evaluate(() => {
    const el = document.getElementById('s') as any;
    const input = el.querySelector('input') as HTMLInputElement;
    return { native: Number(input.value), fill: input.style.getPropertyValue('--void-slider-fill'), value: el.value };
  });

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

test.describe('slider thumb follows the value', () => {
  for (const r of RANGES) {
    test(`${r.name}: min ${r.min}, max ${r.max}, value ${r.value}`, async ({ page }) => {
      await mount(page, `min="${r.min}" max="${r.max}" step="${r.step}" value="${r.value}"`);
      const got = await read(page);
      const pct = ((r.value - r.min) / (r.max - r.min)) * 100;
      expect(got.native).toBeCloseTo(r.value, 6);
      expect(got.value).toBeCloseTo(r.value, 6);
      expect(parseFloat(got.fill)).toBeCloseTo(pct, 6);
    });
  }

  test('moving the bounds later keeps the thumb on the value', async ({ page }) => {
    await mount(page, 'value="50"');
    await page.evaluate(async () => {
      const el = document.getElementById('s') as any;
      el.max = 3500;
      el.min = 500;
      el.value = 2500;
      await el.updateComplete;
    });
    expect((await read(page)).native).toBe(2500);
  });
});
