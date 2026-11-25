// SPDX-License-Identifier: MIT
//
// Server morphs through the real adapters: Turbo 8 with VoidTurbo, morphdom
// with the LiveView adapter's DOM callbacks, and Alpine morph with the
// Livewire hooks (src/morph-harness.js). A morph must leave each component
// as a fresh render of the same markup would be, keep the client's state
// while the server repeats itself, let the server win when it changes, keep
// element identity and focus, and leak nothing.
import { test, expect, expectedFailure, load, settle, type Page } from '../helpers/test';
import { allComponents, initialState, projectionApp, signupForm, type AppState } from '../helpers/markup';

const ENGINES = ['turbo', 'morphdom', 'alpine'] as const;

const render = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.render(h), html);
const morph = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.morph(h), html);
const fresh = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.fresh(h), html);
const signature = (page: Page, id: string, structureOnly = false) =>
  page.evaluate(([id, s]) => (window as any).__signature(document.getElementById(id as string), { structureOnly: s }), [id, structureOnly] as const);
const nodes = (page: Page) => page.evaluate(() => document.getElementById('root')!.querySelectorAll('*').length);

/** Deterministic server states: some change everything, some change nothing. */
function nextState(prev: AppState, v: number): AppState {
  if (v % 4 === 0) return { ...prev }; // the server re-renders the same thing
  const rot = <T,>(a: T[], n: number) => [...a.slice(n % a.length), ...a.slice(0, n % a.length)];
  return {
    ...prev,
    v,
    options: v % 3 === 0 ? ['a', 'b', 'c', 'd'] : rot(['a', 'b', 'c'], v).slice(0, 2 + (v % 2)),
    tabs: v % 2 ? ['a', 'b', 'c'] : ['b', 'c'],
    menuItems: v % 2 ? ['a'] : ['a', 'b', 'c'],
    tags: v % 3 ? ['a', 'b'] : ['c'],
    selectValue: v % 3 === 0 ? 'd' : prev.selectValue,
  };
}

