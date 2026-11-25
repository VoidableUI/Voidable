// SPDX-License-Identifier: MIT
//
// Overlays: dialog, drawer, popover, hover-card, dropdown-menu, tooltip and
// toast, opened and closed by every route a user has, repeatedly, nested.
// A closed overlay must be invisible, out of the tab order and out of the
// accessibility tree.
import { test, expect, expectedFailure, load, settle, isPerceivable, focusedId, type Page } from '../helpers/test';

test.beforeEach(async ({ page }) => {
  await load(page, '/overlays');
});

const prop = (page: Page, id: string, name: string) => page.evaluate(([id, name]) => (document.getElementById(id) as any)[name], [id, name]);
const setOpen = (page: Page, id: string, open: boolean) =>
  page.evaluate(async ([id, open]) => {
    const el = document.getElementById(id as string) as any;
    el.open = open;
    await el.updateComplete;
  }, [id, open] as const);

/** Asserts that nothing inside `selector` can be seen, tabbed to or found in the accessibility tree. */
async function expectGone(page: Page, selector: string, text: RegExp) {
  await expect.poll(() => isPerceivable(page.locator(selector).first()), { message: `${selector} is still visible` }).toBe(false);
  const tree = await page.locator('body').ariaSnapshot();
  expect(tree, `${selector} is still in the accessibility tree`).not.toMatch(text);
  const inTabOrder = await page.evaluate((sel) => {
    const root = document.querySelector(sel)!;
    return [...root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')].some(
      (el) => el.tabIndex >= 0 && !el.closest('[hidden], [inert]') && el.checkVisibility?.() !== false && !!el.getClientRects().length,
    );
  }, selector);
  expect(inTabOrder, `something inside ${selector} is still focusable`).toBe(false);
}

test.describe('closed overlays', () => {
  test('are invisible, unfocusable and absent from the accessibility tree on load', async ({ page }) => {
    await expectGone(page, '#dlg .dlg-content', /Dialog body/);
    await expectGone(page, '#dlg-nc .nc-content', /Cannot close/);
    await expectGone(page, '#drw .drw-content', /Drawer body/);
    await expectGone(page, '#nested-dlg .nd-content', /Nested body/);
    for (const id of ['pop-start', 'pop-center', 'pop-end', 'pop-default']) await expectGone(page, `#${id} .pc`, new RegExp(`${id.slice(4)} content`));
    await expectGone(page, '#dd void-dropdown-menu-item', /menuitem "One"/);
    await expectGone(page, '#dd2 void-dropdown-menu-item', /menuitem "Alpha"/);
  });

  test('hover-card body is hidden while closed', async ({ page }) => {
    expectedFailure('untracked:hover-card-closed-exposed', 'the closed card is only opacity: 0, so its content stays in the accessibility tree and its links in the tab order');
    await expectGone(page, '#hc .hcc', /Hover card content/);
  });

  test('the tab order skips every closed overlay', async ({ page }) => {
    expectedFailure('untracked:hover-card-closed-exposed', 'Tab lands on the link inside the closed hover card');
    await page.locator('#before').focus();
    const seen: string[] = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const id = (await focusedId(page)) ?? 'body';
      seen.push(id);
      if (id === 'after') break;
    }
    expect(seen).toEqual(['open-dlg', 'open-dlg-nc', 'open-drw', 'open-drw-nc', 'pop-start-t', 'pop-center-t', 'pop-end-t', 'pop-default-t', 'hc-t', 'dd-t', 'dd2-t', 'tt-t', 'after']);
  });
});

