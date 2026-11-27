// SPDX-License-Identifier: MIT
//
// Touch targets (#100): under a coarse pointer every control's hit area is at least
// --void-hit-target (44px) without its drawn size changing. A real tap lands just outside
// the drawn box and must still activate the control; in a dense group a tap between two
// controls goes to the nearer one; with a fine pointer nothing is added.
//
// The coarse pointer is emulated per engine (touch plus mobile emulation in Chromium and
// WebKit, the primary-pointer preference in Firefox), and every test first asserts that
// `(pointer: coarse)` really matches, so a run that emulated nothing fails instead of passing.
import { test as base, expect, load, settle, type Page } from '../helpers/test';

type Pt = { x: number; y: number; width: number; height: number };
type Side = 'top' | 'bottom' | 'left' | 'right';

const coarse = base.extend({
  context: async ({ browser, browserName, playwright, baseURL }, use) => {
    const options = { baseURL, hasTouch: true, viewport: { width: 1000, height: 800 }, ...(browserName === 'firefox' ? {} : { isMobile: true }) };
    if (browserName === 'firefox') {
      // Firefox cannot emulate a mobile device; its primary pointer is a preference (1 is coarse).
      const own = await playwright.firefox.launch({ firefoxUserPrefs: { 'ui.primaryPointerCapabilities': 1, 'ui.allPointerCapabilities': 1 } });
      const context = await own.newContext(options);
      await use(context);
      await context.close();
      await own.close();
      return;
    }
    const context = await browser.newContext(options);
    await use(context);
    await context.close();
  },
});

