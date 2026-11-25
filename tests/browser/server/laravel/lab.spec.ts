// SPDX-License-Identifier: MIT
//
// Laravel Livewire 4 and Alpine against the real example app (examples/laravel, /lab and
// /lab/two) with the built @voidable/ui and @voidable/ui-alpine packages. Every test gets a
// new browser context and so a new Livewire component.
import { test, expect, settle, ready, fillLabForm, formEntries, mark, kept, typeFast, withoutMoveBefore, type Page } from '../shared';

/** Opens a page and waits for Livewire and Alpine to start and the components to upgrade. */
async function open(page: Page, path = '/lab') {
  await page.goto(path);
  await page.waitForFunction(() => !!(window as any).Livewire && !!(window as any).Alpine?.version && !!document.querySelector('[wire\\:id]'));
  await ready(page);
}

const text = async (page: Page, sel: string) => ((await page.locator(sel).textContent()) ?? '').trim();
const json = async (page: Page, sel: string) => JSON.parse(await text(page, sel));
const events = (page: Page) => json(page, '#events') as Promise<any[]>;
const prop = (page: Page, id: string, name: string) => page.evaluate(([id, name]) => (document.getElementById(id) as any)[name], [id, name]);
const ticks = async (page: Page) => Number((await text(page, '#ticks')).replace('Ticks ', ''));
const ticksAbove = (page: Page, n: number) => expect.poll(() => ticks(page)).toBeGreaterThan(n);

test.describe('render', () => {
  test('the page renders and every component upgrades once', async ({ page }) => {
    await open(page);
    for (const [role, name] of [['textbox', 'Full name'], ['combobox', 'Country'], ['switch', 'Newsletter'], ['checkbox', 'Remember me']] as const) {
      await expect(page.getByRole(role, { name }), `${role} ${name}`).toHaveCount(1);
    }
    expect(await page.evaluate(() => [document.querySelectorAll('#i-country select').length, document.querySelectorAll('#i-name input').length])).toEqual([1, 1]);
  });
});

test.describe('form', () => {
  test.beforeEach(async ({ page }) => open(page));

  test('every control submits and the server sees the values', async ({ page, allowErrors }) => {
    // Choosing two multiselect options makes the update after them throw in Lit; the multiselect test below covers that.
    allowErrors.push('ChildPart');
    const day = await fillLabForm(page);
    await page.waitForTimeout(300); // settle() would rethrow the Lit error that updateComplete carries
    await page.locator('#save').click();
    await expect(page.locator('#saved')).not.toHaveText('null');
    const { volume, ...saved } = await json(page, '#saved');
    expect(saved).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      bio: 'Line one',
      country: 'au',
      remember_me: true,
      plan: 'pro',
      newsletter: true,
      seats: 3,
      start: day,
      tags: ['alpha', 'beta'],
      framework: 'vue',
      skills: ['js', 'html'],
    });
    expect(Number(volume)).toBe(60);
  });

  test('a classic form post sends what the browser builds from the controls', async ({ page }) => {
    await open(page, '/lab/two');
    await page.locator('#p-name input').fill('Grace Hopper');
    await page.locator('#p-bio textarea').fill('Compiler');
    await page.locator('#p-country select').selectOption('fj');
    await page.locator('#p-remember').click();
    await page.locator('#p-plan void-radio[value=pro]').click();
    await page.locator('#p-news').click();
    await page.locator('#p-seats').getByRole('button', { name: 'Increment' }).click();
    await page.locator('#p-skills .void-multiselect-trigger').click();
    await page.locator('#p-skills').getByRole('option', { name: 'JS' }).click();
    await page.locator('h1').click();
    const entries = await formEntries(page, '#post-form');
    const [response] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/lab/echo')), page.click('#post-save')]);
    const body = await response.json();
    expect(body).toEqual({ user: { name: 'Grace Hopper', bio: 'Compiler', country: 'fj', remember_me: '1', plan: 'pro' }, newsletter: 'yes', seats: '3', skills: ['js'] });
    expect(entries.filter(([k]) => k !== '_token').length).toBeGreaterThanOrEqual(8);
  });
});