test.describe('dialog', () => {
  const routes = ['close button', 'Escape', 'backdrop click', 'open = false'] as const;

  test('opens and closes by every route, three times each', async ({ page }) => {
    for (let round = 0; round < 3; round++) {
      for (const route of routes) {
        await page.locator('#open-dlg').click();
        await expect(page.locator('#dlg .dlg-content')).toBeVisible();
        expect(await isPerceivable(page.locator('#dlg-input'))).toBe(true);
        await expect.poll(() => page.evaluate(() => document.getElementById('dlg')!.contains(document.activeElement))).toBe(true);
        expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');

        if (route === 'close button') await page.locator('#dlg .void-dialog-close').click();
        if (route === 'Escape') await page.keyboard.press('Escape');
        if (route === 'backdrop click') await page.mouse.click(5, 5);
        if (route === 'open = false') await setOpen(page, 'dlg', false);

        expect(await prop(page, 'dlg', 'open'), `closed by ${route}`).toBe(false);
        await expectGone(page, '#dlg .dlg-content', /Dialog body/);
        expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
        await page.evaluate(() => (window as any).closes.splice(0));
      }
    }
  });

  for (const route of ['close button', 'Escape', 'backdrop click'] as const) {
    test(`closing by ${route} fires void-close exactly once`, async ({ page }) => {
      if (route === 'Escape') {
        expectedFailure('untracked:dialog-escape-double-close', 'Escape with focus inside the dialog fires void-close twice (backdrop and document listeners)', { browsers: ['firefox'] });
      }
      await page.locator('#open-dlg').click();
      await expect.poll(() => page.evaluate(() => document.getElementById('dlg')!.contains(document.activeElement))).toBe(true);
      if (route === 'close button') await page.locator('#dlg .void-dialog-close').click();
      if (route === 'Escape') await page.keyboard.press('Escape');
      if (route === 'backdrop click') await page.mouse.click(5, 5);
      await expect.poll(() => prop(page, 'dlg', 'open')).toBe(false);
      await settle(page);
      expect(await page.evaluate(() => (window as any).closes)).toEqual(['dlg']);
    });
  }

  test('the dialog is a named modal in the accessibility tree while open', async ({ page }) => {
    await page.locator('#open-dlg').click();
    await expect(page.locator('#dlg')).toMatchAriaSnapshot(`
      - dialog "Edit profile":
        - text: Edit profile
        - button "Close"
        - paragraph: Dialog body
        - textbox "Name"
        - button "OK"
    `);
  });

  test('closable="false" ignores Escape and the backdrop and has no close button', async ({ page }) => {
    await page.locator('#open-dlg-nc').click();
    await expect(page.locator('#dlg-nc .nc-content')).toBeVisible();
    await expect(page.locator('#dlg-nc .void-dialog-close')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    expect(await prop(page, 'dlg-nc', 'open')).toBe(true);
    await expect(page.locator('#dlg-nc .nc-content')).toBeVisible();
    await setOpen(page, 'dlg-nc', false);
    await expectGone(page, '#dlg-nc .nc-content', /Cannot close/);
  });

  test('Tab stays inside the open dialog', async ({ page }) => {
    expectedFailure('#6', 'dialog has no focus trap: Tab walks out to the page behind');
    await page.locator('#open-dlg').click();
    await expect.poll(() => page.evaluate(() => document.getElementById('dlg')!.contains(document.activeElement))).toBe(true);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.getElementById('dlg')!.contains(document.activeElement))).toBe(true);
    }
  });

  test('closing returns focus to the element that opened it', async ({ page }) => {
    expectedFailure('#6', 'dialog does not restore focus on close; focus drops to <body>');
    await page.locator('#open-dlg').click();
    await expect.poll(() => page.evaluate(() => document.getElementById('dlg')!.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    expect(await focusedId(page)).toBe('open-dlg');
  });
});

