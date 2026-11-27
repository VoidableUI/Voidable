// SPDX-License-Identifier: MIT
//
// A collapsible is one unit: the line is drawn around the element, so closed it
// frames the trigger and open it frames the trigger and the content together
// (#125). The trigger has no box of its own. The same holds in every skin, the
// frame is a token, and nothing moves when the element upgrades. Also here: the
// rule under a card header is a token that can be turned off.
import { test, expect, load, settle, type Page } from '../helpers/test';

const SKINS = ['none', 'loft', 'slab'] as const;

async function loadWith(page: Page, skin: (typeof SKINS)[number], theme = 'light') {
  await load(page, `/frames?theme=${theme}`);
  if (skin === 'none') return;
  await page.addStyleTag({ url: `/build/${skin}.css` });
  await page.evaluate((s) => document.documentElement.setAttribute('data-void-skin', s), skin);
  await settle(page);
}

/** Boxes and borders of a collapsible and its two parts. */
const measure = (page: Page, id: string) =>
  page.evaluate((id) => {
    const host = document.getElementById(id)!;
    const trigger = host.querySelector('void-collapsible-trigger')!;
    const content = host.querySelector('void-collapsible-content')!;
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const widths = (el: Element) => {
      const cs = getComputedStyle(el);
      return [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(parseFloat);
    };
    const textLeft = (el: Element) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && !node.textContent!.trim()) node = walker.nextNode();
      const range = document.createRange();
      range.selectNodeContents(node!);
      return range.getBoundingClientRect().left;
    };
    return {
      host: box(host),
      trigger: box(trigger),
      content: box(content),
      hostBorder: widths(host),
      hostBorderStyle: getComputedStyle(host).borderTopStyle,
      triggerBorder: widths(trigger),
      contentBorder: widths(content),
      triggerText: textLeft(trigger),
      contentText: textLeft(content),
    };
  }, id);

for (const skin of SKINS) {
  test.describe(`skin: ${skin}`, () => {
    test.beforeEach(async ({ page }) => loadWith(page, skin));

    test('open: one frame holds the trigger and the content', async ({ page }) => {
      const m = await measure(page, 'open');
      // The line belongs to the element, not to the trigger.
      expect(m.triggerBorder, 'the trigger draws no box of its own').toEqual([0, 0, 0, 0]);
      expect(m.contentBorder).toEqual([0, 0, 0, 0]);
      const [t, r, b, l] = m.hostBorder;
      expect(t, 'a frame is laid out on every side').toBeGreaterThanOrEqual(1);
      expect([r, b, l]).toEqual([t, t, t]);
      expect(m.hostBorderStyle).toBe('solid');
      // Trigger and content fill the frame edge to edge, one under the other.
      expect(m.trigger.top).toBeCloseTo(m.host.top + t, 1);
      expect(m.trigger.left).toBeCloseTo(m.host.left + l, 1);
      expect(m.trigger.right).toBeCloseTo(m.host.right - r, 1);
      expect(m.content.top).toBeCloseTo(m.trigger.bottom, 1);
      expect(m.content.left).toBeCloseTo(m.trigger.left, 1);
      expect(m.content.right).toBeCloseTo(m.trigger.right, 1);
      expect(m.content.bottom).toBeCloseTo(m.host.bottom - b, 1);
      expect(m.content.height).toBeGreaterThan(40);
      // The content's text starts under the trigger's text.
      expect(m.contentText).toBeCloseTo(m.triggerText, 1);
    });

    test('closed: the frame is the size of the trigger, and the same line as when open', async ({ page }) => {
      const closed = await measure(page, 'closed');
      const open = await measure(page, 'open');
      expect(closed.triggerBorder).toEqual([0, 0, 0, 0]);
      expect(closed.hostBorder).toEqual(open.hostBorder);
      expect(closed.content.height).toBeLessThanOrEqual(0.5);
      expect(closed.host.height).toBeCloseTo(closed.trigger.height + closed.hostBorder[0] + closed.hostBorder[2], 1);
      expect(closed.host.width).toBeCloseTo(open.host.width, 1);
      expect(closed.trigger.height).toBeCloseTo(open.trigger.height, 1);
    });

    test('opening grows the frame downwards and moves nothing else', async ({ page }) => {
      const before = await measure(page, 'closed');
      await page.locator('#closed void-collapsible-trigger').click();
      await expect(page.locator('#closed')).toHaveAttribute('open', '');
      await expect.poll(async () => (await measure(page, 'closed')).content.height).toBeGreaterThan(30);
      // The opening animation has ended when the height holds for ten frames running.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            const host = document.getElementById('closed')!;
            let last = -1;
            let same = 0;
            const tick = () => {
              const h = host.getBoundingClientRect().height;
              same = h === last ? same + 1 : 0;
              last = h;
              if (same >= 10) resolve();
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );
      const after = await measure(page, 'closed');
      // Within half a pixel: nothing the eye can see moved.
      const near = (a: number, b: number, what: string) => expect(Math.abs(a - b), `${what}: ${b} -> ${a}`).toBeLessThanOrEqual(0.5);
      near(after.host.top, before.host.top, 'frame top');
      near(after.trigger.top, before.trigger.top, 'trigger top');
      near(after.trigger.height, before.trigger.height, 'trigger height');
      near(after.triggerText, before.triggerText, 'trigger text');
      near(after.host.height, before.host.height + after.content.height, 'frame height');
      near(after.content.bottom, after.host.bottom - after.hostBorder[2], 'content reaches the frame');
    });
  });
}

