// SPDX-License-Identifier: MIT
//
// Phoenix LiveView against the real demo app (packages/liveview/demo, /lab and
// /lab/two) with the built @voidable/ui and @voidable/ui-liveview packages and
// the live_voidable Hex package from this repository. Every test gets a new
// browser context and so a new LiveView.
import { test, expect, expectedFailure, settle, ready, fillLabForm, formEntries, mark, kept, type Page } from '../shared';

/** Opens the lab and waits for the LiveView to connect (the dead render has upgraded by then too). */
async function lab(page: Page, path = '/lab') {
  await page.goto(path);
  await page.waitForSelector('.phx-connected');
  await ready(page);
}

const text = async (page: Page, sel: string) => ((await page.locator(sel).textContent()) ?? '').trim();
const json = async (page: Page, sel: string) => JSON.parse(await text(page, sel));
const events = (page: Page) => json(page, '#events') as Promise<any[]>;
const prop = (page: Page, id: string, name: string) => page.evaluate(([id, name]) => (document.getElementById(id) as any)[name], [id, name]);

/** Waits for the server's tick counter to move past `n`, which proves patches are arriving. */
const ticksAbove = (page: Page, n: number) => expect.poll(async () => Number((await text(page, '#ticks')).replace('Ticks ', ''))).toBeGreaterThan(n);

test.describe('render', () => {
  test('the page renders and components upgrade, in the dead render and after the socket connects', async ({ page }) => {
    await page.goto('/lab');
    await ready(page);
    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Country' })).toHaveCount(1);
    await expect(page.getByRole('switch', { name: 'Newsletter' })).toHaveCount(1);
    await page.waitForSelector('.phx-connected');
    await settle(page);
    // Connecting must not render anything a second time.
    for (const [role, name] of [['textbox', 'Full name'], ['combobox', 'Country'], ['switch', 'Newsletter'], ['checkbox', 'Remember me']] as const) {
      await expect(page.getByRole(role, { name }), `${role} ${name}`).toHaveCount(1);
    }
    expect(await page.evaluate(() => document.querySelectorAll('#i-country select').length)).toBe(1);
    expect(await page.evaluate(() => document.querySelectorAll('#i-name input').length)).toBe(1);
  });
});

test.describe('form', () => {
  test.beforeEach(async ({ page }) => lab(page));

  test('every control submits and the server sees the values', async ({ page }) => {
    const day = await fillLabForm(page);
    await settle(page);
    await page.locator('#save').click();
    await expect(page.locator('#saved')).not.toHaveText('null');
    const { volume, ...saved } = await json(page, '#saved');
    expect(saved).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      bio: 'Line one',
      country: 'au',
      remember_me: '1',
      plan: 'pro',
      newsletter: 'yes',
      seats: '3',
      start: day,
      tags: ['alpha', 'beta'],
      framework: 'vue',
      skills: ['js', 'html'],
    });
  });

  test('the slider value the user set is the value the server receives', async ({ page }) => {
    expectedFailure('untracked:liveview-slider-reverts', 'the range input is re-created at 50 after the first server patch, so the server saves 50 although the user chose 60');
    await fillLabForm(page);
    await settle(page);
    await page.locator('#save').click();
    await expect(page.locator('#saved')).not.toHaveText('null');
    expect((await json(page, '#saved')).volume).toBe('60');
  });

  test('the form data the browser builds matches what the server received', async ({ page }) => {
    await fillLabForm(page);
    await settle(page);
    const entries = await formEntries(page, '#f');
    await page.locator('#save').click();
    await expect(page.locator('#saved')).not.toHaveText('null');
    const saved = await json(page, '#saved');
    for (const [k, v] of entries) {
      const key = k.match(/^user\[(\w+)\]/)![1];
      expect([].concat(saved[key] ?? []), `field ${k}`).toContain(v);
    }
  });
});

