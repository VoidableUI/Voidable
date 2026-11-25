// SPDX-License-Identifier: MIT
//
// Turbo Drive navigation (with the page cache and the back and forward
// buttons), Turbo Frames and Turbo Streams against the Rails demo's Turbo lab
// (packages/hotwire/demo, /turbo_lab), with the local voidable-hotwire gem and
// the built @voidable/ui and @voidable/ui-hotwire packages.
import { test, expect, settle, ready, formEntries, mark, kept, signature, type Page } from '../shared';

const lab = async (page: Page) => {
  await page.goto('/turbo_lab');
  await page.waitForFunction(() => !!(window as any).Turbo);
  await ready(page);
};

test.describe('Turbo Drive', () => {
  test.beforeEach(async ({ page }) => {
    await lab(page);
    // Navigation by Turbo keeps this document; a full load would drop the marker.
    await page.evaluate(() => ((window as any).__document = 'same'));
  });

  test('a link navigates without a page load and the new page upgrades its components', async ({ page }) => {
    await page.click('#to-two');
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page two');
    await expect(page).toHaveURL(/\/turbo_lab\/two$/);
    expect(await page.evaluate(() => (window as any).__document)).toBe('same');
    await settle(page);
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Server title');
    await expect(page.getByRole('combobox', { name: 'Kind' })).toHaveValue('y');
    await expect(page.getByRole('checkbox', { name: 'Basil' })).toBeChecked();
    // Components of the new page work.
    await page.getByRole('checkbox', { name: 'Olives' }).check();
    await page.getByRole('button', { name: 'Section 1' }).click();
    await expect(page.getByRole('button', { name: 'Section 1' })).toHaveAttribute('aria-expanded', 'true');
  });

  test('back and forward restore each page from the cache with working components', async ({ page }) => {
    const fresh = await signature(page, '#a-controls');
    // Use page one, so a snapshot of it is taken with the user's interaction in it.
    await page.locator('#a-note input').fill('typed before leaving');
    await page.locator('#a-pick select').selectOption('b');
    await page.click('#a-news');
    await page.click('#to-two');
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page two');
    await page.getByRole('checkbox', { name: 'Olives' }).check();

    await page.goBack();
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page one');
    await settle(page);
    expect(await page.evaluate(() => (window as any).__document), 'restored without a page load').toBe('same');
    // The restored page is the same structure as a fresh load: nothing rendered twice.
    expect(await signature(page, '#a-controls')).toEqual(fresh);
    await expect(page.getByRole('textbox', { name: 'Note' })).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Pick' })).toHaveCount(1);
    await expect(page.getByRole('switch', { name: 'Newsletter' })).toHaveCount(1);
    // ... and it works: type, choose, toggle, open the menu and the dialog.
    await page.locator('#a-note input').fill('typed after restore');
    await expect(page.locator('#a-note input')).toHaveValue('typed after restore');
    await page.locator('#a-pick select').selectOption('c');
    expect(await page.evaluate(() => (document.getElementById('a-pick') as any).value)).toBe('c');
    await page.getByRole('switch', { name: 'Newsletter' }).click();
    const on = await page.evaluate(() => (document.getElementById('a-news') as any).checked);
    await page.getByRole('switch', { name: 'Newsletter' }).click();
    expect(await page.evaluate(() => (document.getElementById('a-news') as any).checked)).toBe(!on);
    await page.getByRole('tab', { name: 'Two' }).click();
    await expect(page.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    await page.click('#a-menu-trigger');
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.click('#a-open-dialog');
    await expect(page.getByRole('dialog', { name: 'A dialog' })).toBeVisible();
    await page.locator('#a-dialog [part="close"]').click();
    await expect(page.locator('#a-dialog [part="surface"]')).toBeHidden();

    await page.goForward();
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page two');
    await settle(page);
    expect(await page.evaluate(() => (window as any).__document)).toBe('same');
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Kind' })).toHaveCount(1);
    await expect(page.getByRole('checkbox', { name: 'Olives' })).toHaveCount(1);
    await page.getByRole('checkbox', { name: 'Basil' }).uncheck();
    await expect(page.getByRole('checkbox', { name: 'Basil' })).not.toBeChecked();
  });

  test('five round trips through the cache leave the same structure and no leaked nodes', async ({ page }) => {
    const fresh = await signature(page, '#a-controls');
    const nodes = await page.evaluate(() => document.getElementsByTagName('*').length);
    for (let i = 0; i < 5; i++) {
      await page.click('#to-two');
      await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page two');
      await page.goBack();
      await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page one');
      await settle(page);
    }
    expect(await signature(page, '#a-controls')).toEqual(fresh);
    expect(await page.evaluate(() => document.getElementsByTagName('*').length)).toBe(nodes);
    expect(await page.evaluate(() => (window as any).__document)).toBe('same');
  });

  test('a visit to the same page from the layout keeps working after history navigation', async ({ page }) => {
    await page.click('#to-two');
    await page.click('#to-one');
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page one');
    await page.goBack();
    await page.goBack();
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page one');
    await page.goForward();
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page two');
    await settle(page);
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveCount(1);
  });

  test('a cached preview does not leave a dialog open that the user closed before leaving', async ({ page }) => {
    await page.click('#a-open-dialog');
    await page.locator('#a-dialog [part="close"]').click();
    await page.click('#to-two');
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page two');
    await page.goBack();
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page one');
    await settle(page);
    await expect(page.locator('#a-dialog [part="surface"]')).toBeHidden();
  });

  test('a full page load of the second page (Turbo off for the link) renders the same components', async ({ page }) => {
    await page.click('#to-two-plain');
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page two');
    expect(await page.evaluate(() => (window as any).__document), 'a real page load').toBeUndefined();
    await ready(page);
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Server title');
  });
});

test.describe('Turbo Frames', () => {
  test.beforeEach(async ({ page }) => {
    await lab(page);
  });

  test('a link loads the frame, its components upgrade and the page around it is untouched', async ({ page }) => {
    await page.locator('#a-note input').fill('outside the frame');
    await mark(page, ['a-note', 'a-pick', 'a-menu', 'a-dialog']);
    await page.click('#load-frame');
    await expect(page.locator('#frame-state')).toHaveText('Frame loaded');
    await settle(page);
    await expect(page).toHaveURL(/\/turbo_lab$/);
    await expect(page.locator('#lab-frame').getByRole('textbox', { name: 'Title' })).toHaveCount(1);
    await expect(page.locator('#lab-frame').getByRole('combobox', { name: 'Kind' })).toHaveCount(1);
    await expect(page.locator('#lab-frame').getByRole('switch', { name: 'Urgent' })).toHaveCount(1);
    expect(await kept(page, ['a-note', 'a-pick', 'a-menu', 'a-dialog'])).toEqual(['a-note', 'a-pick', 'a-menu', 'a-dialog']);
    await expect(page.locator('#a-note input')).toHaveValue('outside the frame');
  });

  test('a form in the frame submits its controls to Rails and the frame shows the response', async ({ page }) => {
    await page.click('#load-frame');
    await expect(page.locator('#frame-state')).toHaveText('Frame loaded');
    await settle(page);
    await page.locator('#f-title input').fill('Quarterly');
    await page.locator('#f-kind select').selectOption('y');
    await page.locator('#f-urgent').click();
    await page.locator('#f-seats').getByRole('button', { name: 'Increment' }).click();
    await page.locator('#f-skills .void-multiselect-trigger').click();
    await page.locator('#f-skills').getByRole('option', { name: 'JS' }).click();
    await page.locator('h3').first().click();
    expect((await formEntries(page, '#frame-form')).filter(([k]) => k !== 'authenticity_token')).toEqual([
      ['title', 'Quarterly'],
      ['kind', 'y'],
      ['urgent', 'yes'],
      ['seats', '3'],
      ['skills[]', 'js'],
    ]);
    await page.locator('#f-save').click();
    await expect(page.locator('#frame-state')).toHaveText('Frame loaded and submitted');
    expect(JSON.parse((await page.locator('#frame-received').textContent())!)).toEqual({ title: 'Quarterly', kind: 'y', urgent: 'yes', seats: '3', skills: ['js'] });
    // The frame was replaced with a fresh form, rendered once.
    await settle(page);
    await expect(page.locator('#lab-frame').getByRole('textbox', { name: 'Title' })).toHaveCount(1);
    await expect(page.locator('#lab-frame').getByRole('textbox', { name: 'Title' })).toHaveValue('');
    await expect(page).toHaveURL(/\/turbo_lab$/);
  });

  test('the frame survives a visit away and back through the page cache', async ({ page }) => {
    await page.click('#load-frame');
    await expect(page.locator('#frame-state')).toHaveText('Frame loaded');
    await page.click('#to-two');
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page two');
    await page.goBack();
    await expect(page.locator('#lab-page')).toHaveText('Turbo lab, page one');
    await settle(page);
    await expect(page.locator('#lab-frame').getByRole('textbox', { name: 'Title' })).toHaveCount(1);
    await page.locator('#f-title input').fill('after restore');
    await expect(page.locator('#f-title input')).toHaveValue('after restore');
  });
});

test.describe('Turbo Streams', () => {
  test.beforeEach(async ({ page }) => {
    await lab(page);
  });

  const items = (page: Page) => page.locator('#items > li').evaluateAll((els) => els.map((e) => e.id));
  const stream = async (page: Page, op: string) => {
    const done = page.waitForResponse((r) => r.url().endsWith('/turbo_lab/stream'));
    await page.click(`#stream-${op}`);
    await done;
    await settle(page);
  };

  test('append and prepend add items whose components upgrade and work', async ({ page }) => {
    await stream(page, 'append');
    await stream(page, 'prepend');
    expect(await items(page)).toEqual(['item-5', 'item-1', 'item-2', 'item-3', 'item-4']);
    for (const n of [4, 5]) {
      await expect(page.locator(`#item-select-${n} select`)).toHaveCount(1);
      await expect(page.locator(`#item-check-${n}`)).toBeVisible();
      await page.locator(`#item-check-${n}`).click();
      expect(await page.evaluate((n) => (document.getElementById(`item-check-${n}`) as any).checked, n)).toBe(true);
      await page.locator(`#item-select-${n} select`).selectOption('c');
      expect(await page.evaluate((n) => (document.getElementById(`item-select-${n}`) as any).value, n)).toBe('c');
      await page.locator(`#item-button-${n}`).click();
      expect(await page.evaluate((n) => document.getElementById(`item-button-${n}`)!.dataset.clicked, n)).toBe('1');
    }
  });

  test('before and after insert next to an item', async ({ page }) => {
    await stream(page, 'before');
    await stream(page, 'after');
    expect(await items(page)).toEqual(['item-1', 'item-4', 'item-2', 'item-5', 'item-3']);
    await expect(page.locator('#item-select-4 select')).toHaveCount(1);
    await expect(page.locator('#item-select-5 select')).toHaveCount(1);
  });

  test('replace swaps an item for a fresh one and the server wins over client state', async ({ page }) => {
    await page.locator('#item-check-1').click();
    await page.locator('#item-select-1 select').selectOption('c');
    await mark(page, ['item-2']);
    await stream(page, 'replace');
    await expect(page.locator('#item-check-1')).toContainText('Replaced 1');
    expect(await page.evaluate(() => [(document.getElementById('item-check-1') as any).checked, (document.getElementById('item-select-1') as any).value])).toEqual([false, 'b']);
    await expect(page.locator('#item-select-1 select')).toHaveCount(1);
    expect(await kept(page, ['item-2'])).toEqual(['item-2']);
  });

  test('update changes the contents of an item and leaves its siblings alone', async ({ page }) => {
    await page.locator('#item-check-3').click();
    await stream(page, 'update');
    await expect(page.locator('#item-check-2')).toContainText('Updated 2');
    await expect(page.locator('#item-select-2 select')).toHaveCount(1);
    await expect(page.locator('#item-check-3')).toContainText('Item 3');
    expect(await page.evaluate(() => (document.getElementById('item-check-3') as any).checked)).toBe(true);
    await page.locator('#item-check-2').click();
    expect(await page.evaluate(() => (document.getElementById('item-check-2') as any).checked)).toBe(true);
  });

  test('remove takes an item out, with its overlay content, and the rest still works', async ({ page }) => {
    await stream(page, 'remove');
    expect(await items(page)).toEqual(['item-1', 'item-2']);
    await expect(page.locator('#item-select-3')).toHaveCount(0);
    await page.locator('#item-select-1 select').selectOption('a');
    expect(await page.evaluate(() => (document.getElementById('item-select-1') as any).value)).toBe('a');
  });

  test('a long run of stream actions keeps every item rendered once', async ({ page }) => {
    for (const op of ['append', 'prepend', 'update', 'replace', 'after', 'before', 'append']) await stream(page, op);
    const ids = await items(page);
    expect(new Set(ids).size, 'no duplicate ids').toBe(ids.length);
    for (const id of ids) {
      const n = id.replace('item-', '');
      await expect(page.locator(`#item-select-${n} select`), `item ${n} select`).toHaveCount(1);
      await expect(page.locator(`#item-check-${n}`), `item ${n} checkbox`).toHaveCount(1);
    }
  });
});
