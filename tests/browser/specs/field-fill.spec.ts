// SPDX-License-Identifier: MIT
//
// An enabled field must not look disabled. On a light page a grey fill is what
// "disabled" looks like, so an enabled field is the page colour there (white on
// the default page) and a disabled one carries a wash as well as its faded text
// and edge. Checked for every kind of field, in both schemes and in each skin,
// by what is painted: the fill as composited over what is behind it.
import { test, expect, load, settle, type Page } from '../helpers/test';

const KINDS = ['input', 'textarea', 'select', 'number', 'combobox'] as const;
const SKINS = ['none', 'loft', 'slab'] as const;

async function loadWith(page: Page, skin: (typeof SKINS)[number], theme: 'light' | 'dark') {
  await load(page, `/field-fill?theme=${theme}`);
  if (skin !== 'none') {
    await page.addStyleTag({ url: `/build/${skin}.css` });
    await page.evaluate((s) => document.documentElement.setAttribute('data-void-skin', s), skin);
    await settle(page);
  }
}

/**
 * The colour painted inside the field, read from a screenshot: a few pixels of
 * its fill, low in the box and clear of the text, the stepper buttons and the
 * chevron. sRGB 0-255.
 */
async function painted(page: Page, id: string) {
  const box = await page.evaluate((id) => {
    const host = document.getElementById(id)!;
    // The element that carries the fill: the host (number input) or the control inside it.
    const filled = host.matches('void-number-input') ? host : (host.querySelector('input, textarea, select') as HTMLElement);
    const r = filled.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  }, id);
  return pixel(page, Math.round(box.x + box.width * 0.4), Math.round(box.y + box.height - 6));
}

/** The colour of the page at a point, from a screenshot decoded in the page. */
async function pixel(page: Page, x: number, y: number) {
  const shot = await page.screenshot({ clip: { x, y, width: 3, height: 3 }, fullPage: true, animations: 'disabled' });
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const [r, g, b] = ctx.getImageData(1, 1, 1, 1).data;
    return { r, g, b };
  }, shot.toString('base64'));
}

const distance = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));

test.describe('default theme, light', () => {
  test.beforeEach(async ({ page }) => loadWith(page, 'none', 'light'));

  for (const kind of KINDS) {
    test(`${kind}: enabled is the white of the page, disabled is visibly washed`, async ({ page }) => {
      const on = await painted(page, kind);
      const off = await painted(page, `${kind}-off`);
      expect(distance(on, { r: 255, g: 255, b: 255 }), `enabled fill ${JSON.stringify(on)}`).toBeLessThanOrEqual(0.5);
      expect(distance(on, off), `enabled ${JSON.stringify(on)} against disabled ${JSON.stringify(off)}`).toBeGreaterThanOrEqual(6);
      // The wash is darker than the page, not a tint of some other colour.
      expect(off.r).toBeLessThan(on.r);
    });
  }

  test('every kind of field has the same fill, enabled and disabled', async ({ page }) => {
    const on = await painted(page, 'input');
    const off = await painted(page, 'input-off');
    for (const kind of KINDS) {
      expect(distance(await painted(page, kind), on), kind).toBeLessThanOrEqual(0.5);
      expect(distance(await painted(page, `${kind}-off`), off), `${kind}, disabled`).toBeLessThanOrEqual(1);
    }
  });

  test('in a card, a field is lighter than the card around it', async ({ page }) => {
    const field = await painted(page, 'carded');
    const at = await page.evaluate(() => {
      const r = document.getElementById('card')!.getBoundingClientRect();
      return { x: Math.round(r.left + 6), y: Math.round(r.top + scrollY + 6) };
    });
    const card = await pixel(page, at.x, at.y);
    expect(card.r, 'the card has a fill of its own').toBeLessThan(255);
    expect(distance(field, { r: 255, g: 255, b: 255 })).toBeLessThanOrEqual(0.5);
  });
});

for (const skin of SKINS) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${skin}, ${theme}: a disabled field's fill differs from an enabled one's`, async ({ page }) => {
      await loadWith(page, skin, theme);
      for (const kind of KINDS) {
        const on = await painted(page, kind);
        const off = await painted(page, `${kind}-off`);
        // In light the fill is the main cue and must be plain; in dark the fills are close by design (both a
        // small lift from black) and the faded text and edge carry the state, so there it only has to differ.
        expect(distance(on, off), `${kind}: enabled ${JSON.stringify(on)} against disabled ${JSON.stringify(off)}`).toBeGreaterThanOrEqual(theme === 'light' ? 6 : 1);
      }
    });
  }
}

test('Loft and Slab keep their white fields in light', async ({ page }) => {
  for (const skin of ['loft', 'slab'] as const) {
    await loadWith(page, skin, 'light');
    expect(distance(await painted(page, 'input'), { r: 255, g: 255, b: 255 }), skin).toBeLessThanOrEqual(0.5);
  }
});