test('the frame is one hairline by default and a heavy line in Slab', async ({ page }) => {
  await loadWith(page, 'none');
  expect((await measure(page, 'open')).hostBorder).toEqual([1, 1, 1, 1]);
  await loadWith(page, 'slab');
  expect((await measure(page, 'open')).hostBorder).toEqual([2, 2, 2, 2]);
});

test('--void-collapsible-rule-frame: none removes the frame', async ({ page }) => {
  await loadWith(page, 'none');
  const m = await measure(page, 'bare');
  expect(m.hostBorder).toEqual([0, 0, 0, 0]);
  expect(m.triggerBorder).toEqual([0, 0, 0, 0]);
  expect(m.content.left).toBeCloseTo(m.host.left, 1);
});

test("the trigger's hover fill follows the corners of the frame", async ({ page }) => {
  await loadWith(page, 'none');
  const radii = (id: string) =>
    page.evaluate((id) => {
      const host = document.getElementById(id)!;
      const t = getComputedStyle(host.querySelector('void-collapsible-trigger')!);
      return { host: parseFloat(getComputedStyle(host).borderTopLeftRadius), top: parseFloat(t.borderTopLeftRadius), bottom: parseFloat(t.borderBottomLeftRadius) };
    }, id);
  const closed = await radii('closed');
  expect(closed.host).toBeGreaterThan(0);
  expect(closed.top).toBe(closed.host);
  expect(closed.bottom).toBe(closed.host);
  const open = await radii('open');
  expect(open.top).toBe(open.host);
  expect(open.bottom).toBe(0);
});

