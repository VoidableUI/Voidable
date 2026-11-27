// SPDX-License-Identifier: MIT
//
// void-alert-actions (#117): a CSS-only part for the buttons of an alert (Retry, Sign in again,
// Undo), laid out like the banner's and the card's actions. It works in every colour and variant,
// with and without a close part, wraps at narrow widths, never overlaps the close control, and
// reads in the order title, description, actions, close (Tab follows the markup, so the close
// control comes last).
import { test, expect, load, type Page } from '../helpers/test';

const rect = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const r = document.querySelector(s)!.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }, sel);

const overlaps = (a: { top: number; left: number; right: number; bottom: number }, b: { top: number; left: number; right: number; bottom: number }) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test.describe('alert actions', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/alert-actions');
  });

  test('the part is CSS-only: never defined, nodes unmoved, in the author\'s order', async ({ page }) => {
    expect(await page.evaluate(() => customElements.get('void-alert-actions'))).toBeUndefined();
    expect(await page.evaluate(() => [...document.querySelector('#a-plain')!.children].map((c) => c.localName))).toEqual([
      'void-alert-title', 'void-alert-description', 'void-alert-actions', 'void-alert-close',
    ]);
  });

  test('actions sit below the text inside the alert and never overlap the close control', async ({ page }) => {
    for (const id of ['a-plain', 'a-filled', 'a-warning', 'a-narrow']) {
      const alert = await rect(page, `#${id}`);
      const actions = await rect(page, `#${id} void-alert-actions`);
      const close = await rect(page, `#${id} void-alert-close`);
      const description = await rect(page, `#${id} void-alert-description`);
      expect(overlaps(actions, close), `${id}: actions overlap the close control`).toBe(false);
      expect(actions.top, `${id}: actions below the text`).toBeGreaterThanOrEqual(description.bottom - 0.5);
      expect(actions.left).toBeGreaterThanOrEqual(alert.left);
      expect(actions.right).toBeLessThanOrEqual(alert.right);
      expect(actions.bottom).toBeLessThanOrEqual(alert.bottom);
    }
  });

  test('actions sit at the trailing edge, with and without a close part', async ({ page }) => {
    for (const id of ['a-plain', 'a-nodismiss', 'a-default', 'a-caution', 'a-notice', 'a-highlight', 'a-filled']) {
      const alert = await rect(page, `#${id}`);
      const last = await rect(page, `#${id} void-alert-actions void-button:last-child`);
      const dismissible = await page.evaluate((i) => !!document.querySelector(`#${i} void-alert-close`), id);
      // Trailing edge: the last button ends at the alert's content edge (padding, plus room for a close control).
      expect(alert.right - last.right, id).toBeGreaterThan(8);
      expect(alert.right - last.right, id).toBeLessThan(dismissible ? 80 : 40);
    }
  });

  test('buttons are small unless one asks for large', async ({ page }) => {
    const sm = (await rect(page, '#ref-sm')).height;
    const md = (await rect(page, '#ref-md')).height;
    expect(sm).toBeLessThan(md);
    expect((await rect(page, '#a-plain-retry')).height).toBeCloseTo(sm, 0);
    expect((await rect(page, '#a-nodismiss-btn')).height).toBeCloseTo(sm, 0);
    expect((await rect(page, '#a-lg void-button')).height).toBeGreaterThan(md);
  });

  test('wraps at a narrow width without overflowing the alert', async ({ page }) => {
    const alert = await rect(page, '#a-narrow');
    const buttons = await page.evaluate(() => [...document.querySelectorAll('#a-narrow void-alert-actions void-button')].map((b) => {
      const r = b.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    }));
    expect(new Set(buttons.map((b) => Math.round(b.top))).size, 'buttons wrapped onto more than one row').toBeGreaterThan(1);
    for (const b of buttons) {
      expect(b.left).toBeGreaterThanOrEqual(alert.left);
      expect(b.right).toBeLessThanOrEqual(alert.right + 0.5);
    }
    expect(await page.evaluate(() => { const a = document.querySelector('#a-narrow')!; return a.scrollWidth <= a.clientWidth; })).toBe(true);
  });

  test('Tab reads title, description, actions, then the close control', async ({ page }) => {
    await page.locator('#before').focus();
    for (const id of ['a-plain-retry', 'a-plain-more', 'a-plain-close']) {
      await page.keyboard.press('Tab');
      await expect(page.locator(`#${id}`)).toBeFocused();
    }
  });

  test('an action button works and the close control still dismisses', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__n = 0;
      document.querySelector('#a-plain-retry')!.addEventListener('click', () => (window as any).__n++);
    });
    await page.locator('#a-plain-retry').click();
    expect(await page.evaluate(() => (window as any).__n)).toBe(1);
    await expect(page.locator('#a-plain')).toBeVisible();
    await page.locator('#a-plain-close').click();
    await expect(page.locator('#a-plain')).toHaveCount(0);
  });
});
