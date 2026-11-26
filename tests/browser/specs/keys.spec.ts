// SPDX-License-Identifier: MIT
//
// Customising keys (#90), for EVERY element the manifest gives key actions (`voidKeys`):
//   (a) a capture-phase listener that cancels a default key stops the component acting on it,
//   (b) rebinding one action makes the new key work and the old key stop,
//   (c) unbinding an action (an empty list) disables it.
// The elements and the keys come from the manifest and the usage snippets, so a new element with
// key actions is covered the moment it has them. Then: reading direction, the attribute form and
// the application-wide `configureKeys`.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, load, settle, type Page } from '../helpers/test';

const require = createRequire(import.meta.url);
const manifest = require('@voidable/ui/custom-elements.json');
const snippetDir = join(dirname(fileURLToPath(import.meta.url)), '../../../tools/voidable/internal/infra/embedded/data/supplement/snippets');

interface KeyAction { action: string; keys: string[] }
const keyed: Record<string, KeyAction[]> = {};
for (const m of manifest.modules) for (const d of m.declarations ?? []) if (d.tagName && d.voidKeys && (d.attributes ?? []).some((a: any) => a.name === 'keys')) keyed[d.tagName] = d.voidKeys.actions;

/** Where a key reaches the component, and what to do first, for the elements whose keys act on a part or an open state. */
const setup: Record<string, { target?: string; action?: string; prepare?: string; snippet?: string; watch?: 'open' }> = {
  'void-tabs': { target: 'void-tabs-trigger', action: 'last' },
  'void-toggle-group': { target: 'void-toggle', action: 'last' },
  'void-segmented-control': { target: 'void-segmented-control-item', action: 'last' },
  'void-radio': { snippet: 'void-radio-group', target: 'void-radio', action: 'next' },
  'void-nav-menu': { target: 'void-nav-menu-trigger button', action: 'next' },
  'void-carousel': { action: 'last' },
  'void-carousel-previous': { snippet: 'void-carousel', target: 'void-carousel-previous' },
  'void-carousel-next': { snippet: 'void-carousel', target: 'void-carousel-next' },
  'void-accordion-item': { target: 'void-accordion-trigger' },
  'void-collapsible': { target: 'void-collapsible-trigger' },
  'void-file-upload': { target: '[role=button]' },
  'void-menu': { target: 'void-menu-item', action: 'last' },
  'void-dropdown-menu': { target: 'void-dropdown-menu-trigger', action: 'open' },
  'void-combobox': { target: 'input', action: 'open' },
  'void-multiselect': { target: '[role=combobox], button', action: 'open' },
  'void-calendar': { target: '[data-date][tabindex="0"], [data-date]', action: 'nextDay' },
  'void-date-picker': { target: 'input', action: 'open' },
  'void-number-input': { target: 'input', action: 'increment' },
  'void-pin-input': { target: 'input', action: 'next' },
  'void-tags-input': { target: 'input', action: 'add', prepare: "const i=el.querySelector('input'); i.value='x'; i.dispatchEvent(new Event('input',{bubbles:true}))" },
  'void-compose-input': { target: 'textarea', action: 'send', prepare: "const i=el.querySelector('textarea'); i.value='x'; i.dispatchEvent(new Event('input',{bubbles:true}))" },
  'void-editable': { target: '[role=button], button, [tabindex]', action: 'activate' },
  'void-dialog': { action: 'close', prepare: 'el.open = true', watch: 'open' },
  'void-drawer': { action: 'close', prepare: 'el.open = true', watch: 'open' },
  'void-popover': { action: 'close', prepare: 'el.open = true' },
  'void-tooltip': { action: 'close', prepare: 'el.open = true' },
  'void-hover-card': { action: 'close', prepare: 'el.open = true' },
  'void-menu-item': { target: 'void-menu-item' },
};

const html = (tag: string): string => {
  try { return readFileSync(join(snippetDir, `${tag}.html`), 'utf8'); } catch { return `<${tag}></${tag}>`; }
};

const tags = Object.keys(keyed).filter((t) => !setup[t] || setup[t]!.action || true);

