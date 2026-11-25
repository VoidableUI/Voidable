// SPDX-License-Identifier: MIT
//
// Keyboard operation and accessibility-tree structure of the composite
// widgets, against the WAI-ARIA Authoring Practices patterns.
import { test, expect, expectedFailure, load, settle, focused, type Page } from '../helpers/test';

test.beforeEach(async ({ page }) => {
  await load(page, '/widgets');
});

const value = (page: Page, id: string) => page.evaluate((id) => (document.getElementById(id) as any).value, id);
const activeLabel = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || (document.activeElement?.textContent || '').trim());

/** Presses each key and records the focused element's label after it. */
async function walk(page: Page, keys: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const key of keys) {
    await page.keyboard.press(key);
    await settle(page);
    out.push(await activeLabel(page));
  }
  return out;
}

test.describe('tabs', () => {
  test('tablist, tabs and the visible panel form the APG structure', async ({ page }) => {
    await expect(page.locator('#tabs')).toMatchAriaSnapshot(`
      - tablist:
        - tab "One" [selected]
        - tab "Two"
        - tab "Three"
      - tabpanel "One":
        - text: Panel one
        - link "link"
    `);
    // Each tab controls its panel and each panel is labelled by its tab.
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('#tabs [role=tab]')].map((t) => {
        const panel = document.getElementById(t.getAttribute('aria-controls') || '');
        return !!panel && panel.getAttribute('aria-labelledby') === t.id && panel.getAttribute('role') === 'tabpanel';
      }),
    );
    expect(links).toEqual([true, true, true]);
  });

  // Manual activation (APG allows either): arrows move focus, Enter or Space selects.
  test('one tab stop; arrows move focus and wrap; Enter selects', async ({ page }) => {
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    expect(await activeLabel(page)).toBe('One');
    expect(await walk(page, ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft'])).toEqual(['Two', 'Three', 'One', 'Three', 'Two']);
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await value(page, 'tabs')).toBe('two');
    await expect(page.locator('#tabs').getByRole('tabpanel')).toHaveText('Panel two');
    // Tab leaves the tablist instead of visiting the other tabs.
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement!.closest('#tabs [role=tablist]'))).toBe(false);
  });

  // The active panel is itself a tab stop (APG: tabpanel tabindex=0), so Tab from the tab lands on the
  // panel, and the next Tab reaches its content.
  test('Tab from the selected tab enters its panel', async ({ page }) => {
    await page.locator('#tabs').getByRole('tab', { name: 'One' }).focus();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('tabpanel');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('p1-link');
  });

  test('Home and End move to the first and last tab', async ({ page }) => {
    await page.locator('#tabs').getByRole('tab', { name: 'One' }).focus();
    expect(await walk(page, ['End', 'Home'])).toEqual(['Three', 'One']);
  });

  test('a tablist with no value set is still reachable by Tab', async ({ page }) => {
    await page.locator('#tabs').getByRole('tab', { name: 'One' }).focus();
    await page.keyboard.press('Tab'); // panel one
    await page.keyboard.press('Tab'); // panel one's link
    await page.keyboard.press('Tab');
    expect(await activeLabel(page)).toBe('Alpha');
    // With no value the first enabled tab is the tab stop but nothing is selected until the user chooses.
    const alpha = page.locator('#tabs-unset').getByRole('tab', { name: 'Alpha' });
    await expect(alpha).toHaveAttribute('aria-selected', 'false');
    await page.keyboard.press('Enter');
    await expect(alpha).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('accordion', () => {
  test('headers are buttons that expose and control their regions', async ({ page }) => {
    const trigger = page.locator('#acc-1').getByRole('button', { name: 'Section 1' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panelId = await trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();
    await expect(page.locator(`[id="${panelId}"]`)).toHaveText('Content 1');
    await page.keyboard.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(`[id="${panelId}"]`)).toBeHidden();
  });

  test('Tab moves between headers and into an open panel', async ({ page }) => {
    await page.locator('#acc-1').getByRole('button').focus();
    await page.keyboard.press('Tab');
    expect(await activeLabel(page)).toBe('Section 2');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    expect(await activeLabel(page)).toBe('Section 3');
  });
});

test.describe('segmented-control', () => {
  test('is a named radiogroup with the selected item checked', async ({ page }) => {
    await expect(page.locator('#seg')).toMatchAriaSnapshot(`
      - radiogroup "View":
        - radio "List" [checked]
        - radio "Grid"
        - radio "Map"
    `);
  });

  test('arrows move the selection and wrap', async ({ page }) => {
    await page.locator('#seg').getByRole('radio', { name: 'List' }).focus();
    expect(await walk(page, ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft'])).toEqual(['Grid', 'Map', 'List', 'Map']);
    expect(await value(page, 'seg')).toBe('map');
    await expect(page.locator('#seg').getByRole('radio', { name: 'Map' })).toBeChecked();
  });

  test('a radiogroup is a single tab stop', async ({ page }) => {
    await page.locator('#seg').getByRole('radio', { name: 'List' }).focus();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('seg')!.contains(document.activeElement))).toBe(false);
  });

  test('ArrowLeft with nothing selected selects the last item', async ({ page }) => {
    await page.locator('#seg-none').getByRole('radio', { name: 'A' }).focus();
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.locator('#seg-none').getByRole('radio').first().focus();
    // Nothing is selected yet; focus is on the first item without selecting it.
    expect(await value(page, 'seg-none')).toBe('');
    await page.keyboard.press('ArrowLeft');
    await settle(page);
    expect(await value(page, 'seg-none')).toBe('c');
  });
});

test.describe('slider', () => {
  test('is a named slider whose value follows the keyboard', async ({ page }) => {
    const slider = page.getByRole('slider', { name: 'Volume' });
    await expect(slider).toHaveValue('50');
    await slider.focus();
    const seen: number[] = [];
    for (const key of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'End', 'Home', 'PageUp']) {
      await page.keyboard.press(key);
      await settle(page);
      seen.push(Number(await value(page, 'slider')));
    }
    expect(seen.slice(0, 6)).toEqual([55, 60, 55, 50, 100, 0]);
    expect(seen[6]).toBeGreaterThan(0);
    await expect(slider).toHaveValue(String(seen[6]));
  });
});

test.describe('select', () => {
  // Arrow keys on a closed native select differ by platform (some open the picker), so type-ahead it is.
  test('is a named combobox operated by type-ahead', async ({ page }) => {
    const select = page.getByRole('combobox', { name: 'Country' });
    await expect(select).toHaveCount(1);
    await select.focus();
    await page.keyboard.type('Fi');
    await settle(page);
    expect(await value(page, 'select')).toBe('fj');
    expect(await page.evaluate(() => (window as any).events.filter((e: string) => e.startsWith('void-change:select')).length)).toBeGreaterThan(0);
  });
});

test.describe('menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(async () => {
      const menu = document.getElementById('menu') as any;
      menu.open = true;
      await menu.updateComplete;
    });
  });

  test('menuitems are direct children of the menu in the accessibility tree', async ({ page }) => {
    await expect(page.locator('#menu')).toMatchAriaSnapshot(`
      - menu "Actions":
        - menuitem "Edit"
        - menuitem "Duplicate"
        - menuitem "Archive" [disabled]
        - menuitem "Delete"
    `, { timeout: 1000 });
  });

  test('arrows move through enabled items, skipping disabled ones; Enter selects', async ({ page }) => {
    await page.locator('#menu').getByRole('menuitem', { name: 'Edit' }).focus();
    expect(await walk(page, ['ArrowDown', 'ArrowDown', 'ArrowUp'])).toEqual(['Duplicate', 'Delete', 'Duplicate']);
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await page.evaluate(() => (window as any).events.filter((e: string) => e.startsWith('void-select')))).toHaveLength(1);
  });

  test('an open menu does not take arrow keys from a textarea elsewhere on the page', async ({ page }) => {
    await page.locator('#notes').focus();
    await page.evaluate(() => (document.getElementById('notes') as HTMLTextAreaElement).setSelectionRange(0, 0));
    await page.keyboard.press('ArrowDown');
    expect(await page.evaluate(() => (document.getElementById('notes') as HTMLTextAreaElement).selectionStart)).toBeGreaterThan(0);
  });
});