/** Records, for each click, whether it landed on the element held in `__target`. */
async function arm(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    if (w.__armed) return;
    w.__armed = true;
    document.addEventListener(
      'click',
      (e) => {
        const t = w.__target as Element | null;
        const hit = e.composedPath()[0] as Node;
        w.__hit = !!t && (t === hit || t.contains(hit));
        const el = hit as Element;
        w.__hitDesc = `${el.localName}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className}` : ''}`;
      },
      true,
    );
  });
}

async function rect(page: Page, selector: string): Promise<Pt> {
  return page.locator(selector).first().evaluate((el) => {
    // Scroll only when it is not in view, so two neighbours measured one after the other do not move between.
    const before = el.getBoundingClientRect();
    if (before.top < 60 || before.bottom > innerHeight - 60 || before.left < 0 || before.right > innerWidth) el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

function outside(r: Pt, side: Side, gap: number): { x: number; y: number } {
  if (side === 'bottom') return { x: r.x + r.width / 2, y: r.y + r.height + gap };
  if (side === 'top') return { x: r.x + r.width / 2, y: r.y - gap };
  if (side === 'right') return { x: r.x + r.width + gap, y: r.y + r.height / 2 };
  return { x: r.x - gap, y: r.y + r.height / 2 };
}

/**
 * Clicks at an exact point and reports whether the click landed on `selector` (null: no click at all).
 *
 * It is a pointer click, not `touchscreen.tap`, on purpose: the engines adjust a touch tap to the nearest
 * control within a finger's radius, which would find a control whose hit area never grew. A click goes to
 * exactly what hit-testing says is under the point, which is what the hit area is. One test below does tap.
 */
async function tapAt(page: Page, selector: string, point: { x: number; y: number }): Promise<boolean | null> {
  await page.evaluate((sel) => {
    const w = window as any;
    w.__target = document.querySelector(sel);
    w.__hit = null;
  }, selector);
  await page.mouse.click(point.x, point.y);
  await settle(page);
  return page.evaluate(() => (window as any).__hit);
}

/** What the last click landed on, for failure messages. */
async function landedOn(page: Page): Promise<string> {
  return page.evaluate(() => String((window as any).__hitDesc));
}

async function matches(page: Page, query: string): Promise<boolean> {
  return page.evaluate((q) => matchMedia(q).matches, query);
}

/** Controls whose hit area grows past the drawn box: [name, selector, the sides to tap just outside]. */
const GROWN: Array<[string, string, Side[]]> = [
  ['button', '#b-md', ['bottom', 'top']],
  ['small button', '#b-sm', ['bottom', 'top']],
  ['icon button', '#b-icon', ['bottom', 'right', 'left']],
  ['checkbox', '#cb', ['bottom', 'top']],
  ['radio', '#rd', ['bottom']],
  ['switch', '#sw', ['bottom', 'top']],
  ['toggle', '#tg', ['bottom', 'top']],
  ['hamburger', '#hb', ['bottom', 'right']],
  ['tag remove', '#tag .void-tag-close', ['bottom', 'right']],
  ['alert close', '#alert-close > button', ['bottom', 'right']],
  ['code copy', '#code-copy > button', ['bottom', 'left']],
  ['banner close', '#banner-close > button', ['bottom', 'right']],
  ['toast close', '#toast-close > button', ['bottom', 'right']],
  ['breadcrumb link', '#bc-home', ['bottom', 'top']],
  ['pagination button', '#pg .void-pagination-btn:nth-of-type(3)', ['bottom', 'top']],
  ['tab', '#tab-two', ['top']],
  ['calendar previous', '#cal .void-calendar-nav', ['bottom']],
  ['carousel previous', '#car-prev', ['bottom', 'top']],
  ['carousel next', '#car-next', ['bottom', 'top']],
  ['table sort', '#tbl th[data-sort] > button', ['bottom']],
  ['table row checkbox', '#row-cb', ['bottom', 'top']],
];

/** Controls whose own box reaches the minimum (a pseudo-element could not grow them: their neighbours touch). */
const BOXES: Array<[string, string]> = [
  ['accordion trigger', '#acc-t'],
  ['menu item', '#mi-1'],
  ['large button', '#b-lg'],
  ['pin cell', '#pin .void-pin-cell'],
];

coarse.describe('coarse pointer', () => {
  coarse.beforeEach(async ({ page }) => {
    await load(page, '/touch-targets');
    expect(await matches(page, '(pointer: coarse)'), 'the engine reports a coarse pointer').toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--void-hit-target').trim())).toBe('2.75rem');
    // Nothing in motion while a rect is measured (a selected dot scales, a slide slides).
    await page.evaluate(() => document.documentElement.setAttribute('data-anim-speed', 'off'));
    await settle(page);
    await arm(page);
  });

  for (const [name, selector, sides] of GROWN) {
    for (const side of sides) {
      coarse(`${name}: a tap just outside its ${side} edge activates it`, async ({ page }) => {
        const r = await rect(page, selector);
        // The point is outside the drawn box and inside the 44px area (room is (44 - size) / 2 on each side).
        const room = (44 - (side === 'top' || side === 'bottom' ? r.height : r.width)) / 2;
        expect(room, `${name} is ${r.width}x${r.height}: smaller than 44 on the tapped axis`).toBeGreaterThan(2.5);
        const hit = await tapAt(page, selector, outside(r, side, 2));
        expect(hit, `${name}: the tap 2px outside the ${side} edge`).toBe(true);
      });
    }
  }

  for (const [name, selector] of BOXES) {
    coarse(`${name}: is at least 44px tall and a tap near its bottom edge activates it`, async ({ page }) => {
      const r = await rect(page, selector);
      expect(r.height).toBeGreaterThanOrEqual(43.9);
      const hit = await tapAt(page, selector, { x: r.x + r.width / 2, y: r.y + r.height - 2 });
      expect(hit).toBe(true);
    });
  }

  coarse('dropdown menu items and combobox options are at least 44px tall', async ({ page }) => {
    await page.evaluate(() => {
      (document.getElementById('dd') as any).open = true;
      (document.getElementById('combo') as any).open = true;
    });
    await settle(page);
    for (const sel of ['#ddi-1', '#opt-1', '#opt-2']) {
      await expect.poll(async () => (await rect(page, sel)).height, { message: sel }).toBeGreaterThanOrEqual(43.9);
    }
  });

  coarse('the slider takes a tap beside its track', async ({ page }) => {
    const r = await rect(page, '#slider input');
    expect(r.height).toBeGreaterThanOrEqual(43.9);
    const before = await page.evaluate(() => Number((document.querySelector('#slider input') as HTMLInputElement).value));
    // 16px above the 4px track: outside what is drawn, inside the 44px box.
    const hit = await tapAt(page, '#slider input', { x: r.x + r.width * 0.8, y: r.y + r.height / 2 - 16 });
    expect(hit).toBe(true);
    expect(await page.evaluate(() => Number((document.querySelector('#slider input') as HTMLInputElement).value))).toBeGreaterThan(before + 30);
  });

  coarse('the slider track is drawn where it was: 4px, centred in the field', async ({ page }) => {
    const track = await page.evaluate(() => {
      const el = document.querySelector('#slider input') as HTMLInputElement;
      const cs = getComputedStyle(el);
      return { height: cs.height, bg: cs.backgroundClip, margin: cs.marginTop };
    });
    expect(track.height).toBe('4px');
    expect(track.bg).toBe('content-box');
    expect(parseFloat(track.margin)).toBeCloseTo(-20, 0);
  });

  coarse('nothing moves: the drawn boxes are the ones a fine pointer gets', async ({ page }) => {
    const sizes = (p: Page) =>
      p.evaluate(() => ['#b-md', '#b-sm', '#cb', '#sw', '#tg', '#hb', '#tab-one', '#pg', '#tbl', '#slider'].map((s) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return [s, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
      }));
    const on = await sizes(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-hit-target', 'off'));
    await settle(page);
    expect(await sizes(page)).toEqual(on);
  });

  coarse('data-hit-target="off" turns it off: the same tap goes to nothing', async ({ page }) => {
    const r = await rect(page, '#b-md');
    await page.evaluate(() => document.documentElement.setAttribute('data-hit-target', 'off'));
    await settle(page);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--void-hit-target').trim())).toBe('0px');
    expect(await tapAt(page, '#b-md', outside(r, 'bottom', 2))).not.toBe(true);
  });

  coarse('--void-hit-target sets the minimum: 0px off, a larger length grows it', async ({ page }) => {
    await page.addStyleTag({ content: ':root { --void-hit-target: 3.5rem; }' });
    const r = await rect(page, '#b-md');
    // 56px area on a 36px button: 10px each side; 8px below the edge is inside it, and 2px would be inside 44 too.
    expect(await tapAt(page, '#b-md', outside(r, 'bottom', 8))).toBe(true);
  });

  coarse('a real touch tap on a control activates it', async ({ page }) => {
    const r = await rect(page, '#b-md');
    await page.evaluate(() => {
      const w = window as any;
      w.__target = document.querySelector('#b-md');
      w.__hit = null;
    });
    await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    expect(await page.evaluate(() => (window as any).__hit)).toBe(true);
  });

  coarse('the area stops at its size: a tap well outside goes to nothing', async ({ page }) => {
    const r = await rect(page, '#b-md');
    expect(await tapAt(page, '#b-md', outside(r, 'bottom', 12))).not.toBe(true);
  });

  /**
   * Two neighbours along an axis: a click 1px from one's edge never goes to the other, and where the
   * neighbour grows (`grows`) it goes to the nearer one, which is the cap at half the gap.
   */
  async function nearerWins(page: Page, selA: string, selB: string, axis: 'x' | 'y', grows: boolean): Promise<void> {
    // Measured again before every click: a click may select a segment or a dot, which moves its neighbours a little.
    const points = async () => {
      const a = await rect(page, selA);
      const b = await rect(page, selB);
      const gap = axis === 'x' ? b.x - (a.x + a.width) : b.y - (a.y + a.height);
      expect(gap, 'the neighbours have room between them').toBeGreaterThanOrEqual(1.9);
      const mid = axis === 'x' ? a.y + a.height / 2 : a.x + a.width / 2;
      return {
        nearA: axis === 'x' ? { x: a.x + a.width + 1, y: mid } : { x: mid, y: a.y + a.height + 1 },
        nearB: axis === 'x' ? { x: b.x - 1, y: mid } : { x: mid, y: b.y - 1 },
      };
    };
    expect(await tapAt(page, selB, (await points()).nearA), `1px from the first one's edge landed on ${await landedOn(page)}`).not.toBe(true);
    expect(await tapAt(page, selA, (await points()).nearB), `1px from the second one's edge landed on ${await landedOn(page)}`).not.toBe(true);
    if (grows) {
      expect(await tapAt(page, selA, (await points()).nearA), `the first one's growth landed on ${await landedOn(page)}`).toBe(true);
      expect(await tapAt(page, selB, (await points()).nearB), `the second one's growth landed on ${await landedOn(page)}`).toBe(true);
    }
  }

  coarse('toggle group: a tap between two toggles goes to the nearer one', async ({ page }) => {
    await nearerWins(page, '#tgg-a', '#tgg-b', 'x', true);
    // Across the row each one still has its full 44px.
    const a = await rect(page, '#tgg-a');
    expect(await tapAt(page, '#tgg-a', outside(a, 'bottom', 2))).toBe(true);
  });

  coarse('vertical toggle group: a tap between two toggles goes to the nearer one', async ({ page }) => {
    await nearerWins(page, '#tgv-a', '#tgv-b', 'y', true);
    const a = await rect(page, '#tgv-a');
    expect(await tapAt(page, '#tgv-a', outside(a, 'right', 2))).toBe(true);
  });

  coarse('pagination: a tap between two buttons goes to the nearer one', async ({ page }) => {
    await nearerWins(page, '#pg .void-pagination-btn:nth-of-type(2)', '#pg .void-pagination-btn:nth-of-type(3)', 'x', true);
  });

  coarse('segmented control: a tap between two segments never goes to the farther one', async ({ page }) => {
    // The control scrolls, so its segments cannot grow past it; the gap between them is nobody's.
    await nearerWins(page, '#seg-a', '#seg-b', 'x', false);
    const b = await rect(page, '#seg-b');
    expect(await tapAt(page, '#seg-b', { x: b.x + b.width / 2, y: b.y + b.height / 2 })).toBe(true);
  });

  coarse('checkbox and radio groups: a tap between two rows goes to the nearer one', async ({ page }) => {
    await nearerWins(page, '#cbg-a', '#cbg-b', 'y', true);
    await nearerWins(page, '#rgg-a', '#rgg-b', 'y', true);
  });

  coarse('carousel dots: a tap between two dots goes to the nearer one', async ({ page }) => {
    const dots = '#car-dots > button';
    await expect(page.locator(dots)).toHaveCount(3);
    await nearerWins(page, `${dots}:nth-of-type(1)`, `${dots}:nth-of-type(2)`, 'x', true);
    // Across the row a dot has its full 44px.
    const a = await rect(page, `${dots}:nth-of-type(1)`);
    expect(await tapAt(page, `${dots}:nth-of-type(1)`, outside(a, 'bottom', 10))).toBe(true);
  });

  for (const tag of ['dlg', 'drw']) {
    coarse(`${tag === 'dlg' ? 'dialog' : 'drawer'}: a tap just outside the close button closes it`, async ({ page }) => {
      // No slide-in to measure through.
      await page.evaluate(() => document.documentElement.setAttribute('data-anim-speed', 'off'));
      await page.evaluate((id) => ((document.getElementById(id) as any).open = true), tag);
      await settle(page);
      const r = await page.evaluate((id) => {
        const close = (document.getElementById(id) as any).shadowRoot.querySelector('[part="close"]') as HTMLElement;
        const b = close.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      }, tag);
      expect(r.width).toBeLessThan(40);
      await page.mouse.click(r.x + r.width + 2, r.y + r.height / 2);
      await expect.poll(() => page.evaluate((id) => (document.getElementById(id) as any).open, tag)).toBe(false);
    });
  }
});

