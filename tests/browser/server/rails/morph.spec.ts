// SPDX-License-Identifier: MIT
//
// Turbo 8 morphs against the real Rails demo (packages/hotwire/demo, the
// morph lab page), with the local voidable-hotwire gem and the built
// @voidable/ui and @voidable/ui-hotwire packages. Every test gets a new
// browser context and so a new Rails session with the default lab state.
import { test as base, expect, type Page } from '@playwright/test';
import { expectedFailure } from '../../helpers/test';

const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // CI must never depend on a published or CDN-hosted build of this library: no request for this library's packages (@voidable/*) leaves the local app. Third-party assets such as icon fonts are not ours to forbid.
      page.on('request', (r) => {
        const u = new URL(r.url());
        if (/^https?:$/.test(u.protocol) && u.hostname !== '127.0.0.1' && u.hostname !== 'localhost' && /voidable/i.test(r.url())) errors.push(`request for Voidable from a remote host: ${r.url()}`);
      });
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await use(errors);
    },
    { auto: true },
  ],
});

/** Waits until every Voidable element has finished updating, plus two frames. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const els = [...document.querySelectorAll('*')].filter((e) => e.tagName.startsWith('VOID-')) as any[];
    await Promise.all(els.map((e) => e.updateComplete));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

async function open(page: Page, search = false) {
  // Stored in the session; the page itself must sit at the URL the server
  // redirects to, or Turbo treats the refresh as a navigation and does not morph.
  await page.request.get(`/morph_lab?search=${search ? 1 : 0}`);
  await page.goto('/morph_lab');
  await page.waitForFunction(() => !!customElements.get('void-select') && !!(window as any).Turbo);
  await settle(page);
}

/** Clicks a server button and waits for the version line to read `version`. */
async function server(page: Page, button: string, version?: number) {
  const before = await page.locator('#lab-version').textContent();
  await page.click(button);
  if (version !== undefined) await expect(page.locator('#lab-version')).toHaveText(`Server version ${version}`);
  else await page.waitForResponse((r) => r.url().endsWith('/morph_lab') && r.request().method() === 'GET');
  await settle(page);
  return before;
}

/** Tags each element so a later check can tell whether a morph kept the node. */
const mark = (page: Page, ids: string[]) =>
  page.evaluate((ids) => ids.forEach((id) => ((document.getElementById(id) as any).__mark = id)), ids);
const kept = (page: Page, ids: string[]) =>
  page.evaluate((ids) => ids.filter((id) => (document.getElementById(id) as any)?.__mark === id), ids);

const IDS = ['lab-card', 'lab-select', 'lab-group', 'lab-olives', 'lab-tabs', 'lab-menu', 'lab-dialog', 'lab-notes', 'lab-news'];

/** Counts of the nodes the components generate, to catch duplicates after morphs. */
const generated = (page: Page) =>
  page.evaluate(() => ({
    all: document.getElementsByTagName('*').length,
    selects: document.querySelectorAll('#lab-select select').length,
    options: document.querySelectorAll('#lab-select option').length,
    tabs: document.querySelectorAll('#lab-tabs [role="tab"]').length,
    menuPanels: document.querySelectorAll('#lab-menu [role="menu"]').length,
    checkboxes: document.querySelectorAll('#lab-group input[type="checkbox"]').length,
  }));

test.beforeEach(async ({ page }) => open(page));

test.afterEach(async ({ errors }) => {
  expect(errors, 'page and console errors').toEqual([]);
});

// The demo layout's header search (void-action-input) must survive a page-refresh morph (it used to
// throw from Lit, which lost the part markers it rendered). The other tests leave it off the page so a
// regression here does not mask theirs.
test('a refresh morph leaves the layout header search working', async ({ page, errors }) => {
  await open(page, true);
  await page.click('#lab-bump');
  await expect(page.locator('#lab-version')).toHaveText('Server version 2');
  const rejected = await page.evaluate(async () => {
    const els = [...document.querySelectorAll('*')].filter((e) => e.tagName.startsWith('VOID-')) as any[];
    const r = await Promise.allSettled(els.map((e) => e.updateComplete));
    return els.filter((_, i) => r[i].status === 'rejected').map((e) => e.tagName.toLowerCase());
  });
  expect(rejected).toEqual([]);
  expect(errors).toEqual([]);
});

