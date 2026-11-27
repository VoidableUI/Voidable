// SPDX-License-Identifier: MIT
//
// Edges and tones of the page patterns, as rendered: a ghost button that ends
// a line has its label on the column's edge, a section head is as tall with an
// action as without, an eyebrow does not move the title, a tone on a row
// reaches the code text inside it, and the description list and state options.
import { test, expect, load, settle, type Page } from '../helpers/test';

const SKINS = ['none', 'loft', 'slab'] as const;
const SCHEMES = ['dark', 'light'] as const;

async function open(page: Page, skin: (typeof SKINS)[number] = 'none', scheme: (typeof SCHEMES)[number] = 'dark'): Promise<void> {
  await page.setViewportSize({ width: 1100, height: 900 });
  await load(page, `/alignment?theme=${scheme}`);
  if (skin !== 'none') {
    await page.evaluate((s) => document.documentElement.setAttribute('data-void-skin', s), skin);
    await settle(page);
  }
}

/** For each marked button: how far the end of its label is from the content edge of its [data-edge] box. */
async function labelOffsets(page: Page, attr: 'data-flush' | 'data-inset'): Promise<Record<string, number>> {
  return page.evaluate((attr) => {
    const out: Record<string, number> = {};
    for (const button of document.querySelectorAll<HTMLElement>(`[${attr}]`)) {
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      let text: Node | null = null;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent!.trim()) text = n;
      const range = document.createRange();
      range.selectNodeContents(text!);
      const label = range.getBoundingClientRect();
      const box = (button.closest('[data-edge]') ?? button.parentElement!) as HTMLElement;
      const rect = box.getBoundingClientRect();
      const cs = getComputedStyle(box);
      const rtl = cs.direction === 'rtl';
      const edge = rtl
        ? rect.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft)
        : rect.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
      // Positive: the label stops short of the edge. Negative: it passes it.
      out[button.getAttribute(attr)!] = Math.round((rtl ? label.left - edge : edge - label.right) * 100) / 100;
    }
    return out;
  }, attr);
}

const height = (page: Page, id: string) =>
  page.evaluate((id) => document.querySelector(`#${id} > void-section-head`)!.getBoundingClientRect().height, id);