test.describe('calendar', () => {
  const cal = (page: Page) => page.locator('#cal');

  test('is a labelled grid with one tabbable day, the selected one', async ({ page }) => {
    await expect(cal(page).getByRole('grid', { name: 'November 2026' })).toHaveCount(1);
    expect(await page.evaluate(() => [...document.querySelectorAll('#cal [role=grid] [tabindex="0"]')].map((e) => e.getAttribute('aria-label')))).toEqual(['Tuesday, November 10, 2026']);
    expect(await page.evaluate(() => [...document.querySelectorAll('#cal [role=gridcell][aria-selected=true]')].map((c) => c.querySelector('button')?.getAttribute('aria-label')))).toEqual(['Tuesday, November 10, 2026']);
  });

  test('arrows move by day and week, Home and End to the week edges, PageUp and PageDown by month', async ({ page }) => {
    await cal(page).getByRole('button', { name: 'Tuesday, November 10, 2026' }).focus();
    expect(await walk(page, ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'])).toEqual([
      'Wednesday, November 11, 2026',
      'Wednesday, November 18, 2026',
      'Tuesday, November 17, 2026',
      'Tuesday, November 10, 2026',
      'Sunday, November 8, 2026',
      'Saturday, November 14, 2026',
      'Monday, December 14, 2026',
      'Saturday, November 14, 2026',
    ]);
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await value(page, 'cal')).toBe('2026-11-14');
    // Still one tab stop, now on the new selection.
    expect(await page.evaluate(() => [...document.querySelectorAll('#cal [role=grid] [tabindex="0"]')].map((e) => e.getAttribute('aria-label')))).toEqual(['Saturday, November 14, 2026']);
  });

  test('Shift+PageDown moves by a year', async ({ page }) => {
    await cal(page).getByRole('button', { name: 'Tuesday, November 10, 2026' }).focus();
    expect(await walk(page, ['Shift+PageDown'])).toEqual(['Wednesday, November 10, 2027']);
  });
});

