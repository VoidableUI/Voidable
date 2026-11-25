// SPDX-License-Identifier: MIT
//
// Collapsible and accordion open and close with a height animation (a grid row
// going from 0fr to 1fr, no script measuring anything) and hide closed content
// the same way: out of the accessibility tree, and, where the browser supports
// hidden="until-found", openable by find-in-page and text fragments. Nothing
// animates under prefers-reduced-motion or with --void-anim-scale: 0.
import { test, expect, load, settle, type Page } from '../helpers/test';

const CASES = [
  { name: 'collapsible', host: '#co', trigger: '#co void-collapsible-trigger', content: '#co-content', needle: 'Zanzibar marmalade ledger' },
  { name: 'accordion', host: '#ac-1', trigger: '#ac-1 void-accordion-trigger', content: '#ac-1-content', needle: 'Quokka vermilion almanac' },
] as const;

/** Presses `trigger` and samples the height of `content` on every frame for `ms`. */
const sampleHeights = (page: Page, trigger: string, content: string, ms = 600) =>
  page.evaluate(
    ({ trigger, content, ms }) =>
      new Promise<number[]>((resolve) => {
        const el = document.querySelector(content) as HTMLElement;
        const out: number[] = [el.getBoundingClientRect().height];
        (document.querySelector(trigger) as HTMLElement).click();
        const t0 = performance.now();
        const tick = () => {
          out.push(el.getBoundingClientRect().height);
          if (performance.now() - t0 < ms) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    { trigger, content, ms },
  );

const strictlyBetween = (samples: number[]) => {
  const lo = Math.min(...samples);
  const hi = Math.max(...samples);
  return samples.filter((h) => h > lo + 1 && h < hi - 1);
};

for (const c of CASES) {
  test.describe(c.name, () => {
    test.beforeEach(async ({ page }) => {
      await load(page, '/disclosure-animation');
    });

    test('animates open and closed: the height passes through values in between', async ({ page }) => {
      // A starved main thread (a busy machine) can drop the frames of a 200 ms animation; measure again, up to three times.
      let opening: number[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        opening = await sampleHeights(page, c.trigger, c.content);
        if (strictlyBetween(opening).length >= 3) break;
        await sampleHeights(page, c.trigger, c.content);
      }
      const full = opening[opening.length - 1];
      expect(full).toBeGreaterThan(60);
      expect(opening[0]).toBeLessThanOrEqual(1);
      expect(strictlyBetween(opening).length, `opening heights ${opening.map(Math.round)}`).toBeGreaterThanOrEqual(3);
      // Monotonic: it never overshoots or jumps back.
      for (let i = 1; i < opening.length; i++) expect(opening[i]).toBeGreaterThanOrEqual(opening[i - 1] - 0.5);
      expect(Math.max(...opening)).toBeLessThanOrEqual(full + 0.5);
      let closing: number[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        closing = await sampleHeights(page, c.trigger, c.content);
        if (strictlyBetween(closing).length >= 3) break;
        await sampleHeights(page, c.trigger, c.content);
      }
      expect(strictlyBetween(closing).length, `closing heights ${closing.map(Math.round)}`).toBeGreaterThanOrEqual(3);
      expect(closing[closing.length - 1]).toBeLessThanOrEqual(1);
    });

    test('does not animate under prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await settle(page);
      const opening = await sampleHeights(page, c.trigger, c.content, 300);
      expect(strictlyBetween(opening), `opening heights ${opening.map(Math.round)}`).toEqual([]);
      expect(opening[opening.length - 1]).toBeGreaterThan(60);
      const closing = await sampleHeights(page, c.trigger, c.content, 300);
      expect(strictlyBetween(closing), `closing heights ${closing.map(Math.round)}`).toEqual([]);
      expect(closing[closing.length - 1]).toBeLessThanOrEqual(1);
    });

    test('--void-anim-scale: 0 turns the animation off and a larger scale slows it down', async ({ page }) => {
      await page.evaluate(() => document.documentElement.style.setProperty('--void-anim-scale', '0'));
      const off = await sampleHeights(page, c.trigger, c.content, 300);
      expect(strictlyBetween(off)).toEqual([]);
      await sampleHeights(page, c.trigger, c.content, 100);
      await page.evaluate(() => document.documentElement.style.setProperty('--void-anim-scale', '3'));
      const slow = await sampleHeights(page, c.trigger, c.content, 300);
      // 600 ms: 300 ms in, still opening.
      expect(slow[slow.length - 1]).toBeGreaterThan(1);
      const full = await page.evaluate((s) => (document.querySelector(s) as HTMLElement).scrollHeight, c.content);
      expect(slow[slow.length - 1]).toBeLessThan(full - 1);
    });

    test('closed content is not in the accessibility tree and its controls are not tabbable; open content is', async ({ page }) => {
      const tree = () => page.locator('body').ariaSnapshot();
      expect(await tree()).not.toContain(c.needle);
      await expect(page.locator(`${c.content} button`)).toBeHidden();
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      // The trigger, then past the closed content, never into it.
      expect(await page.evaluate(() => document.activeElement?.id || document.activeElement?.localName)).not.toMatch(/-btn$/);
      await page.locator(c.trigger).click();
      await expect(page.locator(`${c.content} button`)).toBeVisible();
      expect(await tree()).toContain(c.needle);
      await page.locator(c.trigger).click();
      await expect(page.locator(`${c.content} button`)).toBeHidden();
      expect(await tree()).not.toContain(c.needle);
    });

    test('closed content is marked hidden="until-found" once settled, and unmarked while open, where supported', async ({ page }) => {
      const supported = await page.evaluate(() => 'onbeforematch' in HTMLElement.prototype);
      const marked = () => page.evaluate((s) => document.querySelector(s)!.getAttribute('hidden'), c.content);
      if (!supported) {
        expect(await marked()).toBeNull();
        return;
      }
      await expect.poll(marked).toBe('until-found');
      await page.locator(c.trigger).click();
      await expect.poll(marked).toBeNull();
      await page.locator(c.trigger).click();
      // Not marked on the first frame of the closing animation (it would cut the content off), marked once it is over.
      await expect.poll(marked).toBe('until-found');
    });

    test('a text fragment to text inside closed content opens it', async ({ page, browserName }) => {
      // Firefox 148 has hidden="until-found" but did not fire beforematch for a text fragment in this suite.
      test.skip(browserName !== 'chromium', 'text fragments reveal until-found content in Chromium only');
      const supported = await page.evaluate(() => 'onbeforematch' in HTMLElement.prototype);
      test.skip(!supported, 'this browser has no hidden="until-found"');
      await page.goto('about:blank');
      await page.goto(`/disclosure-animation#:~:text=${encodeURIComponent(c.needle)}`);
      await page.waitForFunction(() => !!customElements.get('void-collapsible'));
      await expect(page.locator(c.host)).toHaveAttribute('open', '');
      await expect(page.locator(c.trigger)).toHaveAttribute('aria-expanded', 'true');
    });
  });
}

test.describe('accordion exclusivity with animation', () => {
  test('opening the second item closes the first and both end up as they should', async ({ page }) => {
    await load(page, '/disclosure-animation');
    await page.locator('#ac-1 void-accordion-trigger').click();
    await expect(page.locator('#ac-1')).toHaveAttribute('open', '');
    await page.locator('#ac-2 void-accordion-trigger').click();
    await expect(page.locator('#ac-1')).not.toHaveAttribute('open');
    await expect(page.locator('#ac-2')).toHaveAttribute('open', '');
    await expect.poll(() => page.evaluate(() => document.getElementById('ac-1-content')!.getBoundingClientRect().height)).toBeLessThanOrEqual(1);
  });
});