test.describe('drawer', () => {
  test('opens and closes by close button, backdrop and property, three times each', async ({ page }) => {
    for (let round = 0; round < 3; round++) {
      for (const route of ['close button', 'backdrop click', 'open = false'] as const) {
        await page.locator('#open-drw').click();
        await expect(page.locator('#drw .drw-content')).toBeVisible();
        expect(await isPerceivable(page.locator('#drw-btn'))).toBe(true);
        if (route === 'close button') await page.locator('#drw > .void-drawer-panel .void-drawer-close').click();
        if (route === 'backdrop click') await page.mouse.click(20, 400);
        if (route === 'open = false') await setOpen(page, 'drw', false);
        expect(await prop(page, 'drw', 'open'), `closed by ${route}`).toBe(false);
        await expectGone(page, '#drw .drw-content', /Drawer body/);
      }
    }
  });

  test('Escape closes it while focus is inside', async ({ page }) => {
    await page.locator('#open-drw').click();
    await page.locator('#drw-btn').focus();
    await page.keyboard.press('Escape');
    expect(await prop(page, 'drw', 'open')).toBe(false);
    await expectGone(page, '#drw .drw-content', /Drawer body/);
  });

  test('Escape closes it right after opening from its trigger', async ({ page }) => {
    expectedFailure('#6', 'drawer does not move focus in and listens for Escape only on itself');
    await page.locator('#open-drw').click();
    await expect(page.locator('#drw .drw-content')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(await prop(page, 'drw', 'open')).toBe(false);
  });

  test('closable="false" ignores Escape and the backdrop', async ({ page }) => {
    await page.locator('#open-drw-nc').click();
    await page.locator('#drw-nc-btn').focus();
    await page.keyboard.press('Escape');
    await page.mouse.click(20, 400);
    expect(await prop(page, 'drw-nc', 'open')).toBe(true);
    await expect(page.locator('#drw-nc .void-drawer-close')).toHaveCount(0);
    await setOpen(page, 'drw-nc', false);
    await expectGone(page, '#drw-nc .drw-nc-content', /stays/);
  });
});

test.describe('nested overlays (drawer > dialog > dropdown-menu)', () => {
  async function openAll(page: Page) {
    await page.locator('#open-drw').click();
    await page.locator('#open-nested').click();
    await expect(page.locator('#nested-dlg .nd-content')).toBeVisible();
    await page.locator('#nested-dd-t').click();
    await expect(page.locator('#nested-dd void-dropdown-menu-item').first()).toBeVisible();
  }

  test('every layer opens on top of the one below and is usable', async ({ page }) => {
    for (let round = 0; round < 3; round++) {
      await openAll(page);
      expect(await isPerceivable(page.locator('#nested-dd void-dropdown-menu-item').first())).toBe(true);
      await page.keyboard.press('ArrowDown');
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('VOID-DROPDOWN-MENU-ITEM');
      await setOpen(page, 'nested-dd', false);
      await setOpen(page, 'nested-dlg', false);
      await setOpen(page, 'drw', false);
      await expectGone(page, '#drw .drw-content', /Drawer body/);
    }
  });

  test('Escape closes only the innermost layer', async ({ page }) => {
    expectedFailure('#6', 'one Escape closes the menu, the dialog and the drawer together');
    await openAll(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    expect(await prop(page, 'nested-dd', 'open')).toBe(false);
    expect(await prop(page, 'nested-dlg', 'open')).toBe(true);
    expect(await prop(page, 'drw', 'open')).toBe(true);
    await page.keyboard.press('Escape');
    expect(await prop(page, 'nested-dlg', 'open')).toBe(false);
    expect(await prop(page, 'drw', 'open')).toBe(true);
  });
});

test.describe('popover', () => {
  for (const id of ['pop-start', 'pop-center', 'pop-end', 'pop-default']) {
    test(`${id}: aligned to its trigger and closed by every route, repeatedly`, async ({ page }) => {
      const trigger = page.locator(`#${id}-t`);
      const content = page.locator(`#${id} .pc`);
      for (let round = 0; round < 2; round++) {
        for (const route of ['Escape', 'outside click', 'trigger click', 'open = false'] as const) {
          await trigger.click();
          await expect(content).toBeVisible();
          expect(await isPerceivable(content)).toBe(true);
          const t = (await trigger.boundingBox())!;
          const p = (await page.locator(`#${id} > .void-popover-body`).boundingBox())!;
          expect(p.y, 'opens below the trigger').toBeGreaterThanOrEqual(t.y + t.height - 1);
          const align = id === 'pop-default' ? 'start' : id.slice(4);
          if (align === 'start') expect(Math.abs(p.x - t.x)).toBeLessThanOrEqual(1);
          if (align === 'end') expect(Math.abs(p.x + p.width - (t.x + t.width))).toBeLessThanOrEqual(1);
          if (align === 'center') expect(Math.abs(p.x + p.width / 2 - (t.x + t.width / 2))).toBeLessThanOrEqual(1);

          if (route === 'Escape') await page.keyboard.press('Escape');
          if (route === 'outside click') await page.mouse.click(1200, 20);
          if (route === 'trigger click') await trigger.click();
          if (route === 'open = false') await setOpen(page, id, false);
          expect(await prop(page, id, 'open'), `closed by ${route}`).toBe(false);
          await expectGone(page, `#${id} .pc`, new RegExp(`${id.slice(4)} content`));
        }
      }
    });
  }

  test('a click inside the popover does not close it', async ({ page }) => {
    await page.locator('#pop-start-t').click();
    await page.locator('#pop-start-in').click();
    expect(await prop(page, 'pop-start', 'open')).toBe(true);
  });
});

test.describe('hover-card', () => {
  test('opens on hover and closes when the pointer leaves, repeatedly', async ({ page }) => {
    expectedFailure('untracked:hover-card-closed-exposed', 'after closing, the card content is still in the accessibility tree');
    for (let i = 0; i < 4; i++) {
      await page.locator('#hc-t').hover();
      await expect(page.locator('#hc .hcc')).toBeVisible();
      await expect(page.locator('#hc')).toHaveAttribute('open', '');
      await page.mouse.move(1200, 20);
      await expect(page.locator('#hc')).not.toHaveAttribute('open', '');
      await expectGone(page, '#hc .hcc', /Hover card content/);
    }
  });

  test('stays open while the pointer moves onto the card', async ({ page }) => {
    await page.locator('#hc-t').hover();
    await expect(page.locator('#hc .hcc')).toBeVisible();
    await page.locator('#hc-link').hover();
    await expect(page.locator('#hc')).toHaveAttribute('open', '');
    await page.locator('#hc-link').click();
    await expect(page.locator('#hc')).toHaveAttribute('open', '');
  });

  test('opens on keyboard focus and closes on Escape', async ({ page }) => {
    expectedFailure('untracked:hover-card-closed-exposed', 'after Escape, the card content is still in the accessibility tree');
    await page.locator('#hc-t').focus();
    await expect(page.locator('#hc .hcc')).toBeVisible();
    await expect(page.locator('#hc .void-hover-card-trigger')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#hc')).not.toHaveAttribute('open', '');
    await expectGone(page, '#hc .hcc', /Hover card content/);
  });
});

test.describe('dropdown-menu', () => {
  for (const [id, first, slotted] of [['dd', 'dd-1', true], ['dd2', 'dd2-1', false]] as const) {
    const label = slotted ? 'with slot="trigger"' : 'with a plain first-child trigger';
    test(`${label}: opens by click and Enter, closes by Escape, outside click and trigger, repeatedly`, async ({ page }) => {
      const trigger = page.locator(`#${id}-t`);
      const item = page.locator(`#${first}`);
      for (let round = 0; round < 2; round++) {
        for (const route of ['Escape', 'outside click', 'trigger click', 'open = false'] as const) {
          if (round % 2) {
            await trigger.focus();
            await page.keyboard.press('Enter');
          } else {
            await trigger.click();
          }
          await expect(item).toBeVisible();
          expect(await isPerceivable(item)).toBe(true);
          if (route === 'Escape') await page.keyboard.press('Escape');
          if (route === 'outside click') await page.mouse.click(1200, 20);
          if (route === 'trigger click') await trigger.click();
          if (route === 'open = false') await setOpen(page, id, false);
          expect(await prop(page, id, 'open'), `closed by ${route}`).toBe(false);
          await expectGone(page, `#${id} .void-dropdown-menu-panel`, new RegExp(`menuitem "${slotted ? 'One' : 'Alpha'}"`));
          if (route === 'Escape') expect(await focusedId(page)).toBe(`${id}-t`);
        }
      }
    });

    test(`${label}: arrow keys walk the enabled items and wrap`, async ({ page }) => {
      await page.locator(`#${id}-t`).click();
      const walk: (string | null)[] = [];
      for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp']) {
        await page.keyboard.press(key);
        walk.push(await focusedId(page));
      }
      expect(walk).toEqual(slotted ? ['dd-1', 'dd-2', 'dd-1', 'dd-2'] : ['dd2-1', 'dd2-2', 'dd2-1', 'dd2-2']);
    });

    test(`${label}: choosing an item fires void-select and closes the menu`, async ({ page }) => {
      expectedFailure('#39', 'dropdown-menu stays open after an item is chosen');
      await page.locator(`#${id}-t`).click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => (window as any).selects)).toEqual([first]);
      expect(await prop(page, id, 'open')).toBe(false);
    });

    test(`${label}: the trigger announces the menu (aria-haspopup, aria-expanded)`, async ({ page }) => {
      expectedFailure('#39', 'dropdown-menu trigger has no aria-haspopup or aria-expanded');
      const trigger = page.locator(`#${id}-t`);
      await expect(trigger).toHaveAttribute('aria-haspopup', 'menu', { timeout: 1000 });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false', { timeout: 1000 });
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
    });
  }

  test('a disabled item is skipped and cannot be chosen', async ({ page }) => {
    await page.locator('#dd-t').click();
    await page.locator('#dd-3').click({ force: true });
    expect(await page.evaluate(() => (window as any).selects)).toEqual([]);
  });
});

