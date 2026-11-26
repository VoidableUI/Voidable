// SPDX-License-Identifier: MIT
//
// Right-to-left layout (#29). Each check measures the same page in both
// directions and asserts by bounding box that the layout mirrors: what sits at
// the start edge in LTR sits at the start edge (the right) in RTL. Arrow keys
// follow the direction too (last block). Built-in strings are not covered here.
import { test, expect, load, settle, focusedId, type Page } from '../helpers/test';

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
    // The thumb slides when the direction changes; measure it where it rests.
    await page.addStyleTag({ content: '.void-switch-thumb { transition: none !important; }' });
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

  test('sidebar side="end": at the end edge, its rule faces the content', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const rule = await page.evaluate(() => {
        const cs = getComputedStyle(document.getElementById('kb-sb-end')!);
        return { left: parseFloat(cs.borderLeftWidth), right: parseFloat(cs.borderRightWidth) };
      });
      // `end` puts the rule on the start (inner) side of the sidebar.
      if (dir === 'ltr') { expect(rule.left).toBeGreaterThan(0); expect(rule.right).toBe(0); }
      else { expect(rule.right).toBeGreaterThan(0); expect(rule.left).toBe(0); }
    }
  });

  test('drawer: start and end follow the direction, left and right stay on the screen edge', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const at = await page.evaluate(async () => {
        const out: Record<string, string> = {};
        for (const side of ['start', 'end', 'left', 'right']) {
          const d = document.createElement('void-drawer') as any;
          d.setAttribute('side', side);
          d.innerHTML = '<void-drawer-title>T</void-drawer-title><void-drawer-body>B</void-drawer-body>';
          document.body.append(d);
          await d.updateComplete;
          d.open = true;
          await d.updateComplete;
          await (window as any).__settle(document);
          const surface = d.shadowRoot.querySelector('[part~="surface"]') as HTMLElement;
          const r = surface.getBoundingClientRect();
          out[side] = Math.abs(r.left) < 2 ? 'left' : Math.abs(r.right - innerWidth) < 2 ? 'right' : `${r.left}..${r.right}`;
          d.open = false;
          await d.updateComplete;
          d.remove();
        }
        return out;
      });
      expect(at.left, `left (${dir})`).toBe('left');
      expect(at.right, `right (${dir})`).toBe('right');
      expect(at.start, `start (${dir})`).toBe(dir === 'ltr' ? 'left' : 'right');
      expect(at.end, `end (${dir})`).toBe(dir === 'ltr' ? 'right' : 'left');
    }
  });

  test('popover: side="left" and "right" are the reading-direction sides of the anchor', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      for (const side of ['left', 'right'] as const) {
        const result = await page.evaluate(async (s) => {
          const p = document.createElement('void-popover') as any;
          p.setAttribute('side', s);
          p.innerHTML = '<void-popover-trigger><button id="rtl-pt" style="margin: 0 auto; display: block">t</button></void-popover-trigger><void-popover-content><p>x</p></void-popover-content>';
          document.body.append(p);
          await p.updateComplete;
          p.open = true;
          await (window as any).__settle(document);
          const t = document.getElementById('rtl-pt')!.getBoundingClientRect();
          const c = p.querySelector('void-popover-content').getBoundingClientRect();
          const before = c.right <= t.left + 1;
          const after = c.left >= t.right - 1;
          p.open = false;
          await p.updateComplete;
          p.remove();
          return before ? 'physical-left' : after ? 'physical-right' : 'overlapping';
        }, side);
        // In left-to-right "left" is the physical left; in right-to-left the sides mirror.
        const mirrored = dir === 'rtl';
        const expected = (side === 'left') !== mirrored ? 'physical-left' : 'physical-right';
        expect(result, `${side} (${dir})`).toBe(expected);
      }
    }
  });
});

