// SPDX-License-Identifier: MIT
//
// `@voidable/ui/testing` (#54): the readiness signal (`data-void-ready` and the
// Playwright helper) and the animation-off switch, used the way an application's own
// tests use them.
import { animationsOff, gotoReady, voidReady } from '@voidable/ui/testing';
import { test, expect } from '../helpers/test';

test.describe('readiness', () => {
  test('html[data-void-ready] is set once the components have rendered, with no script in the test', async ({ page }) => {
    await page.goto('/pickers?testing');
    await expect(page.locator('html[data-void-ready]')).toHaveCount(1);
    // Ready means defined and rendered: the select has its projected control.
    expect(await page.evaluate(() => (document.getElementById('select') as any).hasUpdated)).toBe(true);
    expect(await page.evaluate(() => !!customElements.get('void-multiselect'))).toBe(true);
  });

  test('an element added later clears the attribute until it has rendered', async ({ page }) => {
    await page.goto('/pickers?testing');
    await expect(page.locator('html[data-void-ready]')).toHaveCount(1);
    const during = await page.evaluate(async () => {
      document.body.insertAdjacentHTML('beforeend', '<void-badge id="late">Late</void-badge>');
      // The watcher runs in a microtask after the insertion, before any test step could look.
      await Promise.resolve();
      return document.documentElement.hasAttribute('data-void-ready');
    });
    expect(during).toBe(false);
    await expect(page.locator('html[data-void-ready]')).toHaveCount(1);
    expect(await page.evaluate(() => (document.getElementById('late') as any).hasUpdated)).toBe(true);
  });

  test('voidReady waits for a script that arrives late', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/build/ui.js', async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/pickers', { waitUntil: 'commit' });
    await page.waitForFunction(() => !!document.getElementById('after'), undefined, { polling: 50 });
    expect(await page.evaluate(() => customElements.get('void-select'))).toBeUndefined();
    release();
    await voidReady(page);
    expect(await page.evaluate(() => !!customElements.get('void-select') && (document.getElementById('multiselect') as any).hasUpdated)).toBe(true);
  });

  test('voidReady names what it was waiting for when it times out', async ({ page }) => {
    await page.goto('/blank');
    await expect(voidReady(page, { expect: ['void-not-registered'], timeout: 300 })).rejects.toThrow(/waiting for <void-not-registered> to be defined/);
  });

  test('gotoReady opens a page and waits for the components', async ({ page }) => {
    await gotoReady(page, '/pickers');
    expect(await page.evaluate(() => (document.getElementById('combobox') as any).hasUpdated)).toBe(true);
  });
});

test.describe('animations off', () => {
  test('sets the theme knob to 0 for the document and for the navigations after it', async ({ page }) => {
    await animationsOff(page);
    await gotoReady(page, '/disclosure-animation');
    const scale = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--void-anim-scale').trim());
    expect(await scale()).toBe('0');
    await gotoReady(page, '/pickers');
    expect(await scale()).toBe('0');
  });

  test('a collapsible opens in one step', async ({ page }) => {
    await animationsOff(page);
    await gotoReady(page, '/disclosure-animation');
    const heights = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const content = document.querySelector('#co-content') as HTMLElement;
          const out = [content.getBoundingClientRect().height];
          (document.querySelector('#co void-collapsible-trigger') as HTMLElement).click();
          let frames = 0;
          const tick = () => {
            out.push(content.getBoundingClientRect().height);
            if (++frames < 12) requestAnimationFrame(tick);
            else resolve(out);
          };
          requestAnimationFrame(tick);
        }),
    );
    const open = heights[heights.length - 1]!;
    expect(open).toBeGreaterThan(60);
    // No frame between closed and fully open.
    expect(heights.filter((h) => h > 1 && h < open - 1)).toEqual([]);
  });

  test('a chart draws in at once', async ({ page }) => {
    await animationsOff(page);
    await gotoReady(page, '/charts');
    expect(await page.evaluate(() => [...document.querySelectorAll('*')].some((el: any) => el._phase === 'pre' || el._phase === 'animating'))).toBe(false);
  });

  test('a toast still closes on its timer: auto-dismiss is not an animation', async ({ page }) => {
    await animationsOff(page);
    await gotoReady(page, '/disclosure-notices');
    const { reason, elapsed } = await page.evaluate(
      () =>
        new Promise<{ reason: string; elapsed: number }>((resolve) => {
          const started = performance.now();
          const t = (window as any).VoidUI.toast({ description: 'Saved', duration: 600 });
          t.addEventListener('void-close', (e: CustomEvent) => resolve({ reason: e.detail.reason, elapsed: performance.now() - started }));
        }),
    );
    expect(reason).toBe('timeout');
    expect(elapsed).toBeGreaterThanOrEqual(550);
  });
});