test('the demo runs the local gem and built packages', async ({ page }) => {
  const src = await page.evaluate(() => JSON.parse(document.querySelector('script[type="importmap"]')!.textContent!).imports);
  expect(src['@voidable/ui']).toBe('/voidable-local/ui.js');
  expect(src['@voidable/ui-hotwire']).toBe('/voidable-local/ui-hotwire.js');
  await expect(page.locator('meta[name="turbo-refresh-method"]')).toHaveAttribute('content', 'morph');
  await expect(page.getByRole('combobox', { name: 'Pick' })).toHaveValue('b');
});

/** Refreshes the page from the server (as a broadcast refresh would) and waits for the morph. */
async function refresh(page: Page) {
  const done = page.waitForResponse((r) => r.url().endsWith('/morph_lab') && r.request().method() === 'GET');
  await page.evaluate(() => (window as any).Turbo.session.refresh(location.href));
  await done;
  await settle(page);
}

test('a page-refresh morph keeps every component node and updates server text', async ({ page }) => {
  await mark(page, IDS);
  await server(page, '#lab-bump', 2);
  expect(await kept(page, IDS)).toEqual(IDS);
  await expect(page.locator('#lab-select option')).toHaveText(['Option a v2', 'Option b v2', 'Option c v2']);
  await expect(page.locator('#lab-menu-trigger')).toHaveText('Actions v2');
  await expect(page.locator('#lab-card')).toHaveAttribute('heading', 'Panel 2');
});

test('controls keep their rendered DOM, role and label through a refresh morph', async ({ page }) => {
  await server(page, '#lab-bump', 2);
  await expect(page.getByRole('switch', { name: 'Newsletter' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Notes' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Pick' })).toHaveValue('b');
  // The lab's tabs have no value, so no panel shows until a tab is chosen.
  await expect(page.locator('#lab-tabs [role="tabpanel"]:visible')).toHaveCount(0);
  await page.getByRole('tab', { name: 'One' }).click();
  await expect(page.locator('#lab-tabs [role="tabpanel"]:visible')).toContainText('Panel one v2');
});

test('ten refresh morphs in a row leave the generated structure as on a fresh load', async ({ page }) => {
  const fresh = await generated(page);
  for (let v = 2; v <= 11; v++) await server(page, '#lab-bump', v);
  expect(await generated(page)).toEqual(fresh);
});

test('the server-rendered structure is the same after a reload', async ({ page }) => {
  const fresh = await generated(page);
  for (let v = 2; v <= 4; v++) await server(page, '#lab-bump', v);
  await page.reload();
  await settle(page);
  expect(await generated(page)).toEqual(fresh);
});

