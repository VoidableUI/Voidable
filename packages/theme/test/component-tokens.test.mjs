// SPDX-License-Identifier: MIT
//
// Component tokens and skins, proved in Chromium on the built files (run
// `pnpm build` first): one declaration of a component token wins on an
// element, on a subtree and on :root with no !important; a skin's tokens are
// computed again in every scope and give way to a surface's colours; the
// colour scheme is explicit, then preferred, then the system's; and forced
// colours and reduced motion hold under every skin.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readComponentTokens } from '../build/component-tokens.js';
import { parseTokenName, readSkin, scopes, skinCss } from '../build/skins.js';
import * as L from '../scripts/lib.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const SRC = join(DIST, '..', 'src');
const executablePath = [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find((p) => p && existsSync(p));
const { chromium } = executablePath ? await import('playwright-core') : {};
const skip = executablePath ? false : 'no Chromium found (set CHROMIUM_PATH)';
const read = (f) => readFileSync(join(DIST, f), 'utf8');
const skins = readdirSync(join(SRC, 'skins')).filter((f) => f.endsWith('.css')).map((f) => f.replace(/\.css$/, ''));

async function inPage(html, fn, { attrs = 'data-theme="dark"', sheets = [], context = {} } = {}) {
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext(context);
    const page = await ctx.newPage();
    await page.setContent(`<!doctype html><html ${attrs}><head><style>${read('void.css')}</style>${skins.map((s) => `<style>${read(`skins/${s}.css`)}</style>`).join('')}${sheets.map((s) => `<style>${s}</style>`).join('')}</head><body>${html}</body></html>`);
    return await page.evaluate(fn);
  } finally {
    await browser.close();
  }
}

test('the grammar parses component, part, property and state', () => {
  assert.deepEqual(parseTokenName('--void-nav-links-item-surface-selected', ['nav-links', 'nav']), { owner: 'nav-links', part: 'item', property: 'surface', state: 'selected' });
  assert.deepEqual(parseTokenName('--void-card-border-width', ['card']), { owner: 'card', part: null, property: 'border-width', state: null });
  assert.equal(parseTokenName('--void-card-colour', ['card']), null);
  assert.equal(parseTokenName('--void-card-surface-pressed', ['card']), null);
});

test('every component token is documented, read, and inside the grammar', () => {
  const { tokens, problems } = readComponentTokens(L.tokenFiles(), { owners: L.tokenOwners(), runtime: [...L.runtimeProperties()], defined: [...L.declaredTokens()] });
  assert.deepEqual(problems, []);
  assert.ok(tokens.length > 50);
  const card = tokens.find((t) => t.name === '--void-card-shadow');
  assert.equal(card.default, 'var(--void-container-shadow)');
  assert.equal(card.property, 'shadow');
});

test('a skin source is one rule of token assignments; anything else is refused', () => {
  assert.throws(() => readSkin('[data-void-skin="x"] { --void-rule: none; } void-card { color: red; }', 'x'), /one rule/);
  assert.throws(() => readSkin('[data-void-skin="x"] void-card { --void-card-shadow: none; }', 'x'), /one rule/);
  assert.throws(() => readSkin('[data-void-skin="x"] { color: red; }', 'x'), /only assign tokens/);
  assert.throws(() => readSkin('[data-void-skin="x"] { --shade: 1; }', 'x'), /--_void-x-/);
  const scope = scopes(readFileSync(join(SRC, 'tokens.css'), 'utf8'));
  assert.ok(scope.page.includes('[data-void-theme]') && scope.surface.includes('void-glass'));
  const css = skinCss(readSkin('[data-void-skin="x"] { --void-card-surface: white; --void-color-surface: white; --void-card-shadow: none; --_void-x-a: 1; }', 'x'), scope);
  const onSurface = css.split('\n\n')[1];
  assert.match(onSurface, /--void-card-surface: initial;/, 'a component colour is reset on a surface');
  assert.doesNotMatch(onSurface, /--void-color-surface/, 'a derived colour is left to the surface');
  assert.match(onSurface, /--void-card-shadow: none;/, 'structure is kept on a surface');
  assert.match(onSurface, /--_void-x-a: 1;/);
});

test('one declaration of a component token wins on an element, a subtree and :root, without !important', { skip }, async () => {
  const html = `<void-card id="plain">a</void-card>
    <void-card id="one" style="--void-card-radius: 3px">b</void-card>
    <section id="tree" style="--void-card-radius: 5px"><div><void-card id="deep">c</void-card></div></section>
    <void-button id="btn">d</void-button><void-button id="small" size="sm">e</void-button>`;
  const fn = () => Object.fromEntries(['plain', 'one', 'deep', 'btn', 'small'].map((id) => [id, { radius: getComputedStyle(document.getElementById(id)).borderRadius, height: getComputedStyle(document.getElementById(id)).minHeight }]));
  const base = await inPage(html, fn);
  assert.equal(base.one.radius, '3px');
  assert.equal(base.deep.radius, '5px');
  assert.notEqual(base.plain.radius, '3px');
  const global = await inPage(html, fn, { sheets: [':root { --void-card-radius: 7px; --void-button-height: 50px; }'] });
  assert.equal(global.plain.radius, '7px', 'a token set on :root reaches every card');
  assert.equal(global.one.radius, '3px', 'and the nearer declaration still wins');
  assert.equal(global.btn.height, '50px');
  assert.equal(global.small.height, '50px', 'a component token applies at every size step');
  assert.equal(base.small.height, '28px');
});