test.describe('server updates while the user is mid-interaction', () => {
  test.beforeEach(async ({ page }) => lab(page));

  test('typed text and focus survive a timer that patches text inside components every 100 ms', async ({ page }) => {
    await page.click('#timer-on');
    const input = page.locator('#i-name input');
    await input.click();
    const start = Number((await text(page, '#ticks')).replace('Ticks ', ''));
    // fill(): the typing-speed race has its own test (liveview-typing-focus-lost).
    await input.fill('typing while patches arrive');
    await ticksAbove(page, start + 5);
    await expect(input).toHaveValue('typing while patches arrive');
    expect(await page.evaluate(() => document.activeElement === document.querySelector('#i-name input'))).toBe(true);
    await page.click('#timer-off');
    await expect.poll(() => json(page, '#current').then((c) => c.name)).toBe('typing while patches arrive');
  });

  test('typing in a textarea and an email field is not disturbed by patches either', async ({ page }) => {
    await page.click('#timer-on');
    await page.locator('#i-bio textarea').fill('line one\nline two');
    await expect(page.locator('#i-bio textarea')).toHaveValue('line one\nline two');
    await page.locator('#i-email input').fill('a@b.co');
    await expect(page.locator('#i-email input')).toHaveValue('a@b.co');
    await page.click('#timer-off');
  });

  test('typing fast into a field whose form echoes every change keeps focus and every key', async ({ page }) => {
    expectedFailure('untracked:liveview-typing-focus-lost', 'at 30 ms between keys the email input is replaced mid-typing and focus moves to the body');
    const input = page.locator('#i-email input');
    await input.click();
    await page.keyboard.type('line one two three four five six', { delay: 30 });
    await expect(input).toHaveValue('line one two three four five six');
  });

  test('a select the user changed keeps its choice while option text changes under it', async ({ page }) => {
    await page.locator('#i-country select').selectOption('au');
    await page.click('#timer-on');
    const start = Number((await text(page, '#ticks')).replace('Ticks ', ''));
    await ticksAbove(page, start + 3);
    await page.click('#timer-off');
    await settle(page);
    expect(await prop(page, 'i-country', 'value')).toBe('au');
    await expect(page.locator('#i-country option[value=nz]')).toContainText(/New Zealand \([1-9]/);
    await expect(page.locator('#i-country select')).toHaveCount(1);
  });

  test('checked, selected and chosen client state survive repeated patches', async ({ page }) => {
    await page.locator('#i-remember').click();
    await page.locator('#i-plan void-radio[value=pro]').click();
    await page.locator('#i-news').click();
    await page.locator('#i-tags input').click();
    await page.keyboard.type('alpha');
    await page.keyboard.press('Enter');
    await page.click('#timer-on');
    const start = Number((await text(page, '#ticks')).replace('Ticks ', ''));
    await ticksAbove(page, start + 5);
    await page.click('#timer-off');
    await settle(page);
    expect(await page.evaluate(() => [(document.getElementById('i-remember') as any).checked, (document.getElementById('i-plan') as any).value, (document.getElementById('i-news') as any).checked])).toEqual([true, 'pro', true]);
    await expect(page.locator('#i-tags')).toContainText('alpha');
  });

  test('an open dropdown menu and the focused item stay open through patches', async ({ page }) => {
    await page.click('#timer-on');
    await page.click('#dd-trigger');
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    const start = Number((await text(page, '#ticks')).replace('Ticks ', ''));
    await ticksAbove(page, start + 5);
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    await expect(page.locator('#dd-trigger')).toContainText('Actions ');
  });

  test('a selected tab stays selected and its panel text updates', async ({ page }) => {
    expectedFailure('untracked:liveview-tabs-wiped', 'the first patch blanks the tab labels and the panels');
    await page.getByRole('tab', { name: 'Two' }).click();
    await page.click('#timer-on');
    const start = Number((await text(page, '#ticks')).replace('Ticks ', ''));
    await ticksAbove(page, start + 3);
    await page.click('#timer-off');
    await expect(page.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tabs [role=tabpanel]:visible')).toContainText('Panel two, ticks');
    await expect(page.locator('#tabs').getByRole('tab')).toHaveCount(2);
  });

  test('nodes are kept: no component is replaced by a patch', async ({ page }) => {
    const ids = ['i-name', 'i-country', 'i-plan', 'i-vol', 'i-fw', 'i-skills', 'dd', 'tabs', 'dlg'];
    await mark(page, ids);
    await page.click('#bump');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await page.click('#timer-on');
    const start = Number((await text(page, '#ticks')).replace('Ticks ', ''));
    await ticksAbove(page, start + 3);
    await page.click('#timer-off');
    await settle(page);
    expect(await kept(page, ids)).toEqual(ids);
    expect(await page.evaluate(() => document.querySelectorAll('#i-country select').length)).toBe(1);
  });

  test('server-changed values win over what the user did', async ({ page }) => {
    await page.locator('#i-name input').fill('user typed');
    await page.locator('#i-country select').selectOption('au');
    await page.locator('#i-plan void-radio[value=pro]').click();
    await page.locator('#i-remember').click(); // client: checked; server will set it checked too
    await page.locator('#i-remember').click(); // client: unchecked
    await page.click('#server-sets');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await settle(page);
    await expect(page.locator('#i-name input')).toHaveValue('Set by the server');
    expect(await page.evaluate(() => [(document.getElementById('i-country') as any).value, (document.getElementById('i-plan') as any).value, (document.getElementById('i-remember') as any).checked, (document.getElementById('i-news') as any).checked, (document.getElementById('i-vol') as any).value])).toEqual(['fj', 'team', true, true, 80]);
  });

  test('the server selecting a tab wins over the user selection', async ({ page }) => {
    expectedFailure('untracked:liveview-tabs-wiped', 'changing the value patches void-tabs and blanks its tabs and panels');
    await page.getByRole('tab', { name: 'One' }).click();
    await page.click('#server-tab');
    await expect(page.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('overlays opened by the server or the user', () => {
  test.beforeEach(async ({ page }) => lab(page));

  const panel = (page: Page) => page.locator('#dlg .void-dialog-panel');

  test('the server opens a dialog and the user closes it, and the server hears about it', async ({ page }) => {
    await page.click('#open-dlg');
    await expect(panel(page)).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Server dialog' })).toBeVisible();
    await expect(page.locator('#dialog-state')).toContainText('open');
    await page.locator('#dlg .void-dialog-close').click();
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#dialog-state')).toContainText('closed');
    expect((await events(page)).filter((e) => e.event === 'void-close' && e.id === 'dlg')).toHaveLength(1);
    // The server can open it again: its state followed the user's.
    await page.click('#open-dlg');
    await expect(panel(page)).toBeVisible();
  });

  test('the user opens a dialog (through the server) and the server closes it later', async ({ page }) => {
    await page.click('#open-dlg');
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press('Escape');
    // Open it again and let the server close it without the user touching anything.
    await page.click('#open-dlg-later');
    await expect(panel(page)).toBeVisible();
    await page.click('#close-dlg-later', { force: true }).catch(() => {});
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#dialog-state')).toContainText('closed');
  });

  test('the server closes a dialog the user is looking at, and patches while it is open do not close it', async ({ page }) => {
    await page.click('#open-dlg');
    await expect(panel(page)).toBeVisible();
    await page.click('#dlg-bump');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await expect(panel(page)).toBeVisible();
    await page.click('#dlg-bump');
    await expect(page.locator('#version')).toHaveText('Server version 3');
    await expect(panel(page)).toBeVisible();
    await expect(page.locator('#dlg-body')).toContainText('Dialog body');
    await expect(page.locator('#dlg .void-dialog-close')).toHaveCount(1);
  });

  test('a dialog the user opened without the server stays open through unrelated patches', async ({ page }) => {
    await page.evaluate(async () => {
      const d = document.getElementById('dlg') as any;
      d.open = true;
      await d.updateComplete;
    });
    await expect(panel(page)).toBeVisible();
    await page.evaluate(() => (window as any).liveSocket.execJS(document.body, JSON.stringify([['push', { event: 'bump' }]])));
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await expect(panel(page)).toBeVisible();
  });
});

test.describe('navigation', () => {
  test('live navigation moves between LiveViews without a page load and back and forward work', async ({ page }) => {
    await lab(page);
    await page.evaluate(() => ((window as any).__doc = 'same'));
    await page.locator('#i-name input').fill('before leaving');
    await page.click('#to-two');
    await expect(page.locator('h1')).toHaveText('LiveView lab, page two');
    await expect(page).toHaveURL(/\/lab\/two$/);
    await page.waitForSelector('.phx-connected');
    await settle(page);
    expect(await page.evaluate(() => (window as any).__doc)).toBe('same');
    await expect(page.getByRole('textbox', { name: 'Note' })).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Choice' })).toHaveCount(1);
    await page.locator('#two-note input').fill('on page two');
    await page.locator('#two-choice select').selectOption('y');
    await expect(page.locator('#two-note-echo')).toHaveText('Server has note "on page two" and choice "y"');

    await page.goBack();
    await expect(page.locator('h1')).toHaveText('LiveView lab');
    await page.waitForSelector('.phx-connected');
    await settle(page);
    expect(await page.evaluate(() => (window as any).__doc)).toBe('same');
    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Country' })).toHaveCount(1);
    await page.locator('#i-name input').fill('after coming back');
    await page.click('#bump');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await expect(page.locator('#i-name input')).toHaveValue('after coming back');

    await page.goForward();
    await expect(page.locator('h1')).toHaveText('LiveView lab, page two');
    await page.waitForSelector('.phx-connected');
    await settle(page);
    await expect(page.getByRole('textbox', { name: 'Note' })).toHaveCount(1);
    await page.locator('#two-note input').fill('forward again');
    await expect(page.locator('#two-note-echo')).toContainText('forward again');
  });

  test('five round trips leave no duplicated or leaked nodes', async ({ page }) => {
    await lab(page);
    const nodes = await page.evaluate(() => document.querySelectorAll('#f *').length);
    for (let i = 0; i < 5; i++) {
      await page.click('#to-two');
      await expect(page.locator('h1')).toHaveText('LiveView lab, page two');
      await page.waitForSelector('.phx-connected');
      await page.goBack();
      await expect(page.locator('h1')).toHaveText('LiveView lab');
      await page.waitForSelector('.phx-connected');
      await settle(page);
    }
    expect(await page.evaluate(() => document.querySelectorAll('#f *').length)).toBe(nodes);
    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveCount(1);
  });

  test('a patch to the same LiveView keeps the components and updates the URL', async ({ page }) => {
    await lab(page);
    await mark(page, ['i-name', 'i-country']);
    await page.locator('#i-name input').fill('kept through a patch');
    await page.click('#patch-self');
    await expect(page.locator('#patched')).toHaveText('yes');
    await expect(page).toHaveURL(/\/lab\?patched=yes$/);
    expect(await kept(page, ['i-name', 'i-country'])).toEqual(['i-name', 'i-country']);
    await expect(page.locator('#i-name input')).toHaveValue('kept through a patch');
    await page.goBack();
    await expect(page.locator('#patched')).toHaveText('no');
    await settle(page);
    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveCount(1);
  });
});

test.describe('the event bridge', () => {
  test.beforeEach(async ({ page }) => lab(page));

  const last = async (page: Page, id: string) => (await events(page)).filter((e) => e.id === id).at(-1);

  test('a button click arrives as void-click with its id and name', async ({ page }) => {
    await page.click('#bridge-btn');
    await expect.poll(() => last(page, 'bridge-btn')).toMatchObject({ event: 'void-click', id: 'bridge-btn', name: 'bridge' });
  });

  test('phx-click on a button works next to the bridge', async ({ page }) => {
    expectedFailure('untracked:liveview-phx-click-on-button', 'the void-click the hook pushes locks the button, so LiveView drops its phx-click');
    await page.goto('/lab/two');
    await page.waitForSelector('.phx-connected');
    await ready(page);
    await page.click('#two-count');
    await expect(page.locator('#two-count')).toContainText('Count 1');
  });

  test('a select change carries the value in detail', async ({ page }) => {
    await page.locator('#bridge-select select').selectOption('b');
    await expect.poll(() => last(page, 'bridge-select')).toMatchObject({ event: 'void-change', id: 'bridge-select', name: 'bridge_select', detail: { value: 'b' } });
  });

  test('a checkbox and a switch carry checked in detail', async ({ page }) => {
    await page.click('#bridge-check');
    await expect.poll(() => last(page, 'bridge-check')).toMatchObject({ event: 'void-change', name: 'bridge_check', detail: { checked: true } });
    await page.click('#bridge-check');
    await expect.poll(() => last(page, 'bridge-check')).toMatchObject({ detail: { checked: false } });
    await page.click('#bridge-switch');
    await expect.poll(() => last(page, 'bridge-switch')).toMatchObject({ event: 'void-change', name: 'bridge_switch', detail: { checked: true } });
  });

  test('an input sends void-input per keystroke and void-change on commit', async ({ page }) => {
    await page.locator('#bridge-input input').click();
    await page.keyboard.type('abc');
    await expect.poll(async () => (await events(page)).filter((e) => e.id === 'bridge-input' && e.event === 'void-input').map((e) => e.detail.value)).toEqual(['a', 'ab', 'abc']);
    await page.keyboard.press('Tab');
    await expect.poll(() => last(page, 'bridge-input')).toMatchObject({ event: 'void-change', detail: { value: 'abc' } });
  });

  test('events from a component that a patch re-rendered still arrive once each', async ({ page }) => {
    await page.click('#bump');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await page.click('#bridge-btn');
    await expect.poll(async () => (await events(page)).filter((e) => e.id === 'bridge-btn').length).toBe(1);
    await page.waitForTimeout(300);
    expect((await events(page)).filter((e) => e.id === 'bridge-btn')).toHaveLength(1);
  });
});
