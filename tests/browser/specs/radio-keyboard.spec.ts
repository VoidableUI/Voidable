// SPDX-License-Identifier: MIT
//
// Radio group keyboard operation (WAI-ARIA Authoring Practices, radio group) for
// void-radio-group and for void-radio outside a group that share a name: roving
// tabindex, arrow keys (also right-to-left), wrap, disabled radios, Space, the
// events fired, the form data, server morphs and the accessibility tree.
import { test, expect, load, settle, type Page } from '../helpers/test';

const active = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  return a?.getAttribute('role') === 'radio' ? `${a.closest('void-radio-group')?.id ?? 'solo'}:${a.getAttribute('value')}` : a?.id ?? 'body';
});
const press = async (page: Page, key: string) => { await page.keyboard.press(key); await settle(page); };
const form = (page: Page) => page.evaluate(() => Object.fromEntries(new FormData(document.getElementById('f') as HTMLFormElement) as any) as Record<string, string>);
const tabindexes = (page: Page, sel: string) => page.locator(`${sel} void-radio`).evaluateAll((rs) => rs.map((r) => r.getAttribute('tabindex')).join(','));
const watch = (page: Page) => page.evaluate(() => {
  const w = window as any;
  w.__events = [];
  for (const id of ['plan', 'none', 'dis', 'solo']) document.getElementById(id)!.addEventListener('void-change', (e) => w.__events.push(`${id}:${(e as CustomEvent).detail.value}`));
  document.addEventListener('click', (e) => { if ((e.target as Element).closest('void-radio')) w.__events.push('click'); }, true);
});
const events = (page: Page) => page.evaluate(() => (window as any).__events as string[]);

test.describe('radio keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/radios');
  });

  test('Tab enters each group once, on the checked radio, or the first enabled one', async ({ page }) => {
    await page.locator('#before').focus();
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) { await press(page, 'Tab'); seen.push(await active(page)); }
    expect(seen).toEqual(['plan:free', 'mid', 'none:s', 'dis:a', 'solo:green']);
    await press(page, 'Tab');
    expect(await active(page)).toBe('after');
    expect(await tabindexes(page, '#plan')).toBe('0,-1,-1');
    expect(await tabindexes(page, '#dis')).toBe('0,-1,-1,-1');
  });

  test('Shift+Tab goes through each group once, into an unchecked group on its last radio', async ({ page }) => {
    await page.locator('#after').focus();
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) { await press(page, 'Shift+Tab'); seen.push(await active(page)); }
    expect(seen).toEqual(['solo:green', 'dis:a', 'none:l', 'mid', 'plan:free']);
    await press(page, 'Shift+Tab');
    expect(await active(page)).toBe('before');
  });

  test('after Shift+Tab out of an unchecked group, Tab comes back on its first radio', async ({ page }) => {
    await page.locator('#dis [value=a]').focus();
    await press(page, 'Shift+Tab');
    expect(await active(page)).toBe('none:l');
    await press(page, 'Shift+Tab');
    expect(await active(page)).toBe('mid');
    await press(page, 'Tab');
    expect(await active(page)).toBe('none:s');
    // Focusing a radio by Shift+Tab checks nothing.
    expect((await form(page)).size).toBeUndefined();
  });

  test('ArrowDown and ArrowRight check the next radio, ArrowUp and ArrowLeft the previous, and they wrap', async ({ page }) => {
    await page.locator('#plan [value=free]').focus();
    const walked: string[] = [];
    for (const k of ['ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowLeft']) {
      await press(page, k);
      walked.push(await active(page));
    }
    expect(walked).toEqual(['plan:pro', 'plan:team', 'plan:free', 'plan:team', 'plan:pro', 'plan:free']);
    expect(await page.locator('#plan').evaluate((g: any) => g.value)).toBe('free');
    await expect(page.locator('#plan').getByRole('radio', { name: 'Free' })).toBeChecked();
    expect(await tabindexes(page, '#plan')).toBe('0,-1,-1');
  });

  test('an arrow key fires one void-change on the group and one click, and updates the form data', async ({ page }) => {
    await page.locator('#plan [value=free]').focus();
    await watch(page);
    await press(page, 'ArrowDown');
    expect(await events(page)).toEqual(['click', 'plan:pro']);
    expect((await form(page)).plan).toBe('pro');
    expect(await page.locator('#plan').getAttribute('value')).toBe('pro');
    await press(page, 'ArrowDown');
    expect(await events(page)).toEqual(['click', 'plan:pro', 'click', 'plan:team']);
    expect((await form(page)).plan).toBe('team');
    expect(await tabindexes(page, '#plan')).toBe('-1,-1,0');
  });

  test('Space checks the focused radio once; on a checked radio it does nothing', async ({ page }) => {
    await page.locator('#none [value=s]').focus();
    await watch(page);
    await press(page, 'Space');
    expect(await events(page)).toEqual(['click', 'none:s']);
    await press(page, 'Space');
    expect(await events(page)).toEqual(['click', 'none:s', 'click']);
    expect((await form(page)).size).toBe('s');
    expect(await tabindexes(page, '#none')).toBe('0,-1,-1');
  });

  test('arrows in an unchecked group move from the focused radio', async ({ page }) => {
    await page.locator('#none [value=s]').focus();
    await press(page, 'ArrowUp');
    expect(await active(page)).toBe('none:l');
    expect((await form(page)).size).toBe('l');
  });

  test('disabled radios are skipped by arrows and never tabbable', async ({ page }) => {
    await page.locator('#dis [value=a]').focus();
    await watch(page);
    await press(page, 'ArrowDown');
    expect(await active(page)).toBe('dis:c');
    await press(page, 'ArrowDown');
    expect(await active(page)).toBe('dis:a');
    await press(page, 'ArrowUp');
    expect(await active(page)).toBe('dis:c');
    expect(await tabindexes(page, '#dis')).toBe('-1,-1,0,-1');
    expect((await events(page)).filter((e) => e.startsWith('dis:'))).toEqual(['dis:c', 'dis:a', 'dis:c']);
  });

  test('in right-to-left the inline arrows swap and Up and Down do not', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    await settle(page);
    await page.locator('#plan [value=free]').focus();
    await press(page, 'ArrowLeft');
    expect(await active(page)).toBe('plan:pro');
    await press(page, 'ArrowRight');
    expect(await active(page)).toBe('plan:free');
    await press(page, 'ArrowDown');
    expect(await active(page)).toBe('plan:pro');
    await press(page, 'ArrowUp');
    expect(await active(page)).toBe('plan:free');
    await press(page, 'ArrowRight');
    expect(await active(page)).toBe('plan:team');
  });

  test('radios outside a group that share a name behave as one group', async ({ page }) => {
    await page.locator('#green').focus();
    await watch(page);
    expect(await tabindexes(page, '#solo')).toBe('-1,0,-1');
    await press(page, 'ArrowDown');
    expect(await active(page)).toBe('solo:blue');
    await press(page, 'ArrowDown');
    expect(await active(page)).toBe('solo:red');
    await press(page, 'ArrowUp');
    expect(await active(page)).toBe('solo:blue');
    expect((await form(page)).color).toBe('blue');
    expect(await events(page)).toEqual(['click', 'solo:blue', 'click', 'solo:red', 'click', 'solo:blue']);
    expect(await tabindexes(page, '#solo')).toBe('-1,-1,0');
    await expect(page.locator('#red')).not.toBeChecked();
  });

  test('the accessibility tree shows a named radiogroup with its radios and checked state', async ({ page }) => {
    await expect(page.locator('#plan')).toMatchAriaSnapshot(`
      - radiogroup "Plan":
        - radio "Free" [checked]
        - radio "Pro"
        - radio "Team"
    `);
    await expect(page.locator('#dis')).toMatchAriaSnapshot(`
      - radiogroup "Tier":
        - radio "Tier A" [checked]
        - radio "Tier B" [disabled]
        - radio "Tier C"
        - radio "Tier D" [disabled]
    `);
  });

  test('in Chromium the radios are direct accessibility children of the radiogroup, so the browser counts their position', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'reads the Chromium accessibility tree over the DevTools protocol');
    type AX = { nodeId: string; parentId?: string; ignored?: boolean; role?: { value: string }; name?: { value: string }; childIds?: string[] };
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: AX[] };
    const byId = new Map(nodes.map((n) => [n.nodeId, n]));
    const role = (n: AX) => n.role?.value;
    const wrapper = (n: AX) => n.ignored || role(n) === 'generic' || role(n) === 'none';
    // The parent that counts: ignored and generic wrappers are skipped when the browser numbers a set.
    const parentOf = (n: AX) => {
      let p = n.parentId ? byId.get(n.parentId) : undefined;
      while (p && wrapper(p)) p = p.parentId ? byId.get(p.parentId) : undefined;
      return p;
    };
    const radios = nodes.filter((n) => !n.ignored && role(n) === 'radio' && ['Free', 'Pro', 'Team'].includes(n.name?.value ?? ''));
    expect(radios.map((r) => r.name?.value)).toEqual(['Free', 'Pro', 'Team']);
    for (const r of radios) {
      const parent = parentOf(r)!;
      expect(role(parent)).toBe('radiogroup');
      expect(parent.name?.value).toBe('Plan');
    }
    const group = parentOf(radios[0]!)!;
    const under = (n: AX): AX[] => (n.childIds ?? []).flatMap((id) => {
      const c = byId.get(id)!;
      return !c.ignored && role(c) === 'radio' ? [c] : wrapper(c) ? under(c) : [];
    });
    expect(under(group).map((n) => n.name?.value)).toEqual(['Free', 'Pro', 'Team']);
  });
});