for (const engine of ENGINES) {
  test.describe(`${engine} morph`, () => {
    test.beforeEach(async ({ page }) => {
      await load(page, `/morph-${engine}`);
      expect(await page.evaluate(() => (window as any).__morph.engine)).toBe(engine);
    });

    test('projection components match a fresh render after each of 12 morphs, with interaction between them', async ({ page }) => {
      let s = initialState;
      await render(page, projectionApp(s));
      for (let v = 2; v <= 13; v++) {
        // Interact the way a user would between server updates.
        const act = v % 5;
        if (act === 0) await page.locator('#t [role=tab]').last().click();
        if (act === 1) await page.locator('#s select').selectOption({ index: 1 });
        if (act === 2) await page.locator('#dd button[slot=trigger]').click();
        if (act === 3) await page.locator('#cg void-checkbox').first().click();
        if (act === 4) await page.locator('#rg void-radio').nth(1).click();
        await settle(page);
        s = nextState(s, v);
        await morph(page, projectionApp(s));
        await fresh(page, projectionApp(s, 'r-'));
        expect(await signature(page, 'root', true), `after morph ${v}`).toEqual(await signature(page, 'ref', true));
      }
    });

    // A plain <input>'s typed value is the morpher's business (LiveView, for one, skips the focused
    // input itself), so this checks that the components around it do not take the focus away.
    test('element identity and focus survive morphs', async ({ page }) => {
      await render(page, projectionApp(initialState));
      // The elements the server rendered with ids (generated ids inside components may be re-rendered).
      await page.evaluate(() => {
        (window as any).__hosts = ['card', 'form', 's', 'cb', 'ms', 'cg', 'ck-a', 'ck-b', 'ck-c', 'rg', 'd', 'dr', 't', 'dd', 'tags'].map((id) => document.getElementById(id));
      });
      const input = page.locator('#root .ci');
      await input.click();
      await page.keyboard.type('typed');
      for (let v = 2; v <= 5; v++) {
        await morph(page, projectionApp({ ...initialState, v }));
        expect(await page.evaluate(() => (window as any).__hosts.every((h: Element) => h.isConnected && document.getElementById(h.id) === h)), 'same elements').toBe(true);
        expect(await page.evaluate(() => document.activeElement === document.querySelector('#root .ci')), 'focus kept').toBe(true);
      }
      await page.keyboard.type('!');
      expect(await input.inputValue()).toMatch(/!$/);
    });

    test('client state is kept while the server repeats itself', async ({ page }) => {
      await render(page, projectionApp(initialState));
      await page.locator('#s select').selectOption('c');
      await page.locator('#ck-a').click();
      await page.locator('#rg void-radio[value=z]').click();
      await page.locator('#t').getByRole('tab', { name: /Tab c/ }).click();
      await page.evaluate(async () => { const d = document.getElementById('d') as any; d.open = true; await d.updateComplete; });
      for (let i = 0; i < 3; i++) {
        await morph(page, projectionApp(initialState));
        const st = await page.evaluate(() => {
          const $ = (id: string) => document.getElementById(id) as any;
          return { select: $('s').value, a: $('ck-a').checked, radio: $('rg').value, tab: $('t').value, dialog: $('d').open };
        });
        expect(st, `after repeat morph ${i + 1}`).toEqual({ select: 'c', a: true, radio: 'z', tab: 'kc', dialog: true });
        await expect(page.locator('#d .dc')).toBeVisible();
      }
    });

    test('the server wins when it changes what it renders', async ({ page }) => {
      if (engine === 'alpine') expectedFailure('untracked:livewire-first-change-lost', 'the Livewire hooks record server state only during a morph, so the first server change after page load is taken for a repeat and dropped');
      await render(page, projectionApp(initialState));
      await page.locator('#s select').selectOption('c');
      await page.locator('#ck-b').click(); // the client unchecks b
      await page.evaluate(async () => { const d = document.getElementById('d') as any; d.open = true; await d.updateComplete; });
      // The server now renders a different value, checks c, and still renders the dialog closed.
      await morph(page, projectionApp({ ...initialState, v: 2, selectValue: 'a', checked: { a: false, b: true, c: true }, dialogOpen: true }));
      await morph(page, projectionApp({ ...initialState, v: 3, selectValue: 'b', checked: { a: false, b: true, c: true }, dialogOpen: false }));
      const st = await page.evaluate(() => {
        const $ = (id: string) => document.getElementById(id) as any;
        return { select: $('s').value, native: $('s').querySelector('select').value, c: $('ck-c').checked, dialog: $('d').open };
      });
      expect(st).toEqual({ select: 'b', native: 'b', c: true, dialog: false });
      await expect(page.locator('#d .dc')).toBeHidden();
    });

    test('morphing back and forth leaks no nodes', async ({ page }) => {
      const a = projectionApp(initialState);
      const b = projectionApp(nextState(initialState, 3));
      await render(page, a);
      const start = await nodes(page);
      const sigStart = await signature(page, 'root', true);
      for (let i = 0; i < 10; i++) {
        await morph(page, b);
        await morph(page, a);
      }
      expect(await nodes(page)).toBe(start);
      expect(await signature(page, 'root', true)).toEqual(sigStart);
      expect(await page.locator('void-projection-park').count()).toBe(0);
    });

    test('attributes a component sets on itself (role, aria-*, reflected defaults) survive a morph', async ({ page }) => {
      await render(page, projectionApp(initialState));
      const hostAttrs = () =>
        page.evaluate(() =>
          [...document.getElementById('root')!.querySelectorAll('*')]
            .filter((e) => e.tagName.startsWith('VOID-'))
            .map((e) => `${e.tagName.toLowerCase()}#${e.id} ${[...e.attributes].map((a) => a.name).filter((n) => n !== 'style').sort().join(',')}`),
        );
      const before = await hostAttrs();
      await morph(page, projectionApp({ ...initialState, v: 2 }));
      expect(await hostAttrs()).toEqual(before);
    });

    test('every component survives a morph that changes one unrelated text', async ({ page }) => {
      const html = allComponents();
      await render(page, `<p class="flash">one</p>${html}`);
      await morph(page, `<p class="flash">two</p>${html}`);
      await fresh(page, `<p class="flash">two</p>${html.replace(/ id="/g, ' id="r-')}`);
      expect(await signature(page, 'root')).toEqual(await signature(page, 'ref'));
    });

    test('a field, input, switch and button form still works after a morph', async ({ page }) => {
      await render(page, signupForm('v1'));
      const before = await page.evaluate(() => [...new FormData(document.getElementById('f') as HTMLFormElement)].map((e) => e.join('=')));
      await morph(page, signupForm('v2 (only this text changed)'));
      const after = await page.evaluate(() => [...new FormData(document.getElementById('f') as HTMLFormElement)].map((e) => e.join('=')));
      expect(after).toEqual(before);
      await expect(page.getByRole('textbox', { name: 'Email' })).toHaveCount(1, { timeout: 1000 });
      await expect(page.getByRole('switch', { name: 'Newsletter' })).toHaveCount(1, { timeout: 1000 });
      await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(1, { timeout: 1000 });
    });
  });
}

test.describe('snapshot restore', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/morph-turbo');
  });

  const restore = (page: Page, how: 'cloneNode' | 'outerHTML') =>
    page.evaluate(async (how) => {
      const root = document.getElementById('root')!;
      if (how === 'cloneNode') {
        // Turbo's page cache snapshots with cloneNode(true) and restores the clone.
        const copy = root.cloneNode(true) as HTMLElement;
        root.replaceWith(copy);
      } else {
        const doc = new DOMParser().parseFromString(`<!doctype html><body>${root.outerHTML}</body>`, 'text/html');
        root.replaceWith(document.adoptNode(doc.getElementById('root')!));
      }
      await (window as any).__settle(document.getElementById('root'));
    }, how);

  for (const how of ['cloneNode', 'outerHTML'] as const) {
    test(`${how}: projection components restore without duplication`, async ({ page }) => {
      await render(page, projectionApp(initialState));
      const before = await signature(page, 'root');
      await restore(page, how);
      expect(await signature(page, 'root')).toEqual(before);
      expect(await page.locator('#root #d .void-dialog-close').count()).toBe(1);
    });

    test(`${how}: every component restores without duplicating its content`, async ({ page }) => {
      await render(page, allComponents());
      const before = await signature(page, 'root');
      await restore(page, how);
      expect(await signature(page, 'root')).toEqual(before);
    });

    test(`${how}: a restored form submits each name once`, async ({ page }) => {
      await render(page, signupForm('cached'));
      const before = await page.evaluate(() => [...new FormData(document.getElementById('f') as HTMLFormElement)].map((e) => e.join('=')));
      await restore(page, how);
      expect(await page.evaluate(() => [...new FormData(document.getElementById('f') as HTMLFormElement)].map((e) => e.join('=')))).toEqual(before);
      await expect(page.getByRole('textbox', { name: 'Email' })).toHaveCount(1, { timeout: 1000 });
    });
  }
});
