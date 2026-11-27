// SPDX-License-Identifier: MIT
//
// The ORDER of operations a screen reader depends on (#75), asserted without a screen reader. A reader announces
// state at the moment focus arrives or an attribute changes, so a state written a frame after focus moved, an
// `aria-activedescendant` that names an element which has no id or role yet, or a checked radio that was briefly
// unchecked, is heard as stale or missing speech. The page's own trace (screen-readers/trace.ts) records focus
// changes and `aria-*` mutations in order; these tests read it.
import { test, expect, load, settle, type Page } from '../helpers/test';
import { clearTrace, installTrace, readTrace, type TraceEntry } from '../screen-readers/trace';

/** Every state of one element at the moment focus arrives on any element matching `selector` (a capture-phase focusin). */
async function snapshotOnFocus(page: Page, selector: string, read: string): Promise<void> {
  await page.evaluate(
    ([sel, body]) => {
      const w = window as unknown as { __atFocus: unknown[] };
      w.__atFocus = [];
      const fn = new Function('el', `return (${body})(el)`) as (el: Element) => unknown;
      document.addEventListener(
        'focusin',
        (e) => {
          if ((e.target as Element).matches(sel)) w.__atFocus.push(fn(e.target as Element));
        },
        true,
      );
    },
    [selector, read] as const,
  );
}
const atFocus = <T>(page: Page) => page.evaluate(() => (window as unknown as { __atFocus: unknown[] }).__atFocus) as Promise<T[]>;

const attr = (trace: TraceEntry[], name: string, target: RegExp) => trace.filter((e) => e.kind === 'attr' && e.name === name && target.test(e.target));