test.describe('tooltip', () => {
  test('shows on hover and hides on leave and on Escape, repeatedly', async ({ page }) => {
    const bubble = page.locator('#tt [role=tooltip]');
    for (let i = 0; i < 4; i++) {
      await page.locator('#tt-t').hover();
      await expect(page.locator('#tt')).toHaveAttribute('visible', '');
      await expect(bubble).toBeVisible();
      await expect(bubble).toHaveText('Tooltip text');
      if (i % 2) await page.keyboard.press('Escape');
      else await page.mouse.move(1200, 20);
      await expect(page.locator('#tt')).not.toHaveAttribute('visible', '');
      await expect.poll(() => isPerceivable(bubble)).toBe(false);
      await page.mouse.move(1200, 20);
    }
  });

  test('shows on focus and describes its trigger', async ({ page }) => {
    await page.locator('#tt-t').focus();
    await expect(page.locator('#tt [role=tooltip]')).toBeVisible();
    const id = await page.locator('#tt [role=tooltip]').getAttribute('id');
    await expect(page.locator('#tt-t')).toHaveAttribute('aria-describedby', id!);
    await expect(page.locator('#tt-t')).toHaveAccessibleDescription('Tooltip text');
    await page.locator('#after').focus();
    await expect(page.locator('#tt')).not.toHaveAttribute('visible', '');
  });
});

