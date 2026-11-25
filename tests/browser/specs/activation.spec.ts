// SPDX-License-Identifier: MIT
//
// A void-button (and every other element that activates itself) behaves like a
// native button: the mouse, Enter and Space each produce one real `click`, so
// whatever listens for `click` (overlay triggers, onClick, phx-click, a form
// submit) works for the keyboard too.
import { test, expect, load, settle, type Page } from '../helpers/test';

test.beforeEach(async ({ page }) => {
  await load(page, '/activation');
});

const log = (page: Page) => page.evaluate(() => (window as any).log.slice() as string[]);
const clear = (page: Page) => page.evaluate(() => { (window as any).log.length = 0; });
const isOpen = (page: Page, id: string) => page.evaluate((id) => (document.getElementById(id) as any).open as boolean, id);

type Route = 'mouse' | 'Enter' | 'Space';
const routes: Route[] = ['mouse', 'Enter', 'Space'];

async function activate(page: Page, id: string, route: Route): Promise<void> {
  const el = page.locator('#' + id);
  if (route === 'mouse') {
    await el.click();
  } else {
    await el.focus();
    await page.keyboard.press(route === 'Enter' ? 'Enter' : 'Space');
  }
  await settle(page);
}

test.describe('a void-button activates like a native button', () => {
  for (const route of routes) {
    test(`${route}: one click and one void-click`, async ({ page }) => {
      await activate(page, 'plain', route);
      expect(await log(page)).toEqual(['click:plain', 'void-click:plain']);
    });
  }

  test('Space activates on keyup, Enter on keydown', async ({ page }) => {
    await page.locator('#plain').focus();
    await page.keyboard.down('Space');
    expect(await log(page)).toEqual([]);
    await page.keyboard.up('Space');
    expect(await log(page)).toEqual(['click:plain', 'void-click:plain']);
    await clear(page);
    await page.keyboard.down('Enter');
    expect(await log(page)).toEqual(['click:plain', 'void-click:plain']);
    await page.keyboard.up('Enter');
    expect(await log(page)).toHaveLength(2);
  });

  test('Space pressed elsewhere and released on the button does nothing', async ({ page }) => {
    await page.locator('#before').focus();
    await page.keyboard.down('Space');
    await page.locator('#plain').focus();
    await page.keyboard.up('Space');
    expect(await log(page)).toEqual([]);
  });

  for (const id of ['off', 'aria-off']) {
    for (const route of ['Enter', 'Space'] as const) {
      test(`#${id} does nothing on ${route}`, async ({ page }) => {
        await page.locator('#' + id).evaluate((el) => (el as HTMLElement).focus());
        await page.keyboard.press(route === 'Enter' ? 'Enter' : 'Space');
        expect(await log(page)).toEqual([]);
      });
    }
  }

  test('a disabled button ignores the mouse too', async ({ page }) => {
    await page.locator('#off').click({ force: true });
    expect(await log(page)).toEqual([]);
  });

  test('a link button follows its link with Enter and not with Space', async ({ page }) => {
    await page.locator('#link').focus();
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual([]);
    await page.keyboard.press('Enter');
    // The anchor's own click (its default is prevented by the page), bubbling to the button: once.
    expect(await log(page)).toEqual(['click:link', 'void-click:link']);
  });

  for (const id of ['tgl', 'sw', 'ham', 'cb'] as const) {
    test(`#${id}: Space and Enter fire one click`, async ({ page }) => {
      const keys = id === 'cb' ? ['Space'] : ['Space', 'Enter'];
      for (const key of keys) {
        await clear(page);
        await page.locator('#' + id).focus();
        await page.keyboard.press(key);
        expect(await log(page), `${id} ${key}`).toEqual(['click:' + id]);
      }
    });
  }

  test('dropdown items fire one click on Enter and on Space', async ({ page }) => {
    for (const key of ['Enter', 'Space']) {
      await clear(page);
      await page.locator('#dd-t').click();
      await expect.poll(() => isOpen(page, 'dd')).toBe(true);
      await page.locator('#dd-one').focus();
      await page.keyboard.press(key);
      await expect.poll(() => isOpen(page, 'dd')).toBe(false);
      expect((await log(page)).filter((l) => l.endsWith(':dd-one')), key).toEqual(['click:dd-one']);
    }
  });
});