test.describe('--void-collapsible-padding-inline', () => {
  const lefts = (page: Page, host: string, fieldId: string) =>
    page.evaluate(
      ({ host, fieldId }) => {
        const x = (el: Element) => el.getBoundingClientRect();
        const h = document.getElementById(host)!;
        const input = (id: string) => document.querySelector(`#${id} input`)!;
        const range = document.createRange();
        range.selectNodeContents(h.querySelector('void-collapsible-trigger')!);
        return {
          outside: x(input('outside')).left,
          outsideRight: x(input('outside')).right,
          inside: x(input(fieldId)).left,
          insideRight: x(input(fieldId)).right,
          triggerText: range.getBoundingClientRect().left,
          host: x(h).left,
          border: parseFloat(getComputedStyle(h).borderLeftWidth),
        };
      },
      { host, fieldId },
    );

  for (const skin of SKINS) {
    test(`${skin}: 0 with no frame puts a field inside at the x of a field outside`, async ({ page }) => {
      await loadWith(page, skin);
      const m = await lefts(page, 'flush', 'flush-field');
      expect(m.border).toBe(0);
      expect(m.inside).toBeCloseTo(m.outside, 1);
      expect(m.insideRight).toBeCloseTo(m.outsideRight, 1);
      expect(m.triggerText).toBeCloseTo(m.outside, 1);
    });
  }

  test('0 with the frame puts the content against the frame', async ({ page }) => {
    await loadWith(page, 'none');
    const m = await lefts(page, 'framed-flush', 'framed-field');
    expect(m.border).toBe(1);
    expect(m.inside).toBeCloseTo(m.host + m.border, 1);
    expect(m.triggerText).toBeCloseTo(m.inside, 1);
  });

  test('the focus ring of a field against the edge is not clipped', async ({ page }) => {
    await loadWith(page, 'none');
    const cs = await page.evaluate(() => {
      const c = getComputedStyle(document.querySelector('#flush void-collapsible-content')!);
      const h = getComputedStyle(document.getElementById('flush')!);
      return { x: c.overflowX, y: c.overflowY, host: h.overflowX };
    });
    expect(cs).toEqual({ x: 'visible', y: 'clip', host: 'visible' });
    // Seen, not only computed: the column of pixels just outside the focused field is drawn on.
    await page.locator('#flush-field input').focus();
    const box = (await page.locator('#flush-field input').boundingBox())!;
    const ring = await page.evaluate(() => getComputedStyle(document.querySelector('#flush-field input')!).boxShadow);
    expect(ring).not.toBe('none');
    const strip = { x: Math.round(box.x) - 1, y: Math.round(box.y) + 8, width: 1, height: Math.round(box.height) - 16 };
    const focused = await page.screenshot({ clip: strip });
    await page.locator('#flush-field input').blur();
    await expect.poll(async () => (await page.screenshot({ clip: strip })).equals(focused)).toBe(false);
  });

  test('the default inset is the same on the trigger and the content', async ({ page }) => {
    await loadWith(page, 'none');
    const m = await measure(page, 'open');
    expect(m.triggerText - m.trigger.left).toBeCloseTo(16, 0);
    expect(m.contentText).toBeCloseTo(m.triggerText, 1);
  });
});

test.describe('before the script loads', () => {
  for (const id of ['closed', 'open', 'bare']) {
    test(`#${id} and its parts do not shift when it upgrades`, async ({ page }) => {
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      await page.route('**/build/ui.js', async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto('/frames?theme=light', { waitUntil: 'commit' });
      await page.waitForSelector('#after', { state: 'attached' });
      expect(await page.evaluate(() => !!customElements.get('void-collapsible'))).toBe(false);
      const before = await measure(page, id);
      release();
      await page.waitForFunction(() => !!customElements.get('void-collapsible') && !!customElements.get('void-button'));
      await settle(page);
      const after = await measure(page, id);
      for (const part of ['host', 'trigger', 'content'] as const) {
        for (const side of ['top', 'left', 'width', 'height'] as const) {
          expect(Math.abs(after[part][side] - before[part][side]), `${id} ${part} ${side}: ${before[part][side]} -> ${after[part][side]}`).toBeLessThanOrEqual(0.5);
        }
      }
      expect(after.hostBorder).toEqual(before.hostBorder);
    });
  }
});

test.describe('card header rule', () => {
  const header = (page: Page, id: string) =>
    page.evaluate((id) => {
      const el = document.querySelector(`#${id} void-card-header`)!;
      const cs = getComputedStyle(el);
      return { rule: parseFloat(cs.borderBottomWidth), style: cs.borderBottomStyle, height: el.getBoundingClientRect().height, card: document.getElementById(id)!.getBoundingClientRect().height };
    }, id);

  for (const skin of SKINS) {
    test(`${skin}: --void-card-header-rule: none removes the line and keeps the header's height`, async ({ page }) => {
      await loadWith(page, skin);
      const ruled = await header(page, 'card');
      const plain = await header(page, 'card-plain');
      expect(ruled.rule).toBeGreaterThanOrEqual(1);
      expect(ruled.style).toBe('solid');
      expect(plain.rule).toBe(0);
      expect(plain.style).toBe('none');
      expect(plain.height).toBeCloseTo(ruled.height, 1);
      expect(plain.card).toBeCloseTo(ruled.card, 1);
    });
  }

  test('it can be set once for every card', async ({ page }) => {
    await loadWith(page, 'none');
    await page.addStyleTag({ content: ':root { --void-card-header-rule: none; }' });
    expect((await header(page, 'card')).rule).toBe(0);
  });
});
