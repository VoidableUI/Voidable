// SPDX-License-Identifier: MIT
//
// A link button (<void-button><a href>) inside an overlay trigger part (#70): the
// host is presentational, so the inner link is the control and must carry the
// trigger's ARIA (aria-haspopup, aria-expanded, aria-controls); the role-less host
// must carry none of it. Also when the link arrives or leaves after connection.
import { test, expect, load, type Page } from '../helpers/test';

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
  }, html);
}

const setOpen = (page: Page, id: string, open: boolean) =>
  page.evaluate(async ([id, open]) => {
    const el = document.getElementById(id as string) as any;
    el.open = open;
    await el.updateComplete;
  }, [id, open] as const);

const ARIA = ['aria-haspopup', 'aria-expanded', 'aria-controls'];

async function expectNoneOn(page: Page, selector: string) {
  for (const name of ARIA) await expect(page.locator(selector), `${selector} has ${name}`).not.toHaveAttribute(name, /.*/);
}

const cases = [
  {
    name: 'dropdown menu',
    id: 'dd',
    popup: 'menu',
    html: (btn: string) => `<void-dropdown-menu id="dd"><void-dropdown-menu-trigger>${btn}</void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item>One</void-dropdown-menu-item></void-dropdown-menu-content></void-dropdown-menu>`,
  },
  {
    name: 'popover',
    id: 'pop',
    popup: 'dialog',
    html: (btn: string) => `<void-popover id="pop"><void-popover-trigger>${btn}</void-popover-trigger><void-popover-content><p>Body</p></void-popover-content></void-popover>`,
  },
];

for (const c of cases) {
  test.describe(c.name, () => {
    test('the inner link of a link button carries the trigger state, the host none', async ({ page }) => {
      await mount(page, c.html('<void-button id="b"><a id="l" href="#x">Open</a></void-button>'));
      await expect(page.locator('#b')).not.toHaveAttribute('role', /.*/);
      await expect(page.locator('#l')).toHaveAttribute('aria-haspopup', c.popup);
      await expect(page.locator('#l')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#l')).toHaveAttribute('aria-controls', /.+/);
      await expectNoneOn(page, '#b');
      expect(await page.locator('#case').ariaSnapshot()).toMatch(/link "Open"/);

      await setOpen(page, c.id, true);
      await expect(page.locator('#l')).toHaveAttribute('aria-expanded', 'true');
      await expectNoneOn(page, '#b');
      await setOpen(page, c.id, false);
      await expect(page.locator('#l')).toHaveAttribute('aria-expanded', 'false');
    });

    test('moves between host and link as the button gains and loses its link', async ({ page }) => {
      await mount(page, c.html('<void-button id="b">Open</void-button>'));
      await expect(page.locator('#b')).toHaveAttribute('aria-expanded', 'false');
      await page.evaluate(() => {
        document.getElementById('b')!.innerHTML = '<a id="l" href="#x">Open</a>';
      });
      await expect(page.locator('#l')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#l')).toHaveAttribute('aria-haspopup', c.popup);
      await expectNoneOn(page, '#b');
      await setOpen(page, c.id, true);
      await expect(page.locator('#l')).toHaveAttribute('aria-expanded', 'true');
      await page.evaluate(() => {
        document.getElementById('b')!.textContent = 'Open';
      });
      await expect(page.locator('#b')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#b')).toHaveAttribute('role', 'button');
    });
  });
}

test.describe('hover card', () => {
  test('is supplementary: neither the link nor the host carries disclosure state, and focusing the link opens it', async ({ page }) => {
    await mount(page, `<void-hover-card id="hc" open-delay="0" close-delay="0"><void-hover-card-trigger><void-button id="b"><a id="l" href="#x">Open</a></void-button></void-hover-card-trigger><void-hover-card-content><p>Card</p></void-hover-card-content></void-hover-card>`);
    await page.locator('#l').focus();
    await expect.poll(() => page.evaluate(() => (document.getElementById('hc') as any).open)).toBe(true);
    for (const sel of ['#l', '#b']) await expectNoneOn(page, sel);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => (document.getElementById('hc') as any).open)).toBe(false);
  });
});
