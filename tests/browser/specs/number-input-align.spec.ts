// SPDX-License-Identifier: MIT
//
// The value of a number input starts where the text of every other field
// starts, whatever the controls (#126): it used to be centred between the
// buttons. --void-number-input-value-align moves it (center, end), on the
// element or on any ancestor.
import { test, expect, load, type Page } from '../helpers/test';

/** How the value is aligned, and where its box and its text edge are. */
const field = (page: Page, id: string) =>
  page.evaluate((id) => {
    const host = document.getElementById(id)!;
    const input = host.querySelector('input')!;
    const cs = getComputedStyle(input);
    const r = input.getBoundingClientRect();
    // The width of the value as drawn, from the field's own font.
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const text = ctx.measureText(input.value).width;
    const start = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    const end = r.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
    const align = cs.textAlign;
    // Where the first glyph is, given the alignment the browser resolved.
    const textLeft = align === 'center' ? (start + end - text) / 2 : align === 'end' || align === 'right' ? end - text : start;
    return { align, left: r.left, right: r.right, padStart: parseFloat(cs.paddingLeft), textLeft, textRight: textLeft + text, hostLeft: host.getBoundingClientRect().left, hostRight: host.getBoundingClientRect().right };
  }, id);

test.beforeEach(async ({ page }) => load(page, '/number-align'));

for (const id of ['sides', 'right', 'none']) {
  test(`controls="${id}": the value starts at the field's start edge`, async ({ page }) => {
    const n = await field(page, id);
    expect(n.align).toBe('start');
    // One padding step in from the edge of its box, the same step in each layout.
    const plain = await field(page, 'none');
    expect(n.textLeft - n.left).toBeCloseTo(plain.textLeft - plain.left, 1);
    expect(n.textLeft - n.left).toBeGreaterThan(4);
  });
}

test('without buttons at the start, the value lines up with a text field above it', async ({ page }) => {
  const t = await field(page, 'text');
  for (const id of ['right', 'none']) {
    const n = await field(page, id);
    expect(n.textLeft, id).toBeCloseTo(t.textLeft, 1);
  }
});

test('with buttons at the sides, the value starts right after the decrement button', async ({ page }) => {
  const n = await field(page, 'sides');
  const dec = await page.evaluate(() => document.querySelector('#sides .void-number-input-btn-dec')!.getBoundingClientRect().right);
  expect(n.left).toBeCloseTo(dec, 1);
  // Far from centred: the value ends in the first half of a wide field.
  expect(n.textRight).toBeLessThan((n.left + n.right) / 2);
});

test('--void-number-input-value-align: center centres the value between the buttons', async ({ page }) => {
  const n = await field(page, 'center');
  expect(n.align).toBe('center');
  expect((n.textLeft + n.textRight) / 2).toBeCloseTo((n.hostLeft + n.hostRight) / 2, 0);
});

test('--void-number-input-value-align: end puts the value at the end edge', async ({ page }) => {
  expect((await field(page, 'end')).align).toBe('end');
});

test('the token set on an ancestor reaches the number inputs inside it', async ({ page }) => {
  expect((await field(page, 'inherited')).align).toBe('center');
});
