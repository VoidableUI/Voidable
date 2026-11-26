// SPDX-License-Identifier: MIT
//
// Right-to-left layout (#29). Each check measures the same page in both
// directions and asserts by bounding box that the layout mirrors: what sits at
// the start edge in LTR sits at the start edge (the right) in RTL. Keyboard
// arrow direction and built-in strings are not covered here.
import { test, expect, load, settle, type Page } from '../helpers/test';

type Dir = 'ltr' | 'rtl';
type Box = { l: number; r: number };
const DIRS: Dir[] = ['ltr', 'rtl'];

async function setDir(page: Page, dir: Dir) {
  await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  await settle(page);
}

/** Left and right edges of the first element matching each selector, in `dir`. */
async function boxes(page: Page, dir: Dir, sels: Record<string, string>): Promise<Record<string, Box>> {
  await setDir(page, dir);
  return page.evaluate((s) => {
    const out: Record<string, { l: number; r: number }> = {};
    for (const [k, sel] of Object.entries(s)) {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`no element for ${sel}`);
      const b = el.getBoundingClientRect();
      out[k] = { l: b.left, r: b.right };
    }
    return out;
  }, sels);
}

/** `a` lies fully before `b` in the reading direction. */
const before = (dir: Dir, a: Box, b: Box) => (dir === 'ltr' ? a.r <= b.l + 1 : a.l >= b.r - 1);

/** Distance from `inner` to the start edge and to the end edge of `outer`. */
function gaps(dir: Dir, inner: Box, outer: Box) {
  const left = inner.l - outer.l;
  const right = outer.r - inner.r;
  return dir === 'ltr' ? { start: left, end: right } : { start: right, end: left };
}

async function expectOrder(page: Page, first: string, second: string, why: string) {
  for (const dir of DIRS) {
    const m = await boxes(page, dir, { first, second });
    expect(before(dir, m.first, m.second), `${why} (${dir})`).toBe(true);
  }
}

async function expectNearEnd(page: Page, inner: string, outer: string, why: string) {
  for (const dir of DIRS) {
    const m = await boxes(page, dir, { inner, outer });
    const g = gaps(dir, m.inner, m.outer);
    expect(g.end, `${why} (${dir})`).toBeLessThan(g.start);
  }
}

async function expectNearStart(page: Page, inner: string, outer: string, why: string) {
  for (const dir of DIRS) {
    const m = await boxes(page, dir, { inner, outer });
    const g = gaps(dir, m.inner, m.outer);
    expect(g.start, `${why} (${dir})`).toBeLessThan(g.end);
  }
}

test.describe('right-to-left layout', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/rtl');
  });

  test('number input: stepper buttons, prefix and unit swap sides', async ({ page }) => {
    const n = '#num .void-number-input-';
    await expectOrder(page, `${n}btn-dec`, `${n}prefix`, 'decrement button, then prefix');
    await expectOrder(page, `${n}prefix`, `${n}field`, 'prefix, then field');
    await expectOrder(page, `${n}field`, `${n}unit`, 'field, then unit');
    await expectOrder(page, `${n}unit`, `${n}btn-inc`, 'unit, then increment button');
  });

  test('action input: the button is at the end', async ({ page }) => {
    await expectOrder(page, '#act input', '#act .void-action-input-btn', 'field, then button');
  });

  test('checkbox and radio: the box is at the start edge, so on the right', async ({ page }) => {
    await expectNearStart(page, '#cb .void-checkbox-box', '#cb', 'checkbox box');
    await expectNearStart(page, '#rd .void-radio-circle', '#rd', 'radio circle');
  });

  test('alert: the close button is at the end edge and the text keeps clear of it', async ({ page }) => {
    await expectNearEnd(page, '#alert void-alert-close', '#alert', 'close button');
    await expectOrder(page, '#alert void-alert-description', '#alert void-alert-close', 'text, then close');
  });

  test('tabs run from the start edge', async ({ page }) => {
    await expectOrder(page, '#t1', '#t2', 'first tab before second');
    await expectOrder(page, '#t2', '#t3', 'second tab before third');
  });

  test('breadcrumbs run from the start edge', async ({ page }) => {
    await expectOrder(page, '#b1', '#b2', 'home before products');
    await expectOrder(page, '#b2', '#b3', 'products before details');
    // The separator is generated content at the start of every item but the
    // first, so the link starts after it, further from the start edge.
    for (const dir of DIRS) {
      const m = await boxes(page, dir, { item: '#b2', link: '#b2 a' });
      expect(gaps(dir, m.link, m.item).start, `separator room before the link (${dir})`).toBeGreaterThan(4);
    }
  });

  test('menu item: the shortcut is at the end edge', async ({ page }) => {
    await expectNearEnd(page, '#sc', '#mi', 'shortcut');
  });

  test('toast: the close button is at the end edge', async ({ page }) => {
    await expectNearEnd(page, '#tclose', '#toast', 'toast close');
  });

  test('table: header and cell text align to the start edge', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const r = await page.evaluate((d) => {
        const edge = (id: string) => {
          const cell = document.getElementById(id)!;
          const range = document.createRange();
          range.selectNodeContents(cell);
          const t = range.getBoundingClientRect();
          const c = cell.getBoundingClientRect();
          const left = t.left - c.left;
          const right = c.right - t.right;
          return d === 'ltr' ? { start: left, end: right } : { start: right, end: left };
        };
        return { th: edge('th'), td: edge('td') };
      }, dir);
      expect(r.th.start, `header text at start (${dir})`).toBeLessThan(r.th.end);
      expect(r.td.start, `cell text at start (${dir})`).toBeLessThan(r.td.end);
    }
  });

  test('pagination: previous, pages and next run in the reading direction', async ({ page }) => {
    await expectOrder(page, '#pg [aria-label="Previous page"]', '#pg [aria-current="page"]', 'previous before the current page');
    await expectOrder(page, '#pg [aria-current="page"]', '#pg [aria-label="Next page"]', 'current page before next');
  });

  test('switch: the checked thumb sits at the end edge', async ({ page }) => {
    await expectNearEnd(page, '#sw .void-switch-thumb', '#sw .void-switch-track', 'checked thumb');
  });

  test('select: the room for the arrow is at the end edge', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const r = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#sel select')!);
        return { left: parseFloat(s.paddingLeft), right: parseFloat(s.paddingRight) };
      });
      if (dir === 'ltr') expect(r.right).toBeGreaterThan(r.left);
      else expect(r.left).toBeGreaterThan(r.right);
    }
  });

  test('side navigation: the sidebar is at the start edge and its rule faces the content', async ({ page }) => {
    for (const dir of DIRS) {
      const m = await boxes(page, dir, { sb: '#sb', main: '#main' });
      expect(before(dir, m.sb, m.main), `sidebar before content (${dir})`).toBe(true);
      const rule = await page.evaluate(() => {
        const cs = getComputedStyle(document.getElementById('sb')!);
        return { left: parseFloat(cs.borderLeftWidth), right: parseFloat(cs.borderRightWidth) };
      });
      // The rule is on the inner edge, the side that faces the content.
      if (dir === 'ltr') { expect(rule.right).toBeGreaterThan(0); expect(rule.left).toBe(0); }
      else { expect(rule.left).toBeGreaterThan(0); expect(rule.right).toBe(0); }
    }
  });
});