test.describe('server updates while the user is mid-interaction', () => {
  test.beforeEach(async ({ page }) => open(page));

  test('typed text and focus survive polling that changes text inside components every 100 ms', async ({ page, allowErrors }) => {
    // Livewire cancels the poll in flight when the next typed change is sent and logs that as an unhandled rejection; it is Livewire's, not Voidable's.
    allowErrors.push('signal is aborted');
    await page.click('#poll-on');
    const input = page.locator('#i-name input');
    await input.click();
    const start = await ticks(page);
    await page.keyboard.type('typing while polls arrive', { delay: 80 });
    await ticksAbove(page, start + 5);
    await expect(input).toHaveValue('typing while polls arrive');
    expect(await page.evaluate(() => document.activeElement === document.querySelector('#i-name input'))).toBe(true);
    await page.click('#poll-off');
    await expect.poll(() => json(page, '#current').then((c) => c.name)).toBe('typing while polls arrive');
  });

  test('a select the user changed keeps its choice while option text changes under it', async ({ page }) => {
    await page.locator('#i-country select').selectOption('au');
    await page.click('#poll-on');
    const start = await ticks(page);
    await ticksAbove(page, start + 3);
    await page.click('#poll-off');
    await settle(page);
    expect(await prop(page, 'i-country', 'value')).toBe('au');
    await expect(page.locator('#i-country option[value=nz]')).toContainText(/New Zealand \([1-9]/);
    await expect(page.locator('#i-country select')).toHaveCount(1);
  });

  test('checked, selected and chosen client state survive repeated polls', async ({ page }) => {
    await page.locator('#i-remember').click();
    await page.locator('#i-plan void-radio[value=pro]').click();
    await page.locator('#i-news').click();
    await page.click('#poll-on');
    const start = await ticks(page);
    await ticksAbove(page, start + 5);
    await page.click('#poll-off');
    await settle(page);
    expect(await page.evaluate(() => [(document.getElementById('i-remember') as any).checked, (document.getElementById('i-plan') as any).value, (document.getElementById('i-news') as any).checked])).toEqual([true, 'pro', true]);
  });

  test('an open dropdown menu stays open through polls', async ({ page }) => {
    await page.click('#poll-on');
    await page.click('#dd-trigger');
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    const start = await ticks(page);
    await ticksAbove(page, start + 5);
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    await expect(page.locator('#dd-trigger')).toContainText('Actions ');
  });

  test('a selected tab stays selected and its panel text updates', async ({ page }) => {
    await page.getByRole('tab', { name: 'Two' }).click();
    await page.click('#poll-on');
    const start = await ticks(page);
    await ticksAbove(page, start + 3);
    await page.click('#poll-off');
    await expect(page.locator('#tabs').getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tabs [role=tabpanel]:visible')).toContainText('Panel two, ticks');
    await expect(page.locator('#tabs').getByRole('tab')).toHaveCount(2);
  });

  test('a multiselect keeps working through the updates after the user chose two options', async ({ page }) => {
    await page.locator('#i-skills .void-multiselect-trigger').click();
    await page.locator('#i-skills').getByRole('option', { name: 'JS' }).click();
    await page.locator('#i-skills').getByRole('option', { name: 'HTML' }).click();
    await page.locator('h1').click();
    await page.click('#bump');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await expect(page.locator('#i-skills')).toContainText('JS');
  });

  test('nodes are kept: no component is replaced by an update', async ({ page }) => {
    const ids = ['i-name', 'i-country', 'i-plan', 'i-vol', 'i-fw', 'i-skills', 'dd', 'tabs', 'dlg'];
    await mark(page, ids);
    await page.click('#bump');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await page.click('#poll-on');
    const start = await ticks(page);
    await ticksAbove(page, start + 3);
    await page.click('#poll-off');
    await settle(page);
    expect(await kept(page, ids)).toEqual(ids);
    expect(await page.evaluate(() => document.querySelectorAll('#i-country select').length)).toBe(1);
  });

  test('server-changed values win over what the user did', async ({ page }) => {
    await page.locator('#i-name input').fill('user typed');
    await page.locator('#i-country select').selectOption('au');
    await page.locator('#i-plan void-radio[value=pro]').click();
    await page.click('#server-sets');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await settle(page);
    await expect(page.locator('#i-name input')).toHaveValue('Set by the server');
    expect(await page.evaluate(() => [(document.getElementById('i-country') as any).value, (document.getElementById('i-plan') as any).value, (document.getElementById('i-remember') as any).checked, (document.getElementById('i-news') as any).checked, Number((document.getElementById('i-vol') as any).value)])).toEqual(['fj', 'team', true, true, 80]);
  });

  test('the server selecting a tab wins over the user selection', async ({ page }) => {
    await page.getByRole('tab', { name: 'One' }).click();
    await page.click('#server-tab');
    await expect(page.locator('#tabs').getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('overlays opened by the server or the user', () => {
  test.beforeEach(async ({ page }) => open(page));

  const panel = (page: Page) => page.locator('#dlg .void-dialog-panel');
  const server = (page: Page, call: string) => page.evaluate((c) => new Function("lw", `return lw.${c}`)((window as any).Livewire.first()), call);

  test('the server opens a dialog and the user closes it, and the server hears about it', async ({ page }) => {
    await page.click('#open-dlg');
    await expect(panel(page)).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Server dialog' })).toBeVisible();
    await expect(page.locator('#dialog-state')).toContainText('open');
    await page.locator('#dlg .void-dialog-close').click();
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#dialog-state')).toContainText('closed');
    // The server can open it again: its state followed the user's.
    await page.click('#open-dlg');
    await expect(panel(page)).toBeVisible();
  });

  test('the server closes a dialog the user is looking at', async ({ page }) => {
    await page.click('#open-dlg');
    await expect(panel(page)).toBeVisible();
    await server(page, 'closeDialog()');
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#dialog-state')).toContainText('closed');
  });

  test('updates while a dialog is open do not close it', async ({ page }) => {
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

  test('a dialog the user opened without the server stays open through an unrelated update', async ({ page }) => {
    await page.evaluate(async () => {
      const d = document.getElementById('dlg') as any;
      d.open = true;
      await d.updateComplete;
    });
    await expect(panel(page)).toBeVisible();
    await server(page, 'bump()');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await expect(panel(page)).toBeVisible();
  });
});

test.describe('navigation', () => {
  test('wire:navigate moves between pages without a page load and back and forward work', async ({ page }) => {
    await open(page);
    await page.evaluate(() => ((window as any).__doc = 'same'));
    await page.locator('#i-name input').fill('before leaving');
    await page.click('#to-two');
    await expect(page.locator('h1')).toHaveText('Livewire lab, page two');
    await expect(page).toHaveURL(/\/lab\/two$/);
    await ready(page);
    expect(await page.evaluate(() => (window as any).__doc)).toBe('same');
    await expect(page.getByRole('textbox', { name: 'Note' })).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Choice' })).toHaveCount(1);
    await page.locator('#two-note input').fill('on page two');
    await page.locator('#two-choice select').selectOption('y');
    await expect(page.locator('#two-note-echo')).toHaveText('Server has note "on page two" and choice "y"');
    await page.click('#two-count');
    await expect(page.locator('#two-count')).toContainText('Count 1');

    await page.goBack();
    await expect(page.locator('h1')).toHaveText('Livewire lab');
    await ready(page);
    expect(await page.evaluate(() => (window as any).__doc)).toBe('same');
    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Country' })).toHaveCount(1);
    await page.locator('#i-name input').fill('after coming back');
    await page.click('#bump');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await expect(page.locator('#i-name input')).toHaveValue('after coming back');

    await page.goForward();
    await expect(page.locator('h1')).toHaveText('Livewire lab, page two');
    await ready(page);
    await expect(page.getByRole('textbox', { name: 'Note' })).toHaveCount(1);
    await page.locator('#two-note input').fill('forward again');
    await expect(page.locator('#two-note-echo')).toContainText('forward again');
  });

  test('five round trips leave no duplicated or leaked nodes', async ({ page }) => {
    await open(page);
    const nodes = await page.evaluate(() => document.querySelectorAll('#f *').length);
    for (let i = 0; i < 5; i++) {
      await page.click('#to-two');
      await expect(page.locator('h1')).toHaveText('Livewire lab, page two');
      await ready(page);
      await page.goBack();
      await expect(page.locator('h1')).toHaveText('Livewire lab');
      await ready(page);
    }
    expect(await page.evaluate(() => document.querySelectorAll('#f *').length)).toBe(nodes);
    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveCount(1);
  });
});

test.describe('the event bridge', () => {
  test.beforeEach(async ({ page }) => open(page));

  const last = async (page: Page, id: string) => (await events(page)).filter((e) => e.id === id).at(-1);

  test('a button click arrives as void-click with its id and name', async ({ page }) => {
    await page.click('#bridge-btn');
    await expect.poll(() => last(page, 'bridge-btn')).toMatchObject({ event: 'void-click', id: 'bridge-btn', name: 'bridge' });
  });

  test('wire:click on a void-button runs the action', async ({ page }) => {
    await page.goto('/lab/two');
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

  test('an input sends void-change on commit with its value', async ({ page }) => {
    await page.locator('#bridge-input input').click();
    await page.keyboard.type('abc');
    await page.keyboard.press('Tab');
    await expect.poll(() => last(page, 'bridge-input')).toMatchObject({ event: 'void-change', detail: { value: 'abc' } });
  });

  test('events from a component that an update re-rendered still arrive once each', async ({ page }) => {
    await page.click('#bump');
    await expect(page.locator('#version')).toHaveText('Server version 2');
    await page.click('#bridge-btn');
    await expect.poll(async () => (await events(page)).filter((e) => e.id === 'bridge-btn').length).toBe(1);
    await page.waitForTimeout(300);
    expect((await events(page)).filter((e) => e.id === 'bridge-btn')).toHaveLength(1);
  });
});

// The text fields send every key to the server ($wire.set on void-input, the
// live binding the README recommends) and Livewire morphs each reply in, a few
// keys behind what has been typed; polling every 100 ms adds morphs between.
const TEXT = 'the quick brown fox jumps over the lazy dog, again and again!'.slice(0, 60);
const FIELDS: [string, string, string][] = [
  ['input', '#i-name input', TEXT],
  ['email input', '#i-email input', 'ada.lovelace.and.charles.babbage@analytical-engine.example.uk'.slice(0, 60)],
  ['textarea', '#i-bio textarea', TEXT],
  ['number-input', '#i-seats input', '1234567890'.repeat(6)],
  ['combobox', '#i-fw input', TEXT],
];
for (const moveBefore of [true, false]) {
  test.describe(`typing fast while every key round-trips and polls arrive${moveBefore ? '' : ', without Element.moveBefore'}`, () => {
    test.beforeEach(async ({ page, allowErrors }) => {
      // Livewire cancels the poll in flight when the next typed change is sent and logs that as an unhandled rejection.
      allowErrors.push('signal is aborted');
      if (!moveBefore) await withoutMoveBefore(page);
      await open(page);
      await page.click('#poll-on');
    });
    for (const [name, selector, text] of FIELDS) {
      test(`${name}: 60 keys at 30 ms keep every character and focus never leaves`, async ({ page }) => {
        const { initial, value, away } = await typeFast(page, selector, text);
        await page.click('#poll-off');
        expect(value).toBe(initial + text);
        expect(away, 'keystrokes after which focus was elsewhere').toBe(0);
      });
    }
  });
}