test('a role token restyles every component of its kind; the component token is the exception', { skip }, async () => {
  const r = await inPage('<void-card id="card">a</void-card><void-panel id="panel">b</void-panel><void-stat id="stat"></void-stat>', () => Object.fromEntries(['card', 'panel', 'stat'].map((id) => [id, getComputedStyle(document.getElementById(id)).borderTopLeftRadius])), { sheets: [':root { --void-container-radius: 11px; --void-card-radius: 2px; }'] });
  assert.deepEqual(r, { card: '2px', panel: '11px', stat: '11px' });
});

test('a skin is computed again in every scope and gives way to a surface for colour', { skip }, async () => {
  const html = `<void-card id="root">a</void-card>
    <div data-theme="dark"><void-card id="dark">b</void-card></div>
    <div data-void-theme style="--void-radius: 0px"><void-card id="square">c</void-card></div>
    <void-glass><void-card id="glass">d</void-card></void-glass>`;
  const r = await inPage(html, () => Object.fromEntries(['root', 'dark', 'square', 'glass'].map((id) => { const cs = getComputedStyle(document.getElementById(id)); return [id, { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, border: cs.borderTopColor }]; })), { attrs: 'data-theme="light" data-void-skin="loft"' });
  assert.match(r.root.bg, /^color\(srgb (0\.999|1)/, 'Loft: a white card on the soft page');
  assert.notEqual(r.dark.bg, r.root.bg, 'in a dark region the same formula gives the dark surface');
  assert.notEqual(r.dark.shadow, 'none');
  assert.equal(r.square.radius, '0px', 'a nested theme with a square radius is square under the skin');
  assert.notEqual(r.root.radius, '0px');
  assert.notEqual(r.glass.shadow, 'none', 'on glass the skin keeps its structure');
  assert.notEqual(r.glass.bg, r.root.bg, 'and the glass keeps its own colours');
  assert.notEqual(r.glass.border, 'rgba(0, 0, 0, 0)', 'including the hairline the skin removed on the page');
});

test('the colour scheme is explicit, then preferred, then the system', { skip }, async () => {
  const html = '<div id="a"></div><div data-theme="system" id="sys"></div><div data-theme="dark" id="dark"><div data-void-skin="loft" data-void-theme id="inner"></div></div>';
  const fn = () => Object.fromEntries(['a', 'sys', 'dark', 'inner'].map((id) => [id, getComputedStyle(document.getElementById(id)).getPropertyValue('--void-color-scheme').trim()]));
  for (const system of ['dark', 'light']) {
    const plain = await inPage(html, fn, { attrs: '', context: { colorScheme: system } });
    assert.equal(plain.a, system, 'with nothing said, the system decides');
    const loft = await inPage(html, fn, { attrs: 'data-void-skin="loft"', context: { colorScheme: system } });
    assert.equal(loft.a, 'light', 'Loft prefers light');
    assert.equal(loft.sys, system, 'data-theme="system" follows the system over the preference');
    assert.equal(loft.dark, 'dark', 'an explicit scheme wins');
    assert.equal(loft.inner, 'dark', 'also over a preference stated below it');
  }
  const text = await inPage('<void-card id="c">x</void-card>', () => getComputedStyle(document.getElementById('c')).colorScheme, { attrs: 'data-void-skin="loft"', context: { colorScheme: 'dark' } });
  assert.equal(text, 'light', 'native controls follow the preferred scheme');
});

for (const skin of skins) {
  test(`forced colours and reduced motion hold under the ${skin} skin`, { skip }, async () => {
    const html = '<void-button id="b">x</void-button><void-card id="c">y</void-card><void-input id="i"><input></void-input>';
    const forced = await inPage(html, () => {
      document.getElementById('b').setAttribute('tabindex', '0');
      const input = document.querySelector('input');
      input.focus();
      const cs = getComputedStyle(input);
      const card = getComputedStyle(document.getElementById('c'));
      return { outline: cs.outlineStyle, outlineWidth: parseFloat(cs.outlineWidth), cardBorder: card.borderTopStyle, cardBorderWidth: parseFloat(card.borderTopWidth), shadow: card.boxShadow };
    }, { attrs: `data-theme="light" data-void-skin="${skin}"`, context: { forcedColors: 'active' } });
    assert.equal(forced.outline, 'solid', 'a focused field has a real outline');
    assert.ok(forced.outlineWidth >= 2);
    assert.ok(forced.cardBorder === 'solid' && forced.cardBorderWidth >= 1, 'a container keeps a border for forced colours to paint');
    const motion = await inPage(html, () => getComputedStyle(document.getElementById('b')).transitionDuration, { attrs: `data-theme="light" data-void-skin="${skin}"`, context: { reducedMotion: 'reduce' } });
    assert.ok(motion.split(',').every((d) => parseFloat(d) === 0), `transitions are off (${motion})`);
  });
}
