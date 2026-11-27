// SPDX-License-Identifier: MIT
//
// An overlay opened from a trigger in the bottom-left footer of a sidebar (a fixed, transformed column with a
// scroll container beside it) opens next to the trigger and flips upward; and a page rule that pins the panel's
// edge to the viewport (an inset on the content, which anchor positioning does not override) is reported
// to the developer instead of silently sending the panel to a screen corner.
import { test, expect, load, settle, expectAnimationsDone, type Page } from '../helpers/test';

const kinds = {
  popover: { trigger: '#pop-t', panel: '#pop void-popover-content', how: 'click' },
  'dropdown-menu': { trigger: '#menu-t', panel: '#menu void-dropdown-menu-content', how: 'click' },
  'hover-card': { trigger: '#card-t', panel: '#card void-hover-card-content', how: 'hover' },
  tooltip: { trigger: '#tip-t', panel: '#tip void-tooltip-content', how: 'hover' },
} as const;

async function open(page: Page, k: (typeof kinds)[keyof typeof kinds]) {
  if (k.how === 'click') await page.locator(k.trigger).click();
  else {
    await page.mouse.move(640, 300);
    await page.locator(k.trigger).hover();
  }
  await expect(page.locator(k.panel)).toBeVisible();
  await expectAnimationsDone(page.locator(k.panel));
  await settle(page);
}

const boxes = (page: Page, k: (typeof kinds)[keyof typeof kinds]) =>
  page.evaluate(
    ([p, t]) => {
      const r = (e: Element) => e.getBoundingClientRect();
      const panel = r(document.querySelector(p!)!);
      const trigger = r(document.querySelector(t!)!);
      return { panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom }, trigger: { left: trigger.left, right: trigger.right, top: trigger.top, bottom: trigger.bottom } };
    },
    [k.panel, k.trigger],
  );

test.describe('opened from the bottom-left footer of a sidebar', () => {
  for (const [name, k] of Object.entries(kinds)) {
    test(`${name} opens above its trigger, horizontally next to it`, async ({ page }) => {
      await load(page, '/overlay-sidebar');
      await open(page, k);
      const { panel, trigger } = await boxes(page, k);
      expect(panel.bottom, 'above the trigger').toBeLessThanOrEqual(trigger.top + 0.5);
      // Overlaps the trigger's horizontal extent: next to it, not in a screen corner.
      expect(panel.left).toBeLessThanOrEqual(trigger.right);
      expect(panel.right).toBeGreaterThanOrEqual(trigger.left);
      expect(panel.left).toBeLessThan(400);
    });
  }
});

test.describe('a page rule that pins the panel to a viewport edge', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const warnings: { kind: string; tag: string; message: string }[] = [];
      (globalThis as any)[Symbol.for('voidable.dev')] = { report: (w: { kind: string; tag: string; message: string }) => warnings.push(w) };
      (window as any).__devWarnings = warnings;
    });
  });

  test('is reported to the developer', async ({ page }) => {
    await load(page, '/overlay-sidebar?inset=right');
    await open(page, kinds.popover);
    await expect.poll(() => page.evaluate(() => (window as any).__devWarnings.map((w: any) => w.kind))).toContain('misplaced-overlay');
    const message = await page.evaluate(() => (window as any).__devWarnings.find((w: any) => w.kind === 'misplaced-overlay').message);
    expect(message).toMatch(/inset|left|right|top|bottom/);
    expect(message).toMatch(/void-popover-content/);
  });

  test('a correctly placed panel is not reported', async ({ page }) => {
    await load(page, '/overlay-sidebar');
    await open(page, kinds.popover);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__devWarnings)).toEqual([]);
  });
});
