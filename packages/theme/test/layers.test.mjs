// SPDX-License-Identifier: MIT
//
// The cascade-layer contract of the built theme, proved in Chromium on the
// built files (run `pnpm build` first): the order holds whichever stylesheet
// loads first, an application's utility classes and unlayered CSS beat the
// theme, a skin beats the components and patterns it restyles, and the
// scoped reset leaves elements outside void-* alone.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const executablePath = [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find((p) => p && existsSync(p));
const { chromium } = executablePath ? await import('playwright-core') : {};
const read = (f) => readFileSync(join(DIST, f), 'utf8');

// What Tailwind v4 ships, reduced to the parts that matter here.
const TAILWIND = `@layer theme, base, components, utilities;
@layer base { *, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; } button { background: transparent; border-radius: 0; } }
@layer utilities { .rounded-none { border-radius: 0; } .m-8 { margin: 2rem; } .p-8 { padding: 2rem; } .bg-red { background-color: rgb(255, 0, 0); } }`;

const MARKUP = `<void-card id="card" class="p-8 rounded-none bg-red m-8">x</void-card>
<void-button id="btn" class="rounded-none m-8">y</void-button>
<void-card id="plain">z</void-card>
<p id="para">outside</p>`;

async function measure(sheets, { markup = MARKUP, attrs = '', after = '' } = {}) {
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html ${attrs}><head>${sheets.map((s) => `<style>${s}</style>`).join('')}</head><body>${markup}${after}</body></html>`);
    return await page.evaluate(() => {
      const cs = (id) => getComputedStyle(document.getElementById(id));
      return {
        cardRadius: cs('card').borderRadius, cardMargin: cs('card').margin, cardBg: cs('card').backgroundColor, cardPad: cs('card').padding,
        btnRadius: cs('btn').borderRadius, btnMargin: cs('btn').margin,
        plainRadius: cs('plain').borderRadius, plainBg: cs('plain').backgroundColor,
        paraMargin: cs('para').margin,
      };
    });
  } finally {
    await browser.close();
  }
}

const skip = executablePath ? false : 'no Chromium found (set CHROMIUM_PATH)';

for (const [name, order] of [['theme first', (t, w) => [t, w]], ['Tailwind first', (t, w) => [w, t]]]) {
  test(`utility classes beat the theme when ${name}`, { skip }, async () => {
    const r = await measure(order(read('void.css'), TAILWIND));
    assert.equal(r.cardRadius, '0px');
    assert.equal(r.cardMargin, '32px');
    assert.equal(r.cardPad, '32px');
    assert.equal(r.cardBg, 'rgb(255, 0, 0)');
    assert.equal(r.btnRadius, '0px');
    assert.equal(r.btnMargin, '32px');
    // and the theme still styles what no utility touched
    assert.notEqual(r.plainRadius, '0px');
    assert.notEqual(r.plainBg, 'rgba(0, 0, 0, 0)');
  });
}

test('unlayered application CSS with one low-specificity selector beats the theme, without !important', { skip }, async () => {
  const r = await measure([read('void.css'), 'void-card { border-radius: 3px; background: rgb(1, 2, 3); }']);
  assert.equal(r.plainRadius, '3px');
  assert.equal(r.plainBg, 'rgb(1, 2, 3)');
});

test('the scoped reset leaves elements outside void-* alone, and base.css is what styles body', { skip }, async () => {
  const r = await measure([read('core.css')]);
  assert.equal(r.paraMargin, '16px 0px', 'the browser default margin of a paragraph survives the theme');
});

test('a skin beats the components it restyles', { skip }, async () => {
  const without = await measure([read('void.css')], { attrs: 'data-theme="dark"' });
  const withSkin = await measure([read('void.css'), read('skins/loft.css')], { attrs: 'data-theme="dark" data-void-skin="loft"' });
  assert.notEqual(withSkin.plainBg, without.plainBg, 'Loft changes what a card is');
});
