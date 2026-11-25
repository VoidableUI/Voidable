// SPDX-License-Identifier: MIT
//
// useTheme() reports the scheme the CSS resolves: an explicit data-theme
// (including "system"), then a skin's preferred scheme (Loft prefers light),
// then the operating system. Checked against the computed page, in both
// emulated operating system schemes, and live.
import { test, expect, load, type Page } from '../helpers/test';

const reported = (page: Page) => page.locator('#r-theme').textContent();
/** What the page actually shows: the computed colour scheme of <html>. */
const shown = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);

const html = (page: Page, attr?: string) =>
  page.evaluate((a) => {
    if (a === undefined) document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', a);
  }, attr);

for (const os of ['dark', 'light'] as const) {
  test.describe(`operating system: ${os}`, () => {
    test.use({ colorScheme: os });

    test('no data-theme and no skin follows the operating system', async ({ page }) => {
      await load(page, '/react-theme');
      expect(await reported(page)).toBe(os);
      expect(await shown(page)).toBe(os);
    });

    test('data-theme="system" follows the operating system', async ({ page }) => {
      await load(page, '/react-theme');
      await html(page, 'system');
      await expect.poll(() => reported(page)).toBe(os);
    });

    for (const explicit of ['dark', 'light'] as const) {
      test(`data-theme="${explicit}" wins`, async ({ page }) => {
        await load(page, '/react-theme');
        await html(page, explicit);
        await expect.poll(() => reported(page)).toBe(explicit);
        expect(await shown(page)).toBe(explicit);
      });
    }

    test('the Loft skin prefers light over the operating system, until data-theme says otherwise', async ({ page }) => {
      await load(page, '/react-theme?skin=loft');
      expect(await reported(page)).toBe('light');
      expect(await shown(page)).toBe('light');
      await html(page, 'dark');
      await expect.poll(() => reported(page)).toBe('dark');
      // "system" hands the decision back to the operating system, over the skin.
      await html(page, 'system');
      await expect.poll(() => reported(page)).toBe(os);
      expect(await shown(page)).toBe(os);
      await html(page, undefined);
      await expect.poll(() => reported(page)).toBe('light');
    });
  });
}

test('it follows the operating system live', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await load(page, '/react-theme');
  expect(await reported(page)).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => reported(page)).toBe('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => reported(page)).toBe('dark');
});

test('it follows a skin being applied or removed live', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await load(page, '/react-theme');
  expect(await reported(page)).toBe('dark');
  await page.evaluate(() => document.documentElement.setAttribute('data-void-skin', 'loft'));
  await expect.poll(() => reported(page)).toBe('light');
  await page.evaluate(() => document.documentElement.removeAttribute('data-void-skin'));
  await expect.poll(() => reported(page)).toBe('dark');
});
