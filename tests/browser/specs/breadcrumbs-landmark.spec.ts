// SPDX-License-Identifier: MIT
//
// Breadcrumbs landmark (#123): the trail is a navigation landmark unless it opts out with landmark="none" or
// already sits in a navigation, in which case it is a named group. Read through the browser's accessibility
// queries, in every engine.
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

const trail = (attrs = '') => `
  <void-breadcrumbs ${attrs}>
    <void-breadcrumbs-list>
      <void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item>
      <void-breadcrumbs-item><a href="/docs">Docs</a></void-breadcrumbs-item>
      <void-breadcrumbs-item aria-current="page">Page</void-breadcrumbs-item>
    </void-breadcrumbs-list>
  </void-breadcrumbs>`;

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

test('is a navigation landmark named Breadcrumb by default', async ({ page }) => {
  await mount(page, trail());
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(1);
  await expect(page.getByRole('listitem')).toHaveCount(3);
});

test('landmark="none" is a named group with the same list and no landmark', async ({ page }) => {
  await mount(page, `<nav aria-label="Main"><a href="#">Home</a></nav>${trail('landmark="none"')}`);
  await expect(page.getByRole('navigation')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  const group = page.getByRole('group', { name: 'Breadcrumb' });
  await expect(group).toBeVisible();
  await expect(group.getByRole('listitem')).toHaveCount(3);
  await expect(group.getByRole('link', { name: 'Docs' })).toBeVisible();
});

test('inside a nav it adds no landmark of its own', async ({ page }) => {
  await mount(page, `<nav aria-label="Site">${trail()}</nav>`);
  await expect(page.getByRole('navigation')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Breadcrumb' })).toBeVisible();
});

test('inside an element with role="navigation" it adds no landmark of its own', async ({ page }) => {
  await mount(page, `<div role="navigation" aria-label="Site"><div>${trail()}</div></div>`);
  await expect(page.getByRole('navigation')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Breadcrumb' })).toBeVisible();
});
