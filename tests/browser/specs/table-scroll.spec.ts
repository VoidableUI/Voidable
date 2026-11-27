// SPDX-License-Identifier: MIT
//
// A scrollable void-table is a focusable, named region only while it overflows (#108).
import { test, expect, load, settle } from '../helpers/test';

test.describe('table scroll region', () => {
  test('narrow: Tab reaches the region, ArrowRight scrolls it, and it is named by its caption', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await load(page, '/table-scroll');
    const wide = page.locator('#wide');
    await expect(wide).toHaveAttribute('tabindex', '0');
    await expect(wide).toHaveAttribute('role', 'region');
    expect(await wide.ariaSnapshot()).toContain('region "Quarterly figures"');
    await page.keyboard.press('Tab');
    await expect(wide).toBeFocused();
    expect(await wide.evaluate((el) => el.scrollLeft)).toBe(0);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => wide.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('narrow: a table with no caption is named by the default message', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await load(page, '/table-scroll');
    expect(await page.locator('#nameless').ariaSnapshot()).toContain('region "Table, scrolls sideways"');
  });

  test('a table that fits is not focusable and is not a region', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await load(page, '/table-scroll');
    const small = page.locator('#small');
    await expect(small).not.toHaveAttribute('tabindex', /./);
    await expect(small).not.toHaveAttribute('role', /./);
  });

  test('wide: nothing overflows, so nothing is focusable; narrowing and widening again toggles it', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 800 });
    await load(page, '/table-scroll');
    // The page is capped at 30rem, so widen the host to hold the table.
    await page.addStyleTag({ content: 'main { max-width: none !important; }' });
    await expect(page.locator('#wide')).not.toHaveAttribute('tabindex', /./);
    await page.keyboard.press('Tab');
    await expect(page.locator('#wide')).not.toBeFocused();
    await page.setViewportSize({ width: 480, height: 800 });
    await expect(page.locator('#wide')).toHaveAttribute('tabindex', '0');
    await page.setViewportSize({ width: 1600, height: 800 });
    await settle(page);
    await expect(page.locator('#wide')).not.toHaveAttribute('tabindex', /./);
    await expect(page.locator('#wide')).not.toHaveAttribute('role', /./);
  });
});
