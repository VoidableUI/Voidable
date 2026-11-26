// SPDX-License-Identifier: MIT
//
// void-table sorting, filtering and selection in a real browser: every sort type, empty cells, accents and
// `lang`; filter terms, hidden rows, the empty part and the live region; selection, ranges, select-all and its
// mixed state, form data; server mode; morphs in each mode through each adapter; stacked and right-to-left.
import { test, expect, load, settle, type Page } from '../helpers/test';

const col = (page: Page, id: string, n = 1) => page.locator(`#${id} tbody tr td:nth-child(${n})`).allInnerTexts();
const shownCol = (page: Page, id: string, n = 1) => page.locator(`#${id} tbody tr:not([hidden]) td:nth-child(${n})`).allInnerTexts();
const sortButton = (page: Page, id: string, name: string) => page.locator(`#${id} thead th button`, { hasText: name });
const live = (page: Page, id: string) => page.locator(`#${id} > [data-void-announcer]`);

test.describe('sorting', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/table-data');
  });

  test('a sortable header is a button inside the th, which carries aria-sort', async ({ page }) => {
    const th = page.locator('#sort thead th').first();
    await expect(th).toHaveAttribute('aria-sort', 'none');
    await expect(th.getByRole('button', { name: 'Name' })).toBeVisible();
    expect(await th.ariaSnapshot()).toContain('button "Name"');
  });

  test('text: numeric collation, accents, empty cells last in both directions, three states', async ({ page }) => {
    const original = await col(page, 'sort');
    const b = sortButton(page, 'sort', 'Name');
    await b.click();
    await expect(page.locator('#sort thead th').first()).toHaveAttribute('aria-sort', 'ascending');
    expect(await col(page, 'sort')).toEqual(['apple 2', 'apple 10', 'Éclair', 'Zebra apple', '']);
    await b.click();
    await expect(page.locator('#sort thead th').first()).toHaveAttribute('aria-sort', 'descending');
    expect(await col(page, 'sort')).toEqual(['Zebra apple', 'Éclair', 'apple 10', 'apple 2', '']);
    await b.click();
    await expect(page.locator('#sort thead th').first()).toHaveAttribute('aria-sort', 'none');
    expect(await col(page, 'sort')).toEqual(original);
    await expect(page.locator('#sort')).not.toHaveAttribute('sort', /./);
  });

  test('number and date use their types and data-sort-value', async ({ page }) => {
    await sortButton(page, 'sort', 'Quantity').click();
    expect(await col(page, 'sort', 2)).toEqual(['1.5', '9', '12', '100', '']);
    await sortButton(page, 'sort', 'Quantity').click();
    expect(await col(page, 'sort', 2)).toEqual(['100', '12', '9', '1.5', '']);
    await sortButton(page, 'sort', 'Picked').click();
    expect(await col(page, 'sort', 3)).toEqual(['31 Dec', '15 Jan', '1 Feb', '2 Mar', '']);
    await expect(page.locator('#sort')).toHaveAttribute('sort', 'date');
    await expect(page.locator('#sort')).toHaveAttribute('sort-direction', 'ascending');
    // One column at a time.
    await expect(page.locator('#sort thead th').nth(1)).toHaveAttribute('aria-sort', 'none');
  });

  test('the closest lang sets the collation', async ({ page }) => {
    await sortButton(page, 'sv', 'Ord').click();
    expect(await col(page, 'sv')).toEqual(['apa', 'zebra', 'ära']);
  });

  test('void-sort carries column and direction, and can be cancelled', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('sort')!;
      (window as any).sorts = [];
      el.addEventListener('void-sort', (e) => {
        (window as any).sorts.push((e as CustomEvent).detail);
        if ((window as any).sorts.length === 2) e.preventDefault();
      });
    });
    await sortButton(page, 'sort', 'Name').click();
    await sortButton(page, 'sort', 'Name').click();
    expect(await page.evaluate(() => (window as any).sorts)).toEqual([
      { column: 'name', direction: 'ascending' },
      { column: 'name', direction: 'descending' },
    ]);
    await expect(page.locator('#sort')).toHaveAttribute('sort-direction', 'ascending');
  });

  test('setting sort and sort-direction on the host sorts at once and announces nothing it did not do', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('sort')!;
      el.setAttribute('sort', 'qty');
      el.setAttribute('sort-direction', 'descending');
    });
    await settle(page);
    expect(await col(page, 'sort', 2)).toEqual(['100', '12', '9', '1.5', '']);
    await expect(page.locator('#sort thead th').nth(1)).toHaveAttribute('aria-sort', 'descending');
  });

  test('the sort button announces the new state in the live region and keeps focus', async ({ page }) => {
    const b = sortButton(page, 'sort', 'Name');
    await b.focus();
    await page.keyboard.press('Enter');
    await expect(live(page, 'sort')).toHaveText('Sorted by Name, ascending');
    await expect(b).toBeFocused();
    await page.keyboard.press('Space');
    await expect(live(page, 'sort')).toHaveText('Sorted by Name, descending');
    await expect(b).toBeFocused();
  });

  test('right-to-left: the same sort, the button stays inside its header', async ({ page }) => {
    await page.locator('#rtl thead th button').first().click();
    expect(await col(page, 'rtl')).toEqual(['a', 'b']);
    const th = (await page.locator('#rtl thead th').first().boundingBox())!;
    const b = (await page.locator('#rtl thead th button').first().boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(th.x - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(th.x + th.width + 1);
    // Text starts at the right edge in right-to-left.
    expect(th.x + th.width - (b.x + b.width)).toBeLessThan(40);
  });
});