test('client state survives a refresh morph: checked box and selected tab', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Olives' }).check();
  await page.getByRole('tab', { name: 'Two' }).click();
  await server(page, '#lab-bump', 2);
  await expect(page.getByRole('checkbox', { name: 'Olives' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Basil' })).toBeChecked();
  await expect(page.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
});

test('client state survives a refresh morph: a toggled switch', async ({ page }) => {
  await page.getByRole('switch', { name: 'Newsletter' }).click();
  await server(page, '#lab-bump', 2);
  await expect(page.getByRole('switch', { name: 'Newsletter' })).toBeChecked();
});

const panel = (page: Page) => page.locator('#lab-dialog [part="surface"]');

test('a dialog the user opened stays open through a refresh morph', async ({ page }) => {
  await page.click('#lab-open-dialog');
  await expect(page.getByRole('dialog')).toBeVisible();
  // The dialog is modal, so the change arrives as a server refresh, not a click.
  await refresh(page);
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toContainText('Dialog body v1');
});

test('an open dialog keeps its dialog role and name through a refresh morph', async ({ page }) => {
  await page.click('#lab-open-dialog');
  await refresh(page);
  await expect(page.getByRole('dialog', { name: 'Dialog v1' })).toBeVisible();
  // The role and the modal state belong to the native <dialog> inside the host, not to the host.
  await expect(page.locator('#lab-dialog')).not.toHaveAttribute('role', /.*/);
  expect(await panel(page).evaluate((el) => el.matches(':modal'))).toBe(true);
});

test('server changes win: selected value, new options, and a dialog the server opens and closes', async ({ page }) => {
  expectedFailure('untracked:turbo-server-open-dialog-ignored', 'a refresh morph whose HTML adds `open` to a closed void-dialog leaves it closed: the attribute and the property stay false, though the response contains <void-dialog open>');
  // The native select inside void-select, located directly: its field label is checked in the controls test above.
  const select = page.locator('#lab-select select');
  await server(page, '#lab-select-c');
  await expect(select).toHaveValue('c');
  await server(page, '#lab-add-d', 2);
  await expect(page.locator('#lab-select option')).toHaveText(['Option a v2', 'Option b v2', 'Option c v2', 'Option d v2']);
  await select.selectOption('d');
  await expect(select).toHaveValue('d');
  await server(page, '#lab-open');
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toContainText('Dialog body v2');
  await page.evaluate(() =>
    fetch('/morph_lab', {
      method: 'PATCH',
      headers: { 'X-CSRF-Token': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement).content, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'dialog=closed',
      redirect: 'manual',
    }),
  );
  await refresh(page);
  await expect(panel(page)).toBeHidden();
});

test('a form of Voidable controls submits through Turbo and the morph shows the saved value', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Notes' }).fill('hello from the browser');
  await mark(page, ['lab-notes']);
  const done = page.waitForResponse((r) => r.url().endsWith('/morph_lab') && r.request().method() === 'GET');
  await page.click('#lab-save');
  await done;
  await settle(page);
  expect(await kept(page, ['lab-notes'])).toEqual(['lab-notes']);
  await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue('hello from the browser');
});

test('a form of Voidable controls submits its values to Rails through Turbo', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Notes' }).fill('hello from the browser');
  const req = page.waitForRequest((r) => r.url().endsWith('/morph_lab') && r.method() === 'POST');
  await page.click('#lab-save');
  const body = new URLSearchParams((await req).postData() ?? '');
  expect(body.get('_method')).toBe('patch');
  expect(body.get('notes')).toBe('hello from the browser');
  await page.waitForResponse((r) => r.url().endsWith('/morph_lab') && r.request().method() === 'GET');
  await page.reload();
  await settle(page);
  await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue('hello from the browser');
});

test('a Turbo Stream with method morph updates the panel in place, repeatedly', async ({ page }) => {
  await mark(page, IDS.slice(0, 7));
  await page.getByRole('checkbox', { name: 'Olives' }).check();
  await settle(page);
  // A checked box renders its check mark (two nodes), so the baseline is taken once it is checked.
  const fresh = await generated(page);
  for (let v = 2; v <= 4; v++) {
    const done = page.waitForResponse((r) => r.url().endsWith('/morph_lab/stream'));
    await page.click('#lab-stream');
    await done;
    await expect(page.locator('#lab-menu-trigger')).toHaveText(`Actions v${v}`);
    await settle(page);
  }
  expect(await kept(page, IDS.slice(0, 7))).toEqual(IDS.slice(0, 7));
  await expect(page.locator('#lab-select option').first()).toHaveText('Option a v4');
  await expect(page.getByRole('checkbox', { name: 'Olives' })).toBeChecked();
  expect(await generated(page)).toEqual(fresh);
});

test('the dropdown menu opens and is operable after morphs', async ({ page }) => {
  await server(page, '#lab-bump', 2);
  await page.click('#lab-stream');
  await expect(page.locator('#lab-menu-trigger')).toHaveText('Actions v3');
  await settle(page);
  await page.click('#lab-menu-trigger');
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeHidden();
});
