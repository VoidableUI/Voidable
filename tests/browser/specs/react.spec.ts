// SPDX-License-Identifier: MIT
//
// React 19 through @voidable/ui-react's built wrappers (src/react-app.tsx):
// a controlled form, a dialog driven by state, keyed lists inside tabs and a
// dropdown, options from state, and unmounting. Run plain and in StrictMode.
import { test, expect, load, settle, type Page } from '../helpers/test';

const api = (page: Page, name: string, value: unknown) =>
  page.evaluate(async ([n, v]) => {
    (window as any).api[n as string](v);
    await new Promise((r) => setTimeout(r));
    await (window as any).__settle();
  }, [name, value] as const);
const events = (page: Page) => page.evaluate(() => (window as any).events.splice(0) as string[]);
const prop = (page: Page, id: string, name: string) => page.evaluate(([id, n]) => (document.getElementById(id) as any)[n], [id, name]);

for (const strict of [false, true]) {
  test.describe(strict ? 'React 19, StrictMode' : 'React 19', () => {
    test.beforeEach(async ({ page }) => {
      await load(page, strict ? '/react?strict' : '/react');
    });

    test('a controlled form follows state and reports user input through the wrappers', async ({ page }) => {
      await page.locator('#r-name input').fill('Ada');
      await settle(page);
      expect(await prop(page, 'r-name', 'value')).toBe('Ada');
      expect((await events(page)).filter((e) => e.startsWith('input:'))).not.toHaveLength(0);

      await page.locator('#r-agree').click();
      await page.locator('#r-on').click();
      await page.locator('#r-country select').selectOption('c');
      await page.locator('#r-plan void-radio[value=pro]').click();
      await settle(page);
      const ev = await events(page);
      expect(ev).toEqual(expect.arrayContaining([expect.stringMatching(/^agree:.*"checked":true/), expect.stringMatching(/^on:.*"checked":false/), expect.stringMatching(/^country:.*"c"/), expect.stringMatching(/^plan:.*"pro"/)]));

      // State set by the app shows in the elements.
      await api(page, 'setName', 'Grace');
      await api(page, 'setAgree', false);
      await api(page, 'setCountry', 'a');
      expect(await prop(page, 'r-name', 'value')).toBe('Grace');
      await expect(page.locator('#r-name input')).toHaveValue('Grace');
      expect(await prop(page, 'r-agree', 'checked')).toBe(false);
      await expect(page.locator('#r-country select')).toHaveValue('a');

      await page.locator('#r-submit').click();
      const sent = await page.evaluate(() => (window as any).submits.at(-1));
      expect(sent).toEqual([['name', 'Grace'], ['bio', 'hello'], ['country', 'a'], ['plan', 'pro']]);
    });

    test('disabled from state disables the controls', async ({ page }) => {
      await api(page, 'setDisabled', true);
      await expect(page.locator('#r-name input')).toBeDisabled();
      await page.locator('#r-submit').click({ force: true });
      expect(await page.evaluate(() => (window as any).submits.length)).toBe(0);
    });

    test('a dialog opened and closed by state, and closed by the user', async ({ page }) => {
      for (let i = 0; i < 3; i++) {
        await api(page, 'setOpen', true);
        await expect(page.locator('#r-dlg .di').first()).toBeVisible();
        await api(page, 'setDlgItems', ['one', 'two', `three-${i}`]);
        await expect(page.locator('#r-dlg .di')).toHaveText(['one', 'two', `three-${i}`]);
        await expect(page.locator('#r-dlg void-dialog-title')).toHaveText('Dialog 3');
        await api(page, 'setOpen', false);
        await expect(page.locator('#r-dlg .di').first()).toBeHidden();
      }
      await api(page, 'setOpen', true);
      await page.keyboard.press('Escape');
      await settle(page);
      expect(await events(page)).toContain('close:{"reason":"escape"}');
      expect(await prop(page, 'r-dlg', 'open')).toBe(false);
      // React's state followed the close, so opening again works.
      await api(page, 'setOpen', true);
      await expect(page.locator('#r-dlg .di').first()).toBeVisible();
    });

    test('keyed tab panels reorder, add and remove without losing the selection', async ({ page }) => {
      await page.locator('#r-tabs').getByRole('tab', { name: 'Tab y' }).click();
      await settle(page);
      expect(await prop(page, 'r-tabs', 'value')).toBe('y');
      await api(page, 'setTab', 'y');
      await api(page, 'setTabs', ['z', 'y', 'x', 'w']);
      await expect(page.locator('#r-tabs').getByRole('tab')).toHaveText(['Tab z', 'Tab y', 'Tab x', 'Tab w']);
      await expect(page.locator('#r-tabs').getByRole('tab', { name: 'Tab y' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#r-tabs').getByRole('tabpanel')).toHaveText(/Panel y v1/);
      await api(page, 'setLabel', 'v2');
      await expect(page.locator('#r-tabs').getByRole('tabpanel')).toHaveText(/Panel y v2/);
      await api(page, 'setTabs', ['z', 'y']);
      await expect(page.locator('#r-tabs').getByRole('tab')).toHaveText(['Tab z', 'Tab y']);
      expect(await page.locator('#r-tabs void-tabs-content').count()).toBe(2);
    });

    test('options and menu items from state', async ({ page }) => {
      await api(page, 'setOpts', ['b', 'c', 'd']);
      await expect(page.locator('#r-country option:not([hidden])')).toHaveText(['Opt b', 'Opt c', 'Opt d']);
      await expect(page.locator('#r-country select')).toHaveValue('b');
      await page.locator('#r-ddt').click();
      await expect(page.locator('#r-dd').getByRole('menuitem')).toHaveText(['Item b', 'Item c', 'Item d']);
      await page.locator('#r-ddi-d').click();
      expect(await events(page)).toContain('select-d:{"item":"void-dropdown-menu-item","value":""}');
      // Choosing an item closes the menu; open it again to see the items follow state.
      await expect(page.locator('#r-dd')).not.toHaveAttribute('open', '');
      await api(page, 'setOpts', ['a']);
      await page.locator('#r-ddt').click();
      await expect(page.locator('#r-dd').getByRole('menuitem')).toHaveText(['Item a']);
      await api(page, 'setLabel', 'v3');
      await expect(page.locator('#r-ddt')).toHaveText('Menu v3');
    });

    test('unmounting removes everything and leaves no listeners firing', async ({ page }) => {
      await api(page, 'setOpen', true);
      await page.evaluate(() => (window as any).unmount());
      await settle(page);
      expect(await page.evaluate(() => document.getElementById('app')!.childElementCount)).toBe(0);
      expect(await page.evaluate(() => document.querySelectorAll('[class^=void-]').length)).toBe(0);
      // The open dialog's scroll lock is released with it.
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
      await page.keyboard.press('Escape');
      await page.mouse.click(5, 5);
      expect(await events(page)).toEqual([]);
      // And it can be mounted again.
      await page.evaluate(() => (window as any).mount());
      await expect(page.locator('#r-name input')).toHaveValue('init');
    });
  });
}
