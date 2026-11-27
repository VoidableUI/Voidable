// SPDX-License-Identifier: MIT
//
// The narrow-screen switch (#119): the layout changes at 48rem by default, `data-void-narrow`
// on <html> moves it (sm 36rem, md 48rem, lg 64rem) or turns it off (the wide layout at any width).
import { test, expect, load, type Page } from '../helpers/test';

const state = (page: Page) =>
  page.evaluate(() => {
    const cs = (sel: string) => getComputedStyle(document.querySelector(sel)!);
    return {
      shellDir: cs('#side').flexDirection,
      sideLinks: cs('#side void-nav-links').overflowX,
      barLinks: cs('#bar void-nav-links').overflowX,
      hideNarrow: cs('#hide-narrow').display,
      hideWide: cs('#hide-wide').display,
    };
  });

const setNarrow = (page: Page, value: string | null) =>
  page.evaluate((v) => (v === null ? document.documentElement.removeAttribute('data-void-narrow') : document.documentElement.setAttribute('data-void-narrow', v)), value);

/** [attribute, viewport width, is the narrow layout expected] */
const CASES: [string | null, number, boolean][] = [
  [null, 768, true],
  [null, 769, false],
  ['md', 768, true],
  ['md', 800, false],
  ['sm', 576, true],
  ['sm', 600, false],
  ['sm', 700, false],
  ['lg', 1024, true],
  ['lg', 1100, false],
  ['lg', 800, true],
  ['off', 300, false],
  ['off', 720, false],
  ['off', 1200, false],
  ['bogus', 700, true],
];

for (const [attr, width, narrow] of CASES) {
  test(`data-void-narrow=${attr ?? '(none)'} at ${width}px is ${narrow ? 'narrow' : 'wide'}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await load(page, '/narrow');
    await setNarrow(page, attr);
    const s = await state(page);
    expect(s.shellDir).toBe(narrow ? 'column' : 'row');
    expect(s.sideLinks === 'auto').toBe(narrow);
    expect(s.barLinks === 'auto').toBe(narrow);
    expect(s.hideNarrow).toBe(narrow ? 'none' : 'block');
    // data-void-hide="wide" goes whenever the layout is wide: with `off`, always.
    expect(s.hideWide).toBe(narrow ? 'block' : 'none');
  });
}