test.describe('date-picker', () => {
  test('is a combobox named by its field that opens a calendar dialog', async ({ page }) => {
    const input = page.locator('#date input');
    await expect(page.getByRole('textbox', { name: 'Start date' })).toHaveCount(1);
    await input.click();
    await expect(page.locator('#date [role=grid]')).toBeVisible();
    await expect(page.locator('#date')).toHaveAttribute('aria-expanded', 'true');
  });

  test('opening moves focus into the calendar on the selected day', async ({ page }) => {
    expectedFailure('#6', 'date-picker does not move focus into its popup');
    await page.locator('#date input').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => activeLabel(page), { timeout: 1000 }).toBe('Tuesday, November 10, 2026');
  });

  test('Escape inside the calendar closes it and returns focus to the input', async ({ page }) => {
    expectedFailure('#6', 'Escape with focus inside the date-picker drops focus to <body>');
    await page.locator('#date input').click();
    await page.locator('#date').getByRole('button', { name: 'Tuesday, November 10, 2026' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#date [role=grid]')).toBeHidden();
    expect(await page.evaluate(() => document.activeElement === document.querySelector('#date input'))).toBe(true);
  });

  test('picking a day with the keyboard sets the value and closes', async ({ page }) => {
    await page.locator('#date input').click();
    await page.locator('#date').getByRole('button', { name: 'Tuesday, November 10, 2026' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await value(page, 'date')).toBe('2026-11-11');
    await expect(page.locator('#date [role=grid]')).toBeHidden();
  });
});

test.describe('combobox and multiselect keyboard selection', () => {
  test('combobox: ArrowDown and Enter pick an option', async ({ page }) => {
    await page.locator('#combo input').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await value(page, 'combo')).toBe('vue');
  });

  // Opening highlights the first option (focus stays on the trigger, aria-activedescendant points at the
  // highlight), arrows move it, Space and Enter toggle it, and the list stays open.
  test('multiselect: arrows and Space toggle options', async ({ page }) => {
    const trigger = page.locator('#multi .void-multiselect-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await settle(page);
    expect(await value(page, 'multi')).toEqual(['js']);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await settle(page);
    expect([...(await value(page, 'multi'))].sort()).toEqual(['css', 'js']);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

test('the whole page can be walked with Tab without a trap', async ({ page }) => {
  await page.locator('#start').focus();
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    if ((await page.evaluate(() => document.activeElement?.id)) === 'end') return;
  }
  throw new Error(`Tab never reached the end; stuck at ${await focused(page)}`);
});
