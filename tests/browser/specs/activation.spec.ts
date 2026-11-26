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
    await page.locator('#link-a').focus();
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual([]);
    await page.keyboard.press('Enter');
    // The anchor's own click (its default is prevented by the page), bubbling to the button: once.
    expect(await log(page)).toEqual(['click:link', 'void-click:link']);
  });

  test('a link button is one control: the link, with no role, tab stop or key handling on the host', async ({ page }) => {
    const host = page.locator('#link');
    for (const a of ['role', 'tabindex', 'aria-disabled', 'aria-pressed']) await expect(host).not.toHaveAttribute(a, /.*/);
    await expect(page.getByRole('button', { name: 'A link' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'A link' })).toHaveCount(1);
    // One Tab stop: from the control before it, the link is next, and the next stop is not inside the button.
    await page.locator('#aria-off').focus();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('link-a');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#link'))).toBe(false);
    // A key sent to the host does nothing: the link takes it.
    await page.locator('#link-a').focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('link-a');
  });

  test('a click anywhere on a link button follows its link once', async ({ page }) => {
    const host = page.locator('#link2');
    const box = (await host.boundingBox())!;
    // Corners, edges and the middle: the link fills the button.
    for (const [x, y] of [[3, 3], [box.width / 2, 3], [box.width - 3, box.height - 3], [box.width / 2, box.height / 2]] as const) {
      await page.evaluate(() => { location.hash = ''; (window as any).hashes = 0; });
      await settle(page);
      await page.evaluate(() => { (window as any).hashes = 0; });
      await host.click({ position: { x, y } });
      await expect.poll(() => page.evaluate(() => location.hash)).toBe('#followed2');
      // hashchange is dispatched after location.hash has already changed, so wait for the
      // count, then let the page settle and check that no second navigation followed.
      await expect.poll(() => page.evaluate(() => (window as any).hashes), { message: `click at ${x},${y}` }).toBe(1);
      await settle(page);
      expect(await page.evaluate(() => (window as any).hashes), `click at ${x},${y}`).toBe(1);
    }
  });

  test('a link button shows its focus ring when the link has focus, and the link draws none of its own', async ({ page }) => {
    await page.locator('#aria-off').focus();
    await page.keyboard.press('Tab');
    const styles = await page.evaluate(() => {
      const a = document.getElementById('link-a')!;
      const host = a.parentElement!;
      const h = getComputedStyle(host), l = getComputedStyle(a);
      return { host: [h.outlineStyle, parseFloat(h.outlineWidth)], link: [l.outlineStyle, parseFloat(l.outlineWidth)] };
    });
    expect(styles.host[0]).toBe('solid');
    expect(styles.host[1]).toBeGreaterThan(0);
    expect(styles.link[0]).toBe('none');
  });

  test('a disabled link button: the link is announced as disabled, is not a tab stop and does not navigate', async ({ page }) => {
    const a = page.locator('#link-off-a');
    await expect(a).toHaveAttribute('aria-disabled', 'true');
    await expect(a).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#link-off')).not.toHaveAttribute('role', /.*/);
    await page.locator('#link-off').click({ force: true });
    await a.evaluate((el) => (el as HTMLElement).click());
    await a.focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => location.hash)).not.toBe('#nope');
    expect(await log(page)).toEqual([]);
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

// The button in a nav-menu trigger part: Enter, Space and a click each toggle the panel once (one
// click event, one change of state), and hovering the item opens it too.
test.describe('the button in a nav-menu trigger part', () => {
  for (const route of routes) {
    test(`${route}: one click, opens, and the same route closes it`, async ({ page }) => {
      expect(await isOpen(page, 'nav-item')).toBe(false);
      await activate(page, 'nav-t', route);
      expect(await log(page)).toEqual(['click:nav-t']);
      await expect.poll(() => isOpen(page, 'nav-item')).toBe(true);
      await clear(page);
      await activate(page, 'nav-t', route);
      expect(await log(page)).toEqual(['click:nav-t']);
      await expect.poll(() => isOpen(page, 'nav-item')).toBe(false);
    });
  }

  test('hovering the item opens it and leaving closes it', async ({ page }) => {
    await page.locator('#nav-t').hover();
    await expect.poll(() => isOpen(page, 'nav-item')).toBe(true);
    await page.mouse.move(0, 400);
    await expect.poll(() => isOpen(page, 'nav-item')).toBe(false);
  });
});

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
