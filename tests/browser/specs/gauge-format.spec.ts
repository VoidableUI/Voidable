// SPDX-License-Identifier: MIT
//
// The gauge prints the reading with its decimals, in the number format of the element's language, and the
// accessible table says the same number (#141).
import { test, expect, load, type Page } from '../helpers/test';

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
  }, html);
}

const intl = (page: Page, lang: string, v: number, digits: number) =>
  page.evaluate(([l, n, f]) => new Intl.NumberFormat(l as string, { minimumFractionDigits: f as number, maximumFractionDigits: f as number }).format(n as number), [lang, v, digits] as const);

/** What the centre prints and what the accessible table's first cell says, once the entry animation has ended. */
const read = (page: Page, id: string) =>
  page.evaluate((i) => {
    const g = document.getElementById(i)!;
    return {
      centre: g.querySelector('.void-gauge-center-value')!.textContent!.trim(),
      table: g.querySelector('table tbody td')!.textContent!.trim(),
    };
  }, id);

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
  await page.evaluate(() => document.documentElement.setAttribute('data-anim-speed', 'off'));
});

test.describe('gauge number format', () => {
  test('a fractional reading keeps its decimals', async ({ page }) => {
    await mount(page, '<void-gauge id="g" value="0.21" max="1" aria-label="Ratio"></void-gauge>');
    await expect.poll(() => read(page, 'g')).toEqual({ centre: await intl(page, 'en', 0.21, 2), table: await intl(page, 'en', 0.21, 2) });
  });

  test('fraction-digits pads and rounds, and the table agrees', async ({ page }) => {
    await mount(page, '<void-gauge id="g" value="0.2" max="1" fraction-digits="2" aria-label="Ratio"></void-gauge><void-gauge id="h" value="75.6" fraction-digits="0" aria-label="Load"></void-gauge>');
    await expect.poll(() => read(page, 'g')).toEqual({ centre: '0.20', table: '0.20' });
    await expect.poll(() => read(page, 'h')).toEqual({ centre: '76', table: '76' });
  });

  for (const lang of ['de', 'fr', 'ar']) {
    test(`follows lang="${lang}"`, async ({ page }) => {
      await mount(page, `<div lang="${lang}"><void-gauge id="g" value="0.21" max="1" aria-label="Ratio"></void-gauge></div>`);
      const want = await intl(page, lang, 0.21, 2);
      await expect.poll(() => read(page, 'g')).toEqual({ centre: want, table: want });
    });
  }

  test('a later change of value and lang redraws', async ({ page }) => {
    await mount(page, '<div id="w" lang="en"><void-gauge id="g" value="0.21" max="1" aria-label="Ratio"></void-gauge></div>');
    await page.evaluate(async () => {
      document.getElementById('w')!.lang = 'de';
      (document.getElementById('g') as any).value = 0.5;
    });
    const want = await intl(page, 'de', 0.5, 1);
    await expect.poll(() => read(page, 'g')).toEqual({ centre: want, table: want });
  });
});