test.describe('a ghost button that ends a line (#132)', () => {
  for (const skin of SKINS) {
    test(`its label sits on the column's edge (skin: ${skin})`, async ({ page }) => {
      await open(page, skin);
      const offsets = await labelOffsets(page, 'data-flush');
      expect(Object.keys(offsets).length).toBeGreaterThanOrEqual(10);
      for (const [name, offset] of Object.entries(offsets)) {
        expect(Math.abs(offset), `${name}: label is ${offset}px from the edge`).toBeLessThanOrEqual(0.5);
      }
    });
  }

  test('a button that draws a box, a ghost button that is not last and one that is not at an end keep their padding', async ({ page }) => {
    await open(page);
    const offsets = await labelOffsets(page, 'data-inset');
    expect(offsets['row, outline button']).toBeGreaterThan(8);
    const margins = await page.evaluate(() =>
      Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-inset]')].map((b) => [b.dataset.inset, getComputedStyle(b).marginInlineEnd])),
    );
    for (const [name, margin] of Object.entries(margins)) expect(margin, name).toBe('0px');
  });

  test('the row is no wider for it: nothing scrolls sideways', async ({ page }) => {
    await open(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('a section head with an action (#132)', () => {
  for (const skin of SKINS) {
    test(`is as tall as one without (skin: ${skin})`, async ({ page }) => {
      await open(page, skin);
      const plain = await height(page, 'sh-plain');
      expect(plain).toBeGreaterThan(10);
      for (const id of ['sh-action', 'sh-ghost', 'sh-ghost-sm', 'sh-ghost-link', 'sh-label']) {
        expect(Math.abs((await height(page, id)) - plain), `${id} against sh-plain`).toBeLessThanOrEqual(0.5);
      }
      expect(Math.abs((await height(page, 'shd-action')) - (await height(page, 'shd-plain'))), 'divided, large button').toBeLessThanOrEqual(0.5);
      expect(Math.abs((await height(page, 'shp-action')) - (await height(page, 'shp-plain'))), 'with a description').toBeLessThanOrEqual(0.5);
    });
  }

  test('the action is centred on the head and stays clear of the content under it', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() =>
      ['sh-action', 'shd-action', 'shp-action'].map((id) => {
        const section = document.getElementById(id)!;
        const head = section.querySelector('void-section-head')!.getBoundingClientRect();
        const cs = getComputedStyle(section.querySelector('void-section-head')!);
        const button = section.querySelector('void-button')!.getBoundingClientRect();
        const content = section.querySelector(':scope > p')!.getBoundingClientRect();
        const textMiddle = head.top + (head.height - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth)) / 2;
        return { id, off: Math.abs((button.top + button.bottom) / 2 - textMiddle), clear: content.top - button.bottom };
      }),
    );
    for (const c of r) {
      expect(c.off, `${c.id}: button centre against the head's text`).toBeLessThanOrEqual(1);
      expect(c.clear, `${c.id}: space between the button and the content`).toBeGreaterThanOrEqual(4);
    }
  });

  test('on a phone the actions drop under the heading and take their own room', async ({ page }) => {
    await open(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page);
    const r = await page.evaluate(() => {
      const head = document.querySelector('#sh-action > void-section-head')!;
      const h2 = head.querySelector('h2')!.getBoundingClientRect();
      const button = head.querySelector('void-button')!.getBoundingClientRect();
      const box = head.getBoundingClientRect();
      return { under: button.top - h2.bottom, inside: box.bottom - button.bottom };
    });
    expect(r.under).toBeGreaterThanOrEqual(0);
    expect(r.inside).toBeGreaterThanOrEqual(0);
  });
});

test.describe('a tone on a row (#131)', () => {
  for (const skin of SKINS) {
    for (const scheme of SCHEMES) {
      test(`reaches code text, at 4.5:1 (skin: ${skin}, ${scheme})`, async ({ page }) => {
        await open(page, skin, scheme);
        const rows = await page.evaluate(() => {
          const { rgba, over, bgOf, ratio } = (window as any).__color;
          const probe = document.createElement('span');
          document.body.append(probe);
          const out = [...document.querySelectorAll<HTMLElement>('void-row[data-tone]')].map((row) => {
            const tone = row.dataset.tone!;
            probe.style.color = `var(--void-color-${tone})`;
            const code = row.querySelector<HTMLElement>('[data-void-type="code"]')!;
            const bg = bgOf(code);
            const ink = getComputedStyle(code).color;
            return {
              name: `${tone}${row.closest('void-card') ? ' in a card' : ''}`,
              expected: getComputedStyle(probe).color,
              plain: getComputedStyle(row.querySelector('[data-plain]')!).color,
              code: ink,
              body: row.querySelector('[data-void-type="body"]') ? getComputedStyle(row.querySelector('[data-void-type="body"]')!).color : null,
              caption: row.querySelector('[data-void-type="caption"]') ? getComputedStyle(row.querySelector('[data-void-type="caption"]')!).color : null,
              contrast: ratio(over(rgba(ink), bg), bg),
            };
          });
          probe.style.color = 'var(--void-color-text)';
          const text = getComputedStyle(probe).color;
          probe.style.color = 'var(--void-color-text-secondary)';
          const secondary = getComputedStyle(probe).color;
          probe.remove();
          const untoned = ['row-plain', 'row-default'].map((id) => getComputedStyle(document.querySelector(`#${id} [data-void-type="code"]`)!).color);
          return { out, text, secondary, untoned };
        });
        expect(rows.out.length).toBe(10);
        for (const row of rows.out) {
          expect(row.plain, `${row.name}: plain text takes the tone`).toBe(row.expected);
          expect(row.code, `${row.name}: code text takes the tone`).toBe(row.expected);
          if (row.body) expect(row.body, `${row.name}: body text takes the tone`).toBe(row.expected);
          if (row.caption) expect(row.caption, `${row.name}: the caption stays quiet`).toBe(rows.secondary);
          expect(row.contrast, `${row.name}: contrast of toned code text`).toBeGreaterThanOrEqual(4.5);
        }
        // No tone, or color="default": code text is the text colour, as before.
        for (const ink of rows.untoned) expect(ink).toBe(rows.text);
      });
    }
  }

  test('a state word and a control share the end of a row', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => {
      const actions = document.getElementById('row-actions')!;
      const state = actions.querySelector('void-state')!.getBoundingClientRect();
      const button = actions.querySelector('void-button')!.getBoundingClientRect();
      return { gap: button.left - state.right, off: Math.abs((state.top + state.bottom) / 2 - (button.top + button.bottom) / 2), oneLine: state.bottom > button.top && button.bottom > state.top };
    });
    expect(r.gap).toBeGreaterThanOrEqual(4);
    expect(r.off).toBeLessThanOrEqual(1);
    expect(r.oneLine).toBe(true);
  });
});