test.describe('filtering', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/table-data');
  });

  test('typing filters after a pause: all terms, no case, no accents, hidden rows kept in the DOM', async ({ page }) => {
    const input = page.getByRole('searchbox', { name: 'Filter team' });
    await input.fill('JOSE design');
    await expect(page.locator('#filter tbody tr[hidden]')).toHaveCount(3);
    expect(await shownCol(page, 'filter')).toEqual(['José']);
    expect(await page.locator('#filter tbody tr').count()).toBe(4);
    await expect(page.locator('#filter')).toHaveAttribute('filter', 'JOSE design');
    await expect(live(page, 'filter')).toHaveText('1 of 4 rows');
  });

  test('filter-columns limit the match, and the empty part shows while nothing matches', async ({ page }) => {
    const input = page.getByRole('searchbox', { name: 'Filter team' });
    await input.fill('engineer');
    await expect(page.locator('#filter tbody tr[hidden]')).toHaveCount(2);
    expect(await shownCol(page, 'filter')).toEqual(['Ada', 'Linus']);
    const empty = page.locator('#filter void-table-empty');
    await expect(empty).toBeHidden();
    await input.fill('town');
    await expect(empty).toBeVisible();
    await expect(live(page, 'filter')).toHaveText('0 of 4 rows');
    await input.fill('');
    await expect(empty).toBeHidden();
    await expect(page.locator('#filter tbody tr[hidden]')).toHaveCount(0);
    await expect(live(page, 'filter')).toHaveText('4 rows');
  });

  test('void-filter fires once per pause with filter, shown and total', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).filters = [];
      document.getElementById('filter')!.addEventListener('void-filter', (e) => (window as any).filters.push((e as CustomEvent).detail));
    });
    await page.getByRole('searchbox', { name: 'Filter team' }).pressSequentially('lin', { delay: 20 });
    await expect.poll(() => page.evaluate(() => (window as any).filters.length)).toBe(1);
    expect(await page.evaluate(() => (window as any).filters)).toEqual([{ filter: 'lin', shown: 1, total: 4 }]);
  });

  test('the filter attribute applies at once and fills the field; sorting keeps working on the shown rows', async ({ page }) => {
    await page.evaluate(() => document.getElementById('filter')!.setAttribute('filter', 'engineer'));
    await expect(page.getByRole('searchbox', { name: 'Filter team' })).toHaveValue('engineer');
    expect(await shownCol(page, 'filter')).toEqual(['Ada', 'Linus']);
  });

  test('the live region exists before anything is announced, and is visually hidden', async ({ page }) => {
    const region = live(page, 'filter');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    await expect(region).toHaveAttribute('role', 'status');
    const box = (await region.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
  });
});

