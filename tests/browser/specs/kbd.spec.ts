// SPDX-License-Identifier: MIT
//
// kbd (#124): a keyboard key is drawn by the theme's base layer, from tokens: the mono family, a small
// raised box (an edge a little thicker below), a size relative to the text around it, and colours taken from
// that text so it stays legible in a paragraph, a filled, outline or ghost button, a menu item and a tooltip, in
// light and dark, under the default look and the Loft and Slab skins. A combination (kbd inside kbd) draws one
// box per key and none around them.
import { test, expect, load, type Page } from '../helpers/test';

const SKINS = ['none', 'loft', 'slab'] as const;
const SCHEMES = ['dark', 'light'] as const;

const key = (t: string) => `<kbd>${t}</kbd>`;
const CONTEXTS: Record<string, string> = {
  paragraph: `<p style="margin: 0">Press ${key('Esc')} to close.</p>`,
  'filled button': `<void-button variant="filled">Save ${key('S')}</void-button>`,
  'outline button': `<void-button>Search ${key('/')}</void-button>`,
  'ghost button': `<void-button variant="ghost">Find ${key('F')}</void-button>`,
  'menu item': `<void-dropdown-menu id="menu"><void-dropdown-menu-trigger><void-button>Menu</void-button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item>Copy ${key('C')}</void-dropdown-menu-item></void-dropdown-menu-content></void-dropdown-menu>`,
  tooltip: `<void-tooltip id="tip"><void-tooltip-trigger><void-button>Hint</void-button></void-tooltip-trigger><void-tooltip-content>Open ${key('O')}</void-tooltip-content></void-tooltip>`,
};

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    document.getElementById('case')?.remove();
    const d = document.createElement('div');
    d.id = 'case';
    d.style.padding = '3rem';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
    for (const id of ['menu', 'tip']) {
      const el = d.querySelector<any>(`#${id}`);
      if (el) {
        el.open = true;
        await el.updateComplete;
      }
    }
    await (window as any).__settle(d);
  }, html);
}

async function setLook(page: Page, scheme: string, skin: string): Promise<void> {
  await page.evaluate(async ([sc, sk]) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', sc);
    if (sk === 'none') {
      root.removeAttribute('data-void-skin');
    } else {
      if (!document.querySelector(`link[data-skin="${sk}"]`)) {
        await new Promise<void>((resolve, reject) => {
          const l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = `/build/${sk}.css`;
          l.dataset.skin = sk;
          l.onload = () => resolve();
          l.onerror = () => reject(new Error(`${sk}.css did not load`));
          document.head.append(l);
        });
      }
      root.setAttribute('data-void-skin', sk);
    }
  }, [scheme, skin]);
}

interface Look {
  family: string;
  monoFamily: string;
  top: number;
  bottom: number;
  fill: number;
  size: number;
  parentSize: number;
  color: string;
  parentColor: string;
  contrast: number;
}

function measure(page: Page, selector: string): Promise<Look> {
  return page.evaluate((sel) => {
    const { rgba, over, bgOf, ratio } = (window as any).__color;
    const k = document.querySelector<HTMLElement>(sel)!;
    const cs = getComputedStyle(k);
    const parent = getComputedStyle(k.parentElement!);
    const probe = document.createElement('span');
    probe.style.fontFamily = 'var(--void-font-mono)';
    k.parentElement!.append(probe);
    const monoFamily = getComputedStyle(probe).fontFamily;
    probe.remove();
    const fill = rgba(cs.backgroundColor);
    const paper = over(fill, bgOf(k.parentElement!));
    return {
      family: cs.fontFamily,
      monoFamily,
      top: parseFloat(cs.borderTopWidth),
      bottom: parseFloat(cs.borderBottomWidth),
      fill: fill[3],
      size: parseFloat(cs.fontSize),
      parentSize: parseFloat(parent.fontSize),
      color: cs.color,
      parentColor: parent.color,
      contrast: ratio(rgba(cs.color), paper),
    };
  }, selector);
}

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

for (const scheme of SCHEMES) {
  for (const skin of SKINS) {
    test.describe(`${scheme}, ${skin}`, () => {
      for (const [name, html] of Object.entries(CONTEXTS)) {
        test(`a key in a ${name} is a small raised box in the text's own colour`, async ({ page }) => {
          await setLook(page, scheme, skin);
          await mount(page, html);
          const look = await measure(page, '#case kbd');
          expect(look.family).toBe(look.monoFamily);
          expect(look.top, 'draws an edge').toBeGreaterThan(0);
          expect(look.bottom, 'raised: the lower edge is not thinner').toBeGreaterThanOrEqual(look.top);
          expect(look.fill, 'has a fill').toBeGreaterThan(0);
          expect(look.size, 'smaller than the text around it').toBeLessThan(look.parentSize);
          expect(look.size, 'not tiny').toBeGreaterThan(look.parentSize * 0.7);
          expect(look.color, 'takes the text colour').toBe(look.parentColor);
          expect(look.contrast, JSON.stringify(look)).toBeGreaterThanOrEqual(4.5);
        });
      }

      test('a combination draws a box per key and none around the keys', async ({ page }) => {
        await setLook(page, scheme, skin);
        await mount(page, `<p style="margin: 0">Open with <kbd id="combo"><kbd id="a">Ctrl</kbd>+<kbd id="b">K</kbd></kbd>.</p>`);
        const outer = await measure(page, '#combo');
        const a = await measure(page, '#a');
        const b = await measure(page, '#b');
        expect(outer.top).toBe(0);
        expect(outer.fill).toBe(0);
        for (const inner of [a, b]) {
          expect(inner.top).toBeGreaterThan(0);
          expect(inner.fill).toBeGreaterThan(0);
          // The keys keep the size of the combination, not a smaller one for each level.
          expect(inner.size).toBeCloseTo(inner.parentSize, 1);
          expect(inner.contrast, JSON.stringify(inner)).toBeGreaterThanOrEqual(4.5);
        }
        expect(a.size).toBeLessThan(outer.parentSize);
      });
    });
  }
}

test('the key sits on the text baseline without making the line taller', async ({ page }) => {
  await mount(page, `<p id="plain" style="margin: 0; width: 20rem">Press the key to close the dialog.</p><p id="keyed" style="margin: 0; width: 20rem">Press ${key('Esc')} to close the dialog.</p>`);
  const heights = await page.evaluate(() => [...document.querySelectorAll('#plain, #keyed')].map((p) => p.getBoundingClientRect().height));
  expect(heights[1]).toBeLessThanOrEqual(heights[0]);
});
