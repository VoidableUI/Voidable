// SPDX-License-Identifier: MIT
//
// What every server-backed spec needs: a test that fails on page and console
// errors, and a few helpers that wait on components rather than on time.
// Imported by server/<app>/*.spec.ts.
import { test as base, expect, type Page } from '@playwright/test';

export { expect };
export { expectedFailure } from '../helpers/test';
export type { Page };

type Fixtures = {
  /** Page errors and console errors seen so far in this test. */
  errors: string[];
  /** Console errors a test expects (matched by substring) and does not want to fail on. */
  allowErrors: string[];
};

export const test = base.extend<Fixtures>({
  // A new array for every test: a test that pushes to it must not change the next one.
  allowErrors: async ({}, use) => use([]),
  errors: [
    async ({ page, allowErrors }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await use(errors);
      const unexpected = errors.filter((e) => !allowErrors.some((a) => e.includes(a)));
      expect(unexpected, 'page and console errors').toEqual([]);
    },
    { auto: true },
  ],
});

/** Waits until every Voidable element has finished updating, charts have drawn in, and two frames have passed. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    const els = [...document.querySelectorAll('*')].filter((e) => e.tagName.startsWith('VOID-')) as any[];
    await Promise.all(els.map((e) => e.updateComplete));
    for (let i = 0; i < 120 && els.some((e) => e._phase === 'pre' || e._phase === 'animating'); i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

/** Waits for the custom elements the page uses to be defined and updated. */
export async function ready(page: Page) {
  await page.waitForFunction(() => !!customElements.get('void-select') && !!customElements.get('void-input'));
  await settle(page);
}

/** What FormData the browser builds from a form, as [name, value] pairs. */
export const formEntries = (page: Page, selector: string) =>
  page.evaluate(
    (sel) => [...new FormData(document.querySelector(sel) as HTMLFormElement)].map(([k, v]) => [k, v instanceof File ? `File(${v.name},${v.size})` : String(v)] as [string, string]),
    selector,
  );

/**
 * Counts and tags what the page's components rendered, so a later check can tell
 * whether an update kept a node (`kept`) or duplicated what a component renders.
 */
export const mark = (page: Page, ids: string[]) =>
  page.evaluate((ids) => ids.forEach((id) => ((document.getElementById(id) as any).__mark = id)), ids);
export const kept = (page: Page, ids: string[]) =>
  page.evaluate((ids) => ids.filter((id) => (document.getElementById(id) as any)?.__mark === id), ids);

/**
 * A signature of the void-* elements under `selector`: tag, child count and visible text, in document order.
 * Two renders of the same markup (a fresh load, a restore from the page cache) give the same list.
 */
export const signature = (page: Page, selector: string) =>
  page.evaluate(
    (sel) =>
      [...document.querySelector(sel)!.querySelectorAll('*')]
        .filter((e) => e.tagName.startsWith('VOID-'))
        .map((e) => `${e.tagName.toLowerCase()}#${e.id} ${e.children.length} "${(e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)}"`),
    selector,
  );

/**
 * Adds a tag with real typing. A server round trip can reset text typed into a field while its
 * patch lands (the liveview-typing-focus-lost defect), so the tag is typed again until its chip
 * renders; Enter is never pressed when the chip is already there, so it is added once.
 */
export async function addTag(page: Page, tag: string): Promise<void> {
  const chip = page.locator('#i-tags .void-tags-input-tag-text', { hasText: new RegExp(`^${tag}$`) });
  await expect(async () => {
    if (await chip.count()) return;
    await page.locator('#i-tags input').click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(tag);
    await expect(page.locator('#i-tags input')).toHaveValue(tag, { timeout: 1000 });
    await page.keyboard.press('Enter');
    await expect(chip).toHaveCount(1, { timeout: 2000 });
  }).toPass({ timeout: 20_000 });
}

/**
 * The whole sequence a user would walk through on the lab form that every app carries
 * (ids i-name, i-email, i-bio, i-country, i-remember, i-plan, i-vol, i-news, i-seats, i-date,
 * i-tags, i-fw and i-skills): fills every control with real pointer and keyboard input.
 * Returns the date picked, as YYYY-MM-DD.
 */
export async function fillLabForm(page: Page, opts: { skip?: string[] } = {}): Promise<string> {
  const skip = new Set(opts.skip ?? []);
  const step = async (name: string, f: () => Promise<void>) => { if (!skip.has(name)) await f(); };
  await step('name', async () => { await page.locator('#i-name input').click(); await page.keyboard.type('Ada Lovelace'); });
  await step('email', async () => { await page.locator('#i-email input').click(); await page.keyboard.type('ada@example.com'); });
  await step('bio', async () => { await page.locator('#i-bio textarea').click(); await page.keyboard.type('Line one'); });
  await step('country', async () => { await page.locator('#i-country select').selectOption('au'); });
  await step('remember', async () => { await page.locator('#i-remember').click(); });
  await step('plan', async () => { await page.locator('#i-plan void-radio[value=pro]').click(); });
  await step('volume', async () => {
    await page.locator('#i-vol input').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
  });
  await step('news', async () => { await page.locator('#i-news').click(); });
  await step('seats', async () => { await page.locator('#i-seats').getByRole('button', { name: 'Increment' }).click(); });
  let picked = '';
  await step('date', async () => {
    await page.locator('#i-date input').click();
    const day = page.locator('#i-date [role=grid] button:not([disabled])').nth(9);
    const label = (await day.getAttribute('aria-label'))!;
    await day.click();
    const d = new Date(label.replace(/^\w+, /, ''));
    picked = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await step('tags', async () => {
    await expect(page.locator('#i-date [role=grid]')).toBeHidden();
    await addTag(page, 'alpha');
    await addTag(page, 'beta');
  });
  await step('framework', async () => {
    await page.locator('#i-fw input').click();
    await page.locator('#i-fw').getByRole('option', { name: 'Vue' }).click();
  });
  await step('skills', async () => {
    await page.locator('#i-skills .void-multiselect-trigger').click();
    await page.locator('#i-skills').getByRole('option', { name: 'JS' }).click();
    await page.locator('#i-skills').getByRole('option', { name: 'HTML' }).click();
    await page.locator('h1').click();
  });
  return picked;
}