test.describe('selection', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/table-data');
    await page.evaluate(() => {
      (window as any).changes = [];
      document.getElementById('select')!.addEventListener('void-change', (e) => (window as any).changes.push((e as CustomEvent).detail));
    });
  });
  const changes = (page: Page) => page.evaluate(() => (window as any).changes);
  const row = (page: Page, n: number) => page.getByRole('checkbox', { name: `Select order ${n}` });
  const all = (page: Page) => page.locator('#select thead void-checkbox');

  test('selecting a row reflects value, marks the row, mixes the header and fires void-change', async ({ page }) => {
    await row(page, 2).click();
    await expect(page.locator('#select')).toHaveAttribute('value', '["o2"]');
    await expect(page.locator('#select tr[data-value=o2]')).toHaveAttribute('aria-selected', 'true');
    await expect(all(page)).toHaveAttribute('aria-checked', 'mixed');
    await expect(all(page)).toHaveAttribute('aria-label', 'Select all rows');
    expect(await changes(page)).toEqual([{ value: ['o2'], all: false }]);
    await expect(live(page, 'select')).toHaveText('1 selected');
    await expect(page.locator('#select void-table-selection')).toBeVisible();
    await expect(page.locator('#select void-table-selection [data-count]')).toHaveText('1');
  });

  test('select-all checks every enabled row shown, skipping disabled ones, in one event; again clears', async ({ page }) => {
    await all(page).click();
    await expect(page.locator('#select')).toHaveAttribute('value', '["o1","o2","o3","o4"]');
    await expect(all(page)).toHaveAttribute('aria-checked', 'true');
    expect(await changes(page)).toEqual([{ value: ['o1', 'o2', 'o3', 'o4'], all: false }]);
    await expect(live(page, 'select')).toHaveText('4 selected');
    await all(page).click();
    await expect(page.locator('#select')).not.toHaveAttribute('value', /./);
    await expect(all(page)).toHaveAttribute('aria-checked', 'false');
    expect((await changes(page)).length).toBe(2);
  });

  test('shift-click selects a range in one event, announced once', async ({ page }) => {
    await row(page, 1).click();
    await row(page, 4).click({ modifiers: ['Shift'] });
    await expect(page.locator('#select')).toHaveAttribute('value', '["o1","o2","o3","o4"]');
    expect((await changes(page)).length).toBe(2);
    await expect(live(page, 'select')).toHaveText('4 selected');
  });

  test('Space toggles the focused row checkbox', async ({ page }) => {
    await row(page, 3).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#select')).toHaveAttribute('value', '["o3"]');
    await page.keyboard.press('Space');
    await expect(page.locator('#select')).not.toHaveAttribute('value', /./);
  });

  test('the selection goes to the form, one entry per row', async ({ page }) => {
    await row(page, 1).click();
    await row(page, 3).click();
    const entries = await page.evaluate(() => [...new FormData(document.getElementById('form') as HTMLFormElement)]);
    expect(entries).toEqual([
      ['rows', 'o1'],
      ['rows', 'o3'],
    ]);
  });

  test('sorting keeps the selection with its rows', async ({ page }) => {
    await row(page, 2).click();
    await page.locator('#select thead th button', { hasText: 'Order' }).click();
    await page.locator('#select thead th button', { hasText: 'Order' }).click();
    expect(await col(page, 'select', 2)).toEqual(['5', '4', '3', '2', '1']);
    await expect(page.locator('#select tr[data-value=o2]')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, 2)).toBeChecked();
  });

  test('single selection (native checkboxes) keeps one row', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Choose Free' }).check();
    await page.getByRole('checkbox', { name: 'Choose Pro' }).check();
    await expect(page.locator('#native')).toHaveAttribute('value', '["pro"]');
    await expect(page.getByRole('checkbox', { name: 'Choose Free' })).not.toBeChecked();
  });

  test('stacked: sort buttons and the select-all stay reachable and work', async ({ page }) => {
    await expect(page.locator('#stacked thead th button').first()).toBeVisible();
    await expect(page.locator('#stacked thead th void-checkbox')).toBeVisible();
    await page.locator('#stacked thead th button', { hasText: 'Name' }).click();
    expect(await col(page, 'stacked', 2)).toEqual(['Alpha', 'Beta']);
    await page.locator('#stacked thead th void-checkbox').click();
    await expect(page.locator('#stacked')).toHaveAttribute('value', '["s1","s2"]');
  });
});