/** Mounts the snippet and returns a function that sends a key to the target and reports whether the component handled it. */
async function mount(page: Page, tag: string, keys?: unknown) {
  await page.evaluate(async ({ markup, tag, keys }) => {
    document.getElementById('case')?.remove();
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = markup;
    document.body.append(d);
    const el = d.querySelector(tag) as any;
    if (keys !== undefined) el.keys = keys;
    await (window as any).__settle(d);
  }, { markup: html(setup[tag]?.snippet ?? tag), tag, keys });
}

async function prepare(page: Page, tag: string) {
  const p = setup[tag]?.prepare;
  await page.evaluate(async ({ tag, p }) => {
    const el = document.querySelector(`#case ${tag}`) as any;
    if (p) new Function('el', p)(el);
    await (window as any).__settle(document);
  }, { tag, p: p ?? null });
}

/** Sends a keydown to the target; true when something called preventDefault (the component acted on it). */
async function send(page: Page, tag: string, key: string, init: { shift?: boolean; alt?: boolean } = {}) {
  return page.evaluate(async ({ tag, key, sel, init, watch }) => {
    const root = document.querySelector(`#case ${tag}`) as HTMLElement;
    const target = ((sel ? root.querySelector(sel) : null) ?? root) as HTMLElement;
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true, shiftKey: !!init.shift, altKey: !!init.alt });
    target.focus?.();
    const open = (root as any).open;
    target.dispatchEvent(e);
    await (window as any).__settle(document);
    return watch === 'open' ? (root as any).open !== open : e.defaultPrevented;
  }, { tag, key, sel: setup[tag]?.target ?? null, init, watch: setup[tag]?.watch ?? null });
}

/** A key string as a keydown: the key, with the modifiers it names. */
function parse(spec: string): { key: string; shift: boolean; alt: boolean } {
  const parts = spec.split('+');
  const key = spec.endsWith('++') ? '+' : parts[parts.length - 1]!;
  const mods = spec.endsWith('++') ? parts.slice(0, -2) : parts.slice(0, -1);
  const named = key === 'Space' ? ' ' : key;
  return { key: named, shift: mods.includes('Shift'), alt: mods.includes('Alt') };
}

/** The first default key of the action that a keydown on the target can express. */
function pick(tag: string): { action: string; spec: string } {
  const list = keyed[tag]!;
  const want = setup[tag]?.action;
  const a = list.find((x) => x.action === want) ?? list.find((x) => x.action === 'activate') ?? list.find((x) => x.keys.some((k) => k !== 'Printable' && !k.includes('Inline'))) ?? list[0]!;
  const spec = a.keys.find((k) => k !== 'Printable') ?? a.keys[0]!;
  return { action: a.action, spec: spec.replace('ArrowInlineEnd', 'ArrowRight').replace('ArrowInlineStart', 'ArrowLeft') };
}

test.describe('every element with key actions', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/blank');
  });

  test('the manifest lists key actions for the elements that read them', () => {
    expect(tags.length).toBeGreaterThan(30);
  });

  for (const tag of tags) {
    test.describe(tag, () => {
      test('(a) a capture-phase preventDefault stops the default key', async ({ page }) => {
        const { spec } = pick(tag);
        const k = parse(spec);
        await mount(page, tag);
        await prepare(page, tag);
        await page.evaluate(() => {
          (window as any).__cancel = (e: KeyboardEvent) => e.preventDefault();
          document.addEventListener('keydown', (window as any).__cancel, true);
        });
        await page.evaluate(({ t, s }) => { const r = document.querySelector(`#case ${t}`)!; ((s ? r.querySelector(s) : null) as HTMLElement ?? r as HTMLElement).focus?.(); }, { t: tag, s: setup[tag]?.target ?? null });
        await settle(page);
        const before = await page.evaluate((t) => document.querySelector(`#case ${t}`)!.outerHTML, tag);
        await send(page, tag, k.key, k);
        const after = await page.evaluate((t) => document.querySelector(`#case ${t}`)!.outerHTML, tag);
        expect(after, 'the component acted on a key the application cancelled').toBe(before);
      });

      test('(b) rebinding an action moves it to the new key', async ({ page }) => {
        const { action, spec } = pick(tag);
        const k = parse(spec);
        await mount(page, tag, { [action]: ['F9'] });
        await prepare(page, tag);
        expect(await send(page, tag, k.key, k), `the old key still works (${spec})`).toBe(false);
        expect(await send(page, tag, 'F9'), 'the new key does nothing').toBe(true);
      });

      test('(c) an empty list turns the action off', async ({ page }) => {
        const { action, spec } = pick(tag);
        const k = parse(spec);
        await mount(page, tag);
        await prepare(page, tag);
        await page.evaluate(({ t, a }) => { (document.querySelector(`#case ${t}`) as any).keys = { [a]: [] }; }, { t: tag, a: action });
        await settle(page);
        expect(await send(page, tag, k.key, k), `${spec} still acts`).toBe(false);
      });
    });
  }
});