test.describe('toast', () => {
  const show = (page: Page, opts: object) =>
    page.evaluate((o) => {
      (customElements.get('void-toast-container') as any).show(o);
    }, opts);

  test('shows a polite status, auto-dismisses, and an error is an alert', async ({ page }) => {
    await show(page, { message: 'Saved', heading: 'OK', duration: 300 });
    await show(page, { message: 'Failed', color: 'error', duration: 0 });
    await expect(page.locator('void-toast', { hasText: 'Saved' })).toHaveAttribute('role', 'status');
    await expect(page.locator('void-toast', { hasText: 'Failed' })).toHaveAttribute('role', 'alert');
    expect(await isPerceivable(page.locator('void-toast', { hasText: 'Saved' }))).toBe(true);
    await expect(page.locator('void-toast', { hasText: 'Saved' })).toHaveCount(0);
    await expect(page.locator('void-toast', { hasText: 'Failed' })).toHaveCount(1);
    await page.locator('void-toast', { hasText: 'Failed' }).getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('void-toast')).toHaveCount(0);
  });

  test('hovering pauses the timer and leaving resumes it', async ({ page }) => {
    // Long enough that the hover always lands first: Playwright waits for the
    // entrance animation to finish before it hovers.
    await show(page, { message: 'Hover pause', duration: 1500 });
    const toast = page.locator('void-toast');
    await toast.hover();
    // Hold well past the whole duration, measured by the page's own clock.
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));
    await expect(toast).toHaveCount(1);
    await page.mouse.move(10, 10);
    await expect(toast).toHaveCount(0);
  });
});