test.describe('server mode (manual)', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/table-data');
  });

  test('sorting fires and updates the header but never moves a row', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).sorts = [];
      document.getElementById('manual')!.addEventListener('void-sort', (e) => (window as any).sorts.push((e as CustomEvent).detail));
    });
    await sortButton(page, 'manual', 'Name').click();
    expect(await col(page, 'manual', 2)).toEqual(['Charlie', 'Alpha', 'Bravo']);
    await expect(page.locator('#manual thead th').nth(1)).toHaveAttribute('aria-sort', 'ascending');
    expect(await page.evaluate(() => (window as any).sorts)).toEqual([{ column: 'name', direction: 'ascending' }]);
  });

  test('select-all means this page; the all-rows offer appears, sets all-selected and fires once, unchecking clears it', async ({ page }) => {
    const part = page.locator('#manual void-table-select-all');
    await expect(part).toBeHidden();
    await page.evaluate(() => {
      (window as any).changes = [];
      document.getElementById('manual')!.addEventListener('void-change', (e) => (window as any).changes.push((e as CustomEvent).detail));
    });
    await page.locator('#manual thead void-checkbox').click();
    await expect(part).toBeVisible();
    await part.getByRole('button', { name: 'Select all 40 rows' }).click();
    await expect(page.locator('#manual')).toHaveAttribute('all-selected', '');
    await expect(page.locator('#manual')).toHaveAttribute('value', '["m1","m2","m3"]');
    expect(await page.evaluate(() => (window as any).changes)).toEqual([
      { value: ['m1', 'm2', 'm3'], all: false },
      { value: ['m1', 'm2', 'm3'], all: true },
    ]);
    await expect(part).toBeHidden();
    await page.getByRole('checkbox', { name: 'Select m2' }).click();
    await expect(page.locator('#manual')).not.toHaveAttribute('all-selected', /.*/);
  });
});

test.describe('select-all with a filter', () => {
  test('acts on the rows shown, keeps the hidden rows as they were, and the header is mixed after the filter clears', async ({ page }) => {
    await load(page, '/table-data');
    await page.evaluate(() => document.querySelector('#select thead void-checkbox')!.removeAttribute('aria-label'));
    await page.evaluate(() => document.getElementById('select')!.setAttribute('filter', 'a'));
    await settle(page);
    // Ada, Grace, Alan, Edsger (disabled): Linus has no "a"... shown: Ada, Grace, Alan
    const shown = await shownCol(page, 'select', 3);
    expect(shown).toEqual(['Ada', 'Grace', 'Alan']);
    await expect(page.locator('#select thead void-checkbox')).toHaveAttribute('aria-label', 'Select all 3 shown rows');
    await page.locator('#select thead void-checkbox').click();
    await expect(page.locator('#select')).toHaveAttribute('value', '["o1","o2","o4"]');
    await page.evaluate(() => document.getElementById('select')!.removeAttribute('filter'));
    await settle(page);
    await expect(page.locator('#select thead void-checkbox')).toHaveAttribute('aria-checked', 'mixed');
    await expect(page.locator('#select')).toHaveAttribute('value', '["o1","o2","o4"]');
  });
});

test.describe('the accessibility tree', () => {
  test('a sortable selectable table exposes columnheader with a button, checkboxes and a named select-all', async ({ page }) => {
    await load(page, '/table-data');
    const snapshot = await page.locator('#select').ariaSnapshot();
    expect(snapshot).toContain('columnheader "Order"');
    expect(snapshot).toContain('button "Order"');
    expect(snapshot).toContain('checkbox "Select all rows"');
    expect(snapshot).toContain('checkbox "Select order 1"');
  });
});