test.describe('keys in practice', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/blank');
  });

  test('the keys attribute takes JSON, and a real key press follows it', async ({ page }) => {
    await page.evaluate(async () => {
      const d = document.createElement('div');
      d.id = 'case';
      d.innerHTML = `<void-tabs value="a" keys='{"next":["j"],"previous":["k"]}'><void-tabs-list><void-tabs-trigger id="ta" value="a">A</void-tabs-trigger><void-tabs-trigger id="tb" value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b">b</void-tabs-content></void-tabs>`;
      document.body.append(d);
      await (window as any).__settle(d);
    });
    await page.focus('#ta');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#ta')).toBeFocused();
    await page.keyboard.press('j');
    await expect(page.locator('#tb')).toBeFocused();
    await page.keyboard.press('k');
    await expect(page.locator('#ta')).toBeFocused();
  });

  test('default inline keys mirror in right-to-left, and a key an application writes does not', async ({ page }) => {
    await page.evaluate(async () => {
      document.documentElement.dir = 'rtl';
      const d = document.createElement('div');
      d.id = 'case';
      d.innerHTML = `<void-tabs value="a"><void-tabs-list><void-tabs-trigger id="ta" value="a">A</void-tabs-trigger><void-tabs-trigger id="tb" value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b">b</void-tabs-content></void-tabs>
        <void-tabs id="lit" value="a" keys='{"next":["ArrowRight"]}'><void-tabs-list><void-tabs-trigger id="la" value="a">A</void-tabs-trigger><void-tabs-trigger id="lb" value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b">b</void-tabs-content></void-tabs>`;
      document.body.append(d);
      await (window as any).__settle(d);
    });
    await page.focus('#ta');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#tb')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#ta')).toBeFocused();
    await page.focus('#la');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#lb')).toBeFocused();
    await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  });

  test('configureKeys changes every element of a tag, and "*" every element with that action', async ({ page }) => {
    await page.evaluate(async () => {
      const d = document.createElement('div');
      d.id = 'case';
      d.innerHTML = `<void-tabs value="a"><void-tabs-list><void-tabs-trigger id="ta" value="a">A</void-tabs-trigger><void-tabs-trigger id="tb" value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b">b</void-tabs-content></void-tabs>`;
      document.body.append(d);
      await (window as any).__settle(d);
      (window as any).VoidUI.configureKeys('void-tabs', { next: ['n'] });
    });
    await page.focus('#ta');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#ta')).toBeFocused();
    await page.keyboard.press('n');
    await expect(page.locator('#tb')).toBeFocused();
    await page.evaluate(() => (window as any).VoidUI.configureKeys('void-tabs', null));
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#ta')).toBeFocused();
    await page.evaluate(() => (window as any).VoidUI.configureKeys('*', { next: ['m'] }));
    await page.keyboard.press('m');
    await expect(page.locator('#tb')).toBeFocused();
    await page.evaluate(() => (window as any).VoidUI.configureKeys('*', null));
  });

  test('an element keeps its keys through a server morph', async ({ page }) => {
    await page.evaluate(async () => {
      const d = document.createElement('div');
      d.id = 'case';
      d.innerHTML = `<void-tabs id="t" value="a" keys='{"next":["j"]}'><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content></void-tabs>`;
      document.body.append(d);
      await (window as any).__settle(d);
      // A morph rewrites the attributes in place (here the one that changes the tab), never the element.
      document.getElementById('t')!.setAttribute('value', 'a');
      await (window as any).__settle(d);
    });
    expect(await page.evaluate(() => JSON.stringify((document.getElementById('t') as any).keys))).toBe('{"next":["j"]}');
  });
});