test.describe('description list, page head and state (#133)', () => {
  test('values end-align by default and start-align on one line with justify="start"', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => {
      const measure = (id: string) => {
        const list = document.getElementById(id)!;
        return [...list.querySelectorAll('dl > div')].map((pair) => {
          const range = document.createRange();
          range.selectNodeContents(pair.querySelector('dd')!);
          const value = range.getBoundingClientRect();
          const row = pair.getBoundingClientRect();
          const label = pair.querySelector('dt')!.getBoundingClientRect();
          return { fromStart: value.left - row.left, fromEnd: row.right - value.right, afterLabel: value.left - label.right, sameLine: Math.abs(value.bottom - label.bottom) < 6 };
        });
      };
      return { end: measure('dl-end'), start: measure('dl-start') };
    });
    for (const pair of r.end) expect(Math.abs(pair.fromEnd)).toBeLessThanOrEqual(0.5);
    const x = r.start[0].fromStart;
    expect(x).toBeGreaterThan(40);
    for (const pair of r.start) {
      expect(Math.abs(pair.fromStart - x), 'every value starts at the same x').toBeLessThanOrEqual(0.5);
      expect(pair.afterLabel, 'the value clears its label').toBeGreaterThanOrEqual(8);
      expect(pair.fromEnd).toBeGreaterThan(40);
      expect(pair.sameLine).toBe(true);
    }
  });

  test('start-aligned values keep clear of long labels on a phone', async ({ page }) => {
    await open(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await settle(page);
    const r = await page.evaluate(() =>
      [...document.querySelectorAll('#dl-start dl > div')].map((pair) => {
        const label = pair.querySelector('dt')!.getBoundingClientRect();
        const value = pair.querySelector('dd')!.getBoundingClientRect();
        return { overlap: label.right > value.left + 0.5 && label.bottom > value.top + 0.5 && value.bottom > label.top + 0.5, overflow: value.right - pair.getBoundingClientRect().right };
      }),
    );
    for (const pair of r) {
      expect(pair.overlap).toBe(false);
      expect(pair.overflow).toBeLessThanOrEqual(0.5);
    }
  });

  for (const skin of SKINS) {
    test(`an eyebrow does not move the title (skin: ${skin})`, async ({ page }) => {
      await open(page, skin);
      const r = await page.evaluate(() => {
        const at = (id: string) => {
          const pageBox = document.getElementById(id)!.getBoundingClientRect();
          const head = document.querySelector(`#${id} > void-page-head`)!;
          const h1 = head.querySelector('h1')!.getBoundingClientRect();
          const first = head.firstElementChild!;
          const range = document.createRange();
          range.selectNodeContents(first);
          const above = range.getBoundingClientRect();
          return { title: h1.top - pageBox.top, headHeight: head.getBoundingClientRect().height, aboveTop: above.top - pageBox.top, gap: h1.top - above.bottom };
        };
        return { plain: at('page-plain'), eyebrow: at('page-eyebrow'), crumbs: at('page-crumbs') };
      });
      expect(Math.abs(r.eyebrow.title - r.plain.title), 'title y, with and without an eyebrow').toBeLessThanOrEqual(0.5);
      expect(Math.abs(r.eyebrow.headHeight - r.plain.headHeight), 'head height, with and without an eyebrow').toBeLessThanOrEqual(0.5);
      // The eyebrow hangs in the page's top padding: inside the page, above the title, a tight gap apart.
      expect(r.eyebrow.aboveTop).toBeGreaterThanOrEqual(4);
      expect(r.eyebrow.gap).toBeGreaterThanOrEqual(4);
      expect(r.eyebrow.gap).toBeLessThanOrEqual(12);
      // Breadcrumbs are navigation and take their room: the title sits lower.
      expect(r.crumbs.title).toBeGreaterThan(r.plain.title + 8);
    });
  }

  test('size="lg" sets a state in the heading role', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => {
      const style = (id: string) => {
        const el = document.getElementById(id)!;
        const cs = getComputedStyle(el);
        const dot = getComputedStyle(el, '::before');
        return { size: cs.fontSize, weight: cs.fontWeight, family: cs.fontFamily, leading: cs.lineHeight, dot: parseFloat(dot.width) };
      };
      return { ref: style('state-ref'), lg: style('state-lg'), md: style('state-md') };
    });
    expect(r.lg.size).toBe(r.ref.size);
    expect(r.lg.weight).toBe(r.ref.weight);
    expect(r.lg.family).toBe(r.ref.family);
    expect(r.lg.leading).toBe(r.ref.leading);
    expect(parseFloat(r.md.size)).toBeLessThan(parseFloat(r.lg.size));
    expect(r.lg.dot).toBeGreaterThan(r.md.dot);
  });
});

// VOID_ALIGNMENT_SHOTS=<dir> photographs the page for a look at the result
// (dark and light, no skin, Loft and Slab); nothing is compared or committed.
test.describe('photographs', () => {
  test.skip(!process.env.VOID_ALIGNMENT_SHOTS, 'set VOID_ALIGNMENT_SHOTS to a directory');
  for (const skin of SKINS) {
    for (const scheme of SCHEMES) {
      test(`${skin} ${scheme}`, async ({ page, browserName }) => {
        await open(page, skin, scheme);
        await page.screenshot({ path: `${process.env.VOID_ALIGNMENT_SHOTS}/${browserName}-${skin}-${scheme}.png`, fullPage: true });
      });
    }
  }
});
