// SPDX-License-Identifier: MIT
//
// Landmarks (#118): the stepper only shows progress, so it is a list with aria-current="step", not a navigation
// landmark; the pagination is a navigation landmark unless it opts out with landmark="none" or already sits in
// a navigation. Read through the browser's accessibility queries, in every engine.
import { test, expect, load, type Page } from '../helpers/test';

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    document.getElementById('case')?.remove();
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
  }, html);
}

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

test.describe('stepper', () => {
  test('is a named list of steps, not a navigation landmark', async ({ page }) => {
    await mount(page, `<void-stepper steps="Account, Plan, Payment" value="1"></void-stepper>`);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    const list = page.getByRole('list', { name: 'Progress' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expect(list.getByRole('listitem').nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(list.locator('[aria-current="step"]')).toHaveCount(1);
  });

  test('leaves a page with one navigation region at one', async ({ page }) => {
    await mount(page, `<nav aria-label="Main"><a href="#">Home</a></nav><void-stepper steps="A,B" value="0"></void-stepper>`);
    await expect(page.getByRole('navigation')).toHaveCount(1);
  });
});

test.describe('pagination', () => {
  test('is a navigation landmark named Pagination by default, in both modes', async ({ page }) => {
    await mount(page, `<void-pagination total="9" value="3"></void-pagination>`);
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
    await mount(page, `<void-pagination total="9" value="3" param="page"></void-pagination>`);
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toHaveCount(1);
    await expect(page.getByRole('link', { name: '3' })).toHaveAttribute('aria-current', 'page');
  });

  test('landmark="none" is a named group with the same buttons and no landmark', async ({ page }) => {
    await mount(page, `<void-pagination total="9" value="3" landmark="none"></void-pagination>`);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    const group = page.getByRole('group', { name: 'Pagination' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('button', { name: 'Next page' })).toBeEnabled();
    await group.getByRole('button', { name: '4' }).click();
    await expect(group.getByRole('button', { name: '4' })).toHaveAttribute('aria-current', 'page');
  });

  test('inside a nav it adds no landmark of its own', async ({ page }) => {
    await mount(page, `<nav aria-label="Results"><void-pagination total="9" value="3"></void-pagination></nav>`);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Results' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Pagination' })).toBeVisible();
  });

  test('inside an element with role="navigation" it adds no landmark of its own', async ({ page }) => {
    await mount(page, `<div role="navigation" aria-label="Results"><void-pagination total="9" value="3" param="page"></void-pagination></div>`);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(page.getByRole('group', { name: 'Pagination' })).toBeVisible();
  });
});