for (const engine of ['turbo', 'morphdom', 'alpine'] as const) {
  test.describe(`${engine} morph of a radio group`, () => {
    const markup = (value: string, extra = '') => `<form id="f"><void-radio-group id="rg" label="Plan" name="plan" value="${value}"><void-radio value="a">A</void-radio><void-radio value="b">B</void-radio><void-radio value="c">C</void-radio></void-radio-group>${extra}</form>`;
    const render = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.render(h), html);
    const morph = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.morph(h), html);

    test.beforeEach(async ({ page }) => {
      await load(page, `/morph-${engine}`);
    });

    test('the focused radio stays focused and the tab stop follows the value the server sends', async ({ page }) => {
      await render(page, markup('a'));
      await page.locator('#rg [value=a]').focus();
      await press(page, 'ArrowDown');
      expect(await tabindexes(page, '#rg')).toBe('-1,0,-1');
      // The server repeats itself with the old value (the client's choice is kept) ...
      await morph(page, markup('a'));
      await settle(page);
      expect(await page.evaluate(() => (document.activeElement as HTMLElement).getAttribute('value'))).toBe('b');
      expect(await tabindexes(page, '#rg')).toBe('-1,0,-1');
      // ... then changes it.
      await morph(page, markup('c'));
      await settle(page);
      expect(await page.evaluate(() => (document.activeElement as HTMLElement).getAttribute('value'))).toBe('b');
      expect(await tabindexes(page, '#rg')).toBe('-1,-1,0');
      expect(await page.locator('#rg').getAttribute('value')).toBe('c');
      await press(page, 'ArrowDown');
      expect(await page.evaluate(() => (document.activeElement as HTMLElement).getAttribute('value'))).toBe('c');
    });
  });
}
