// SPDX-License-Identifier: MIT
//
// void-split > [sticky] and [sticky="always"]: bare sticky is unchanged at both
// widths; "always" stays stuck at the top for the length of a stacked split,
// clears an offset, honours its height cap and lets go where the split ends.
import { test, expect, load, type Page } from '../helpers/test';

const WIDE = { width: 1000, height: 800 };
const NARROW = { width: 390, height: 700 };

/** Scrolls so `dy` px of the split are above the viewport top; returns the measures after. */
async function at(page: Page, id: string, dy: number) {
  return page.evaluate(
    ({ id, dy }) => {
      const split = document.getElementById(id)!;
      window.scrollTo(0, split.getBoundingClientRect().top + window.scrollY + dy);
      const r = (el: Element) => el.getBoundingClientRect();
      const s = document.getElementById(`${id}-s`)!;
      const l = document.getElementById(`${id}-l`)!;
      const cs = getComputedStyle(s);
      return {
        sTop: r(s).top, sBottom: r(s).bottom, sHeight: r(s).height, sLeft: r(s).left,
        lLeft: r(l).left, splitBottom: r(split).bottom,
        position: cs.position, top: parseFloat(cs.top), z: cs.zIndex,
        bg: cs.backgroundColor, overflowY: cs.overflowY, scrollH: s.scrollHeight, clientH: s.clientHeight,
        vh: window.innerHeight,
      };
    },
    { id, dy },
  );
}

test.describe('wide', () => {
  test.use({ viewport: WIDE });
  test.beforeEach(async ({ page }) => load(page, '/split-sticky'));

  for (const id of ['bare', 'always']) {
    test(`${id}: sticks beside the list, at the group gap`, async ({ page }) => {
      const m = await at(page, id, 400);
      expect(m.position).toBe('sticky');
      expect(m.sTop).toBeCloseTo(m.top, 0);
      expect(m.top).toBeGreaterThan(0);
      expect(m.sLeft).toBeLessThan(m.lLeft);
      expect(m.sHeight).toBeCloseTo(96, 0);
    });
  }

  test('always and bare agree on a wide screen', async ({ page }) => {
    const a = await at(page, 'bare', 400);
    const b = await at(page, 'always', 400);
    expect(b.top).toBe(a.top);
    expect(b.z).toBe(a.z);
    expect(b.bg).toBe(a.bg);
    expect(b.overflowY).toBe(a.overflowY);
  });

  test('the offset is added to the group gap', async ({ page }) => {
    const a = await at(page, 'always', 400);
    const o = await at(page, 'offset', 400);
    expect(o.top).toBeCloseTo(a.top + 48, 0);
  });

  test('the cap does not apply beside the list', async ({ page }) => {
    const m = await at(page, 'cap', 400);
    expect(m.sHeight).toBeCloseTo(640, 0);
  });
});

test.describe('narrow', () => {
  test.use({ viewport: NARROW });
  test.beforeEach(async ({ page }) => load(page, '/split-sticky'));

  test('bare sticky is static and scrolls away', async ({ page }) => {
    const m = await at(page, 'bare', 400);
    expect(m.position).toBe('static');
    expect(m.sTop).toBeCloseTo(-400, 0);
  });

  test('always stays at the top while the list scrolls to its end', async ({ page }) => {
    for (const dy of [200, 700]) expect((await at(page, 'always', dy)).sTop).toBeCloseTo(0, 0);
    // Scroll until the end of the list is at the bottom of the viewport.
    const end = await page.evaluate(() => {
      const l = document.getElementById('always-l')!.getBoundingClientRect();
      window.scrollTo(0, l.bottom + window.scrollY - window.innerHeight);
      return {
        top: document.getElementById('always-s')!.getBoundingClientRect().top,
        listBottom: document.getElementById('always-l')!.getBoundingClientRect().bottom,
        vh: window.innerHeight,
      };
    });
    expect(end.listBottom).toBeCloseTo(end.vh, 0);
    expect(end.top).toBeCloseTo(0, 0);
  });

  test('always has a surface and a layer above the content', async ({ page }) => {
    const m = await at(page, 'always', 400);
    expect(m.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(Number(m.z)).toBeGreaterThan(0);
  });

  test('always lets go where the split ends', async ({ page }) => {
    const m = await page.evaluate(() => {
      const split = document.getElementById('always')!;
      // The split's end is 100px above the viewport bottom.
      window.scrollTo(0, split.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 100);
      const s = document.getElementById('always-s')!.getBoundingClientRect();
      return { sBottom: s.bottom, splitBottom: split.getBoundingClientRect().bottom, vh: window.innerHeight };
    });
    expect(m.splitBottom).toBeCloseTo(m.vh - 100, 0);
    expect(m.sBottom).toBeLessThanOrEqual(m.splitBottom + 1);
  });

  test('--void-split-sticky-top puts it below a sticky header', async ({ page }) => {
    const m = await at(page, 'offset', 400);
    expect(m.sTop).toBeCloseTo(48, 0);
    const head = await page.evaluate(() => document.getElementById('head')!.getBoundingClientRect().bottom);
    expect(m.sTop).toBeGreaterThanOrEqual(head - 1);
  });

  test('the height cap holds and the child scrolls inside it', async ({ page }) => {
    const m = await at(page, 'cap', 400);
    expect(m.sHeight).toBeLessThanOrEqual(160 + 1);
    expect(m.overflowY).toBe('auto');
    expect(m.scrollH).toBeGreaterThan(m.clientH);
    expect(m.sTop).toBeCloseTo(0, 0);
  });

  test('the default cap is half the screen', async ({ page }) => {
    const m = await at(page, 'cap-default', 400);
    expect(m.sHeight).toBeLessThanOrEqual(m.vh / 2 + 1);
    expect(m.sHeight).toBeGreaterThan(m.vh / 2 - 40);
  });

  test('the stacked split is one column', async ({ page }) => {
    const m = await at(page, 'always', 400);
    expect(m.sLeft).toBeCloseTo(m.lLeft, 0);
  });
});

test.describe('right to left', () => {
  for (const [name, viewport] of [['wide', WIDE], ['narrow', NARROW]] as const) {
    test.describe(name, () => {
      test.use({ viewport });
      test.beforeEach(async ({ page }) => {
        await load(page, '/split-sticky');
        await page.evaluate(() => (document.documentElement.dir = 'rtl'));
      });

      test('the sticky child still sticks, and the columns mirror', async ({ page }) => {
        const m = await at(page, 'always', 400);
        if (name === 'wide') {
          expect(m.sTop).toBeCloseTo(m.top, 0);
          expect(m.sLeft).toBeGreaterThan(m.lLeft);
        } else {
          expect(m.sTop).toBeCloseTo(0, 0);
          expect(m.sLeft).toBeCloseTo(m.lLeft, 0);
        }
      });
    });
  }
});