// A fine pointer: nothing is added.
base.describe('fine pointer', () => {
  base('no hit-area box is generated and the knob is 0px', async ({ page }) => {
    await load(page, '/touch-targets');
    expect(await matches(page, '(pointer: coarse)')).toBe(false);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--void-hit-target').trim())).toBe('0px');
    const pseudo = await page.evaluate(() => {
      const probes: Array<[string, string, '::before' | '::after']> = [
        ['#b-md', '#b-md', '::after'], ['#cb', '#cb', '::after'], ['#sw', '#sw', '::after'], ['#tg', '#tg', '::after'],
        ['#hb', '#hb', '::after'], ['#tag', '#tag .void-tag-close', '::after'], ['#alert', '#alert-close > button', '::after'],
        ['#bc', '#bc-home', '::after'], ['#pg', '#pg .void-pagination-btn', '::after'], ['#tab', '#tab-one', '::after'],
        ['#car', '#car-prev', '::after'], ['#cal', '#cal .void-calendar-nav', '::after'], ['#tbl', '#tbl th[data-sort] > button', '::before'],
      ];
      return probes.map(([id, sel, which]) => [id, getComputedStyle(document.querySelector(sel)!, which).content, getComputedStyle(document.querySelector(sel)!).position]);
    });
    for (const [id, content] of pseudo) expect(content, `${id} has no pseudo-element at a fine pointer`).toBe('none');
    // Nor does the control take a containing block for one: its position is what it was before this change.
    const positions = Object.fromEntries(pseudo.map(([id, , position]) => [id, position]));
    expect(positions['#b-md']).not.toBe('relative');
    expect(positions['#cb']).not.toBe('relative');
  });

  base('the sizes of the controls are the same as before', async ({ page }) => {
    await load(page, '/touch-targets');
    const heights = await page.evaluate(() => ['#b-md', '#b-sm', '#b-lg', '#tab-one'].map((s) => Math.round(document.querySelector(s)!.getBoundingClientRect().height)));
    expect(heights).toEqual([36, 28, 44, 36]);
  });
});