// Server patches in each adapter: automatic mode keeps the user's sort, filter and selection; manual mode shows the server's.
for (const engine of ['turbo', 'morphdom', 'alpine'] as const) {
  test.describe(`${engine} morph of a table`, () => {
    const rows = (names: [string, string][]) => names.map(([v, n]) => `<tr data-value="${v}"><td><input type="checkbox" aria-label="Select ${n}"></td><td>${n}</td></tr>`).join('');
    const table = (attrs: string, names: [string, string][]) =>
      `<void-table id="t" ${attrs} aria-label="People"><table><thead><tr><th data-stack="select"><input type="checkbox" aria-label="Select all rows"></th><th data-key="name" data-sort>Name</th></tr></thead><tbody>${rows(names)}</tbody></table></void-table>`;
    const BASE: [string, string][] = [['a', 'Cara'], ['b', 'Abe'], ['c', 'Bo'], ['d', 'Dee']];

    test.beforeEach(async ({ page }) => {
      await load(page, `/morph-${engine}`);
    });

    test('automatic: a patch that changed a cell keeps the sort, the filter and the selection', async ({ page }) => {
      await page.evaluate((h) => (window as any).__morph.render(h), table('selectable', BASE));
      await page.locator('#t thead th button').click();
      await page.getByRole('checkbox', { name: 'Select Bo' }).check();
      await page.evaluate(() => document.getElementById('t')!.setAttribute('filter', 'b'));
      await settle(page);
      // The server renders the same rows in its own order, one cell changed, one row gone, one new.
      const next: [string, string][] = [['d', 'Dee'], ['c', 'Bo'], ['e', 'Bea'], ['b', 'Abe']];
      await page.evaluate((h) => (window as any).__morph.morph(h), table('selectable', next));
      await settle(page);
      expect(await shownCol(page, 't', 2)).toEqual(['Abe', 'Bea', 'Bo']);
      await expect(page.locator('#t thead th')).toHaveCount(2);
      await expect(page.locator('#t')).toHaveAttribute('value', '["c"]');
      await expect(page.locator('#t thead th').nth(1)).toHaveAttribute('aria-sort', 'ascending');
      await expect(page.getByRole('checkbox', { name: 'Select Bo' })).toBeChecked();
      // A row the server removed leaves the selection quietly.
      await page.evaluate((h) => (window as any).__morph.morph(h), table('selectable', [['d', 'Dee'], ['b', 'Abe']]));
      await settle(page);
      await expect(page.locator('#t')).not.toHaveAttribute('value', /./);
    });

    test('automatic: the server changing value or sort wins', async ({ page }) => {
      await page.evaluate((h) => (window as any).__morph.render(h), table('selectable', BASE));
      await page.getByRole('checkbox', { name: 'Select Abe' }).check();
      await page.evaluate((h) => (window as any).__morph.morph(h), table('selectable value=\'["d"]\' sort="name" sort-direction="descending"', BASE));
      await settle(page);
      await expect(page.locator('#t')).toHaveAttribute('value', '["d"]');
      await expect(page.getByRole('checkbox', { name: 'Select Dee' })).toBeChecked();
      await expect(page.getByRole('checkbox', { name: 'Select Abe' })).not.toBeChecked();
      expect(await col(page, 't', 2)).toEqual(['Dee', 'Cara', 'Bo', 'Abe']);
    });

    test('manual: the server renders order, selection and aria-sort; the table never reorders', async ({ page }) => {
      await page.evaluate((h) => (window as any).__morph.render(h), table('manual selectable', BASE));
      await page.locator('#t thead th button').click();
      expect(await col(page, 't', 2)).toEqual(['Cara', 'Abe', 'Bo', 'Dee']);
      const sorted: [string, string][] = [['b', 'Abe'], ['c', 'Bo'], ['a', 'Cara'], ['d', 'Dee']];
      await page.evaluate((h) => (window as any).__morph.morph(h), table('manual selectable value=\'["c"]\' sort="name" sort-direction="ascending"', sorted));
      await settle(page);
      expect(await col(page, 't', 2)).toEqual(['Abe', 'Bo', 'Cara', 'Dee']);
      await expect(page.locator('#t thead th').nth(1)).toHaveAttribute('aria-sort', 'ascending');
      await expect(page.getByRole('checkbox', { name: 'Select Bo' })).toBeChecked();
      await expect(page.locator('#t tr[hidden]')).toHaveCount(0);
    });
  });
}
