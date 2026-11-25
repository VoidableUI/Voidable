// SPDX-License-Identifier: MIT
//
// The same markup must give the same page whether @voidable/ui is defined
// after the markup is parsed (a module or deferred script, the default in
// these tests) or before it (a classic <script> in <head>, as a CDN snippet
// does). In the second case each element is upgraded the moment its start
// tag is parsed, before its children exist.
import { test, expect, expectedFailure, load } from '../helpers/test';

for (const page of ['widgets', 'form', 'overlays']) {
  test(`${page}: the accessibility tree does not depend on when the components are defined`, async ({ page: tab }) => {
    expectedFailure('untracked:early-define', 'defined before parsing, void-field labels nothing and tooltip describes its own bubble');
    await load(tab, `/${page}?load=defer`);
    const deferred = await tab.locator('main').ariaSnapshot();
    await load(tab, `/${page}?load=sync`);
    const early = await tab.locator('main').ariaSnapshot();
    expect(early).toBe(deferred);
  });
}

test('void-field labels its control when defined before parsing', async ({ page }) => {
  expectedFailure('untracked:early-define', 'the field looks for its control on connect, before the control has been parsed');
  await load(page, '/widgets?load=sync');
  await expect(page.getByRole('slider', { name: 'Volume' })).toHaveCount(1, { timeout: 1000 });
  await expect(page.getByRole('combobox', { name: 'Country' })).toHaveCount(1, { timeout: 1000 });
});

test('void-tooltip describes its trigger when defined before parsing', async ({ page }) => {
  expectedFailure('untracked:early-define', 'the bubble is rendered before the trigger is parsed, so aria-describedby lands on the bubble');
  await load(page, '/overlays?load=sync');
  await expect(page.locator('#tt-t')).toHaveAccessibleDescription('Tooltip text', { timeout: 1000 });
});

test('void-field labels its control when the script is deferred', async ({ page }) => {
  await load(page, '/widgets');
  await expect(page.getByRole('slider', { name: 'Volume' })).toHaveCount(1);
  await expect(page.getByRole('combobox', { name: 'Country' })).toHaveCount(1);
});