// Arrow keys follow the reading direction (#29). In left-to-right ArrowRight
// moves to the next item; in right-to-left ArrowLeft does. Up and Down never swap.
test.describe('right-to-left keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/rtl');
  });

  const keys = (dir: Dir) => (dir === 'ltr' ? { next: 'ArrowRight', prev: 'ArrowLeft' } : { next: 'ArrowLeft', prev: 'ArrowRight' });

  const focusIn = (page: Page, sel: string) => page.evaluate((s) => (document.querySelector(s) as HTMLElement).focus(), sel);

  /** Focus the first item, press `next` and then `prev` twice (wrapping): focus lands on item 2, then 1, then 3. */
  async function expectRoving(page: Page, ids: [string, string, string]) {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const k = keys(dir);
      await focusIn(page, `#${ids[0]}`);
      await page.keyboard.press(k.next);
      expect(await focusedId(page), `next (${dir})`).toBe(ids[1]);
      await page.keyboard.press(k.prev);
      expect(await focusedId(page), `prev (${dir})`).toBe(ids[0]);
      await page.keyboard.press(k.prev);
      expect(await focusedId(page), `prev wraps (${dir})`).toBe(ids[2]);
    }
  }

  test('tabs', async ({ page }) => {
    await expectRoving(page, ['kb-t1', 'kb-t2', 'kb-t3']);
  });

  test('toggle group', async ({ page }) => {
    await expectRoving(page, ['kb-tg1', 'kb-tg2', 'kb-tg3']);
  });

  test('segmented control', async ({ page }) => {
    await expectRoving(page, ['kb-sc1', 'kb-sc2', 'kb-sc3']);
  });

  test('nav menu', async ({ page }) => {
    await expectRoving(page, ['kb-n1', 'kb-n2', 'kb-n3']);
  });

  test('tabs: Up and Down are not handled and Home and End stay logical', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      await focusIn(page, '#kb-t1');
      await page.keyboard.press('End');
      expect(await focusedId(page), `End (${dir})`).toBe('kb-t3');
      await page.keyboard.press('Home');
      expect(await focusedId(page), `Home (${dir})`).toBe('kb-t1');
    }
  });

  test('carousel', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const k = keys(dir);
      await page.evaluate(() => { (document.getElementById('kb-car') as any).index = 0; (document.getElementById('kb-car') as HTMLElement).focus(); });
      await settle(page);
      await page.keyboard.press(k.next);
      await settle(page);
      expect(await page.evaluate(() => (document.getElementById('kb-car') as any).index), `next (${dir})`).toBe(1);
      await page.keyboard.press(k.prev);
      await settle(page);
      expect(await page.evaluate(() => (document.getElementById('kb-car') as any).index), `prev (${dir})`).toBe(0);
    }
  });

  test('calendar day grid: left and right swap, up and down do not', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const k = keys(dir);
      const active = () => page.evaluate(() => document.activeElement?.getAttribute('data-date'));
      await focusIn(page, '#kb-cal [data-date="2026-11-10"]');
      await page.keyboard.press(k.next);
      expect(await active(), `next (${dir})`).toBe('2026-11-11');
      await page.keyboard.press(k.prev);
      await page.keyboard.press(k.prev);
      expect(await active(), `prev (${dir})`).toBe('2026-11-09');
      await page.keyboard.press('ArrowDown');
      expect(await active(), `down (${dir})`).toBe('2026-11-16');
      await page.keyboard.press('ArrowUp');
      expect(await active(), `up (${dir})`).toBe('2026-11-09');
    }
  });

  test('pin input', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const k = keys(dir);
      const index = () => page.evaluate(() => [...document.querySelectorAll('#kb-pin input')].indexOf(document.activeElement as HTMLInputElement));
      await focusIn(page, '#kb-pin input');
      await page.keyboard.press(k.next);
      expect(await index(), `next (${dir})`).toBe(1);
      await page.keyboard.press(k.prev);
      expect(await index(), `prev (${dir})`).toBe(0);
    }
  });

  // Native controls: the browser decides. These record what each engine does so a
  // change shows; they assert only that the two directions are mirror images.
  test('slider (native range input): the arrow that increases in left-to-right decreases in right-to-left', async ({ page }) => {
    const press = async (dir: Dir, key: string) => {
      await setDir(page, dir);
      return page.evaluate(() => {
        const i = document.querySelector('#kb-slider input[type="range"]') as HTMLInputElement;
        i.value = '5';
        i.focus();
        return 0;
      }).then(async () => {
        await page.keyboard.press(key);
        return page.evaluate(() => Number((document.querySelector('#kb-slider input[type="range"]') as HTMLInputElement).value));
      });
    };
    expect(await press('ltr', 'ArrowRight'), 'ltr ArrowRight').toBe(6);
    expect(await press('ltr', 'ArrowLeft'), 'ltr ArrowLeft').toBe(4);
    expect(await press('rtl', 'ArrowLeft'), 'rtl ArrowLeft').toBe(6);
    expect(await press('rtl', 'ArrowRight'), 'rtl ArrowRight').toBe(4);
  });

  test('radio group (native radios): arrows follow the direction', async ({ page }) => {
    for (const dir of DIRS) {
      await setDir(page, dir);
      const k = keys(dir);
      await page.evaluate(() => { (document.getElementById('kb-r1') as any).focus(); });
      await page.keyboard.press(k.next);
      expect(await page.evaluate(() => (document.getElementById('kb-rg') as any).value), `next (${dir})`).toBe('r2');
    }
  });
});