test.describe('screen reader order of operations', () => {
  test('dropdown menu: the trigger says expanded, the menu is open and the first item is a focusable menuitem before focus lands on it', async ({ page }) => {
    await installTrace(page);
    await load(page, '/sr-menu');
    await snapshotOnFocus(
      page,
      'void-dropdown-menu-item',
      `(el) => { const menu = el.closest('[role=menu]'); const trigger = document.getElementById('actions-trigger');
        return { expanded: trigger.getAttribute('aria-expanded'), haspopup: trigger.getAttribute('aria-haspopup'), open: menu.matches(':popover-open'),
          role: el.getAttribute('role'), tabindex: el.getAttribute('tabindex'), text: el.textContent.trim(), first: el === menu.querySelector('[role=menuitem]'),
          position: [...menu.querySelectorAll('[role=menuitem]')].indexOf(el) + 1 }; }`,
    );
    await page.locator('#actions-trigger').focus();
    await clearTrace(page);
    await page.keyboard.press('Enter');
    await settle(page);
    const seen = await atFocus<{ expanded: string; haspopup: string; open: boolean; role: string; tabindex: string; text: string; first: boolean }>(page);
    expect(seen.length, 'focus moved into the menu once').toBe(1);
    expect(seen[0]).toMatchObject({ expanded: 'true', haspopup: 'menu', open: true, role: 'menuitem', tabindex: '-1', text: 'Rename', first: true });
    // And in the trace: nothing about the trigger's state changes after focus is on the item.
    const trace = await readTrace(page);
    const focused = trace.findIndex((e) => e.kind === 'focus' && /menuitem/.test(e.target));
    const expanded = trace.findIndex((e) => e.kind === 'attr' && e.name === 'aria-expanded' && e.to === 'true');
    expect(expanded, 'aria-expanded was set').toBeGreaterThanOrEqual(0);
    expect(expanded, 'aria-expanded true is written before focus moves to the first item').toBeLessThan(focused);
    expect(trace.slice(focused + 1).filter((e) => e.kind === 'attr' && e.name === 'aria-expanded'), 'nothing changes the trigger state after focus moved').toEqual([]);
  });

  test('multiselect: every option has aria-selected true or false and an id and role before the highlight points at it, and a choice changes false to true', async ({ page }) => {
    await installTrace(page);
    await load(page, '/sr-pickers');
    const initial = await page.locator('#skills void-option').evaluateAll((os) => os.map((o) => `${o.getAttribute('role')}:${o.getAttribute('aria-selected')}:${o.id ? 'id' : 'no-id'}`));
    expect(initial, 'a multiselectable listbox says, for each option, whether it is selected').toEqual(['option:false:id', 'option:false:id', 'option:false:id']);
    await page.locator('#skills [role=combobox]').focus();
    await clearTrace(page);
    await page.keyboard.press('ArrowDown');
    await settle(page);
    // The highlighted option exists, has its role and id, and is named by aria-activedescendant on the combobox that has focus.
    const state = await page.evaluate(() => {
      const combo = document.querySelector('#skills [role=combobox]')!;
      const target = document.getElementById(combo.getAttribute('aria-activedescendant') ?? '');
      return { expanded: combo.getAttribute('aria-expanded'), role: target?.getAttribute('role'), selected: target?.getAttribute('aria-selected'), text: target?.textContent?.trim(), focus: document.activeElement === combo };
    });
    expect(state).toEqual({ expanded: 'true', role: 'option', selected: 'false', text: 'CSS', focus: true });
    const trace = await readTrace(page);
    const pointed = trace.findIndex((e) => e.kind === 'attr' && e.name === 'aria-activedescendant' && e.to);
    expect(pointed, 'aria-activedescendant was set').toBeGreaterThanOrEqual(0);
    expect(trace.filter((e) => e.kind === 'attr' && e.name === 'aria-selected' && e.from === null), 'aria-selected is never added late: it was there before').toEqual([]);
    await clearTrace(page);
    await page.keyboard.press('Enter');
    await settle(page);
    const change = attr(await readTrace(page), 'aria-selected', /CSS/);
    expect(change.map((e) => `${e.from}->${e.to}`), 'choosing CSS changes aria-selected from false to true on the option the highlight is on').toEqual(['false->true']);
    expect(await page.locator('#skills void-option').first().getAttribute('aria-selected')).toBe('true');
  });

  test('radio: the checked radio is never exposed as unchecked, from load to settled', async ({ page }) => {
    await installTrace(page);
    await load(page, '/sr-controls');
    const trace = await readTrace(page);
    const free = attr(trace, 'aria-checked', /Free/);
    expect(free.map((e) => `${e.from}->${e.to}`), 'the group value "free" reaches the first radio as checked and never unchecks it').not.toContain('true->false');
    expect(await page.locator('#plan void-radio').evaluateAll((rs) => rs.map((r) => r.getAttribute('aria-checked')))).toEqual(['true', 'false', 'false']);
    // Choosing another moves the state in the same step: no moment where none, or two, are checked.
    await clearTrace(page);
    await page.locator('#plan void-radio').nth(1).click();
    await settle(page);
    expect(await page.locator('#plan void-radio').evaluateAll((rs) => rs.map((r) => r.getAttribute('aria-checked')))).toEqual(['false', 'true', 'false']);
  });

  test('accordion: a collapsed trigger says expanded false from load and never says true until opened; opening writes it before anything else', async ({ page }) => {
    await installTrace(page);
    await load(page, '/sr-disclosure');
    const trigger = page.locator('void-accordion-trigger').first();
    expect(await trigger.getAttribute('aria-expanded')).toBe('false');
    expect(await trigger.getAttribute('role')).toBe('button');
    const loadTrace = await readTrace(page);
    expect(attr(loadTrace, 'aria-expanded', /accordion-trigger/).filter((e) => e.to === 'true'), 'no trigger is ever exposed as expanded while collapsed').toEqual([]);
    await clearTrace(page);
    await trigger.focus();
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await trigger.getAttribute('aria-expanded')).toBe('true');
    const after = await readTrace(page);
    const changes = attr(after, 'aria-expanded', /How do refunds/);
    expect(changes.map((e) => `${e.from}->${e.to}`)).toEqual(['false->true']);
    // Focus stays on the trigger the whole time: the reader hears the state change on the control it is on.
    expect(after.filter((e) => e.kind === 'focus' || e.kind === 'blur').filter((e) => !/accordion-trigger/.test(e.target))).toEqual([]);
  });

  test('tabs: each tab has role, aria-selected and a tab stop before focus moves to it', async ({ page }) => {
    await installTrace(page);
    await load(page, '/sr-tabs');
    await snapshotOnFocus(
      page,
      '[role=tab]',
      `(el) => ({ text: el.textContent.trim(), role: el.getAttribute('role'), selected: el.getAttribute('aria-selected'), controls: !!document.getElementById(el.getAttribute('aria-controls') || ''), list: el.parentElement.getAttribute('role') })`,
    );
    await page.getByRole('tab', { name: 'Profile' }).focus();
    await page.keyboard.press('ArrowRight');
    await settle(page);
    expect(await atFocus(page)).toEqual([
      { text: 'Profile', role: 'tab', selected: 'true', controls: true, list: 'tablist' },
      { text: 'Billing', role: 'tab', selected: 'false', controls: true, list: 'tablist' },
    ]);
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await page.getByRole('tab', { name: 'Billing' }).getAttribute('aria-selected')).toBe('true');
    expect(await page.getByRole('tab', { name: 'Profile' }).getAttribute('aria-selected')).toBe('false');
  });
});