for (const [name, trigger, host] of [['dropdown-menu', 'dd-t', 'dd'], ['popover', 'pop-t', 'pop']] as const) {
  test.describe(`void-button as the trigger of a ${name}`, () => {
    for (const route of routes) {
      test(`${route} opens and closes it`, async ({ page }) => {
        expect(await isOpen(page, host)).toBe(false);
        await activate(page, trigger, route);
        await expect.poll(() => isOpen(page, host)).toBe(true);
        // The trigger is the focus target again for a second activation.
        await activate(page, trigger, route);
        await expect.poll(() => isOpen(page, host)).toBe(false);
      });
    }

    test('Tab reaches the trigger, Enter then Space operate it', async ({ page }) => {
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement!.id)).toBe('dd-t');
      if (name === 'popover') {
        await page.locator('#pop-t').focus();
      }
      await page.keyboard.press('Enter');
      await expect.poll(() => isOpen(page, host)).toBe(true);
      await page.keyboard.press('Escape');
      await expect.poll(() => isOpen(page, host)).toBe(false);
      await page.locator('#' + trigger).focus();
      await page.keyboard.press('Space');
      await expect.poll(() => isOpen(page, host)).toBe(true);
    });
  });
}

// Hover cards and tooltips open on hover and focus, not on a click: the button inside
// their trigger part still gets exactly one click and one void-click from each route,
// and the overlay is open after the mouse is over it or the keyboard is on it.
for (const [name, trigger, host] of [['hover-card', 'hc-t', 'hc'], ['tooltip', 'tip-t', 'tip']] as const) {
  test.describe(`void-button as the trigger of a ${name}`, () => {
    for (const route of routes) {
      test(`${route}: one click, one void-click, and it is open`, async ({ page }) => {
        await activate(page, trigger, route);
        expect(await log(page)).toEqual([`click:${trigger}`, `void-click:${trigger}`]);
        // A tooltip is dismissed by pressing its trigger, as a native one is: it is open after
        // the keyboard is on it, not after a click.
        if (name === 'tooltip' && route === 'mouse') return;
        await expect.poll(() => isOpen(page, host)).toBe(true);
        await page.keyboard.press('Escape');
        await expect.poll(() => isOpen(page, host)).toBe(false);
      });
    }
  });
}

test.describe('a dropdown item with a value activates once', () => {
  for (const route of routes) {
    test(`${route}: one click and one void-select`, async ({ page }) => {
      await activate(page, 'dd-t', 'mouse');
      await expect.poll(() => isOpen(page, 'dd')).toBe(true);
      await clear(page);
      await activate(page, 'dd-two', route);
      await expect.poll(() => isOpen(page, 'dd')).toBe(false);
      expect(await log(page)).toEqual(['click:dd-two', 'select:two']);
    });
  }
});

test('ArrowDown still opens the menu and focuses its first item', async ({ page }) => {
  await page.locator('#dd-t').focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => isOpen(page, 'dd')).toBe(true);
  expect(await page.evaluate(() => document.activeElement!.id)).toBe('dd-one');
});

test.describe('a submit button submits once', () => {
  for (const route of routes) {
    test(`${route}`, async ({ page }) => {
      await activate(page, 'submit', route);
      expect(await page.evaluate(() => (window as any).submits)).toBe(1);
    });
  }

  test('a disabled submit button submits nothing', async ({ page }) => {
    await page.locator('#submit-off').evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.locator('#submit-off').click({ force: true });
    expect(await page.evaluate(() => (window as any).submits)).toBe(0);
  });

  for (const route of routes) {
    test(`a reset button resets with ${route}`, async ({ page }) => {
      await page.locator('#f-name').fill('changed');
      await activate(page, 'reset', route);
      expect(await page.locator('#f-name').inputValue()).toBe('x');
    });
  }
});
