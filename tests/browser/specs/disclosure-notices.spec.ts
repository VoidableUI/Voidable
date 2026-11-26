// SPDX-License-Identifier: MIT
//
// Collapsible, panel, banner, toast and error-fallback written with explicit
// parts (#52): the author's elements are the final DOM and are never moved,
// keyboard and accessibility-tree behaviour, the toast() helper building the
// same parts an author writes, a server-rendered toast, timers, stacking, and
// the layout before and after the script loads.
import { test, expect, load, settle, isPerceivable, type Page } from '../helpers/test';

test.describe('disclosure and notices', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/disclosure-notices');
  });

  /** Every element under `selector`, as a tag plus position list, and a way to compare node identity. */
  const mark = (page: Page, selector: string) =>
    page.evaluate((sel) => {
      const els = [...document.querySelector(sel)!.querySelectorAll('*')];
      (window as any).__marked = els;
      return els.map((e) => e.localName);
    }, selector);
  const sameNodes = (page: Page, selector: string) =>
    page.evaluate((sel) => {
      const now = [...document.querySelector(sel)!.querySelectorAll('*')];
      const before: Element[] = (window as any).__marked;
      return now.length === before.length && now.every((e, i) => e === before[i]);
    }, selector);

  test.describe('collapsible', () => {
    test('opens and closes with the keyboard, and names its button and region', async ({ page }) => {
      const trigger = page.getByRole('button', { name: 'Shipping details' });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#co1 void-collapsible-content')).toBeHidden();
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await expect(trigger).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#co1')).toHaveAttribute('open', '');
      await expect(page.getByRole('region', { name: 'Shipping details' })).toBeVisible();
      await page.keyboard.press('Space');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#co1 void-collapsible-content')).toBeHidden();
    });

    test('moves no node, keeps the author ids, and fires void-open and void-close', async ({ page }) => {
      const tags = await mark(page, '#co1');
      expect(tags).toEqual(['void-collapsible-trigger', 'void-collapsible-content', 'p', 'a']);
      await page.evaluate(() => {
        (window as any).__toggles = [];
        const co = document.getElementById('co1')!;
        for (const type of ['void-open', 'void-close']) {
          co.addEventListener(type, (e) => (window as any).__toggles.push(`${type}:${(e as CustomEvent).detail.reason}`));
        }
      });
      await page.getByRole('button', { name: 'Shipping details' }).click();
      await page.getByRole('button', { name: 'Shipping details' }).click();
      expect(await sameNodes(page, '#co1')).toBe(true);
      expect(await page.evaluate(() => (window as any).__toggles)).toEqual(['void-open:trigger', 'void-close:trigger']);
      const ids = await page.evaluate(() => {
        const c = document.getElementById('co1')!;
        const t = c.querySelector('void-collapsible-trigger')!;
        const b = c.querySelector('void-collapsible-content')!;
        return { controls: t.getAttribute('aria-controls') === b.id, labelledby: b.getAttribute('aria-labelledby') === t.id };
      });
      expect(ids).toEqual({ controls: true, labelledby: true });
    });

    test('a link inside the open content keeps its own keys', async ({ page }) => {
      await page.getByRole('button', { name: 'Shipping details' }).click();
      await page.locator('#co1-link').focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#ship$/);
      await expect(page.getByRole('button', { name: 'Shipping details' })).toHaveAttribute('aria-expanded', 'true');
    });

    test('a collapsible rendered open is open, and a disabled one cannot be toggled', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Already open' })).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#co-open void-collapsible-content')).toBeVisible();
      const disabled = page.getByRole('button', { name: 'Disabled one' });
      await expect(disabled).toHaveAttribute('aria-disabled', 'true');
      await disabled.click({ force: true });
      await expect(page.locator('#co-dis')).not.toHaveAttribute('open', '');
      await expect(page.locator('#co-dis void-collapsible-content')).toBeHidden();
    });
  });

  test.describe('panel', () => {
    test('is a region named by its title part, and the parts stay put', async ({ page }) => {
      await expect(page.getByRole('region', { name: 'Preferences' })).toBeVisible();
      expect(await page.evaluate(() => document.getElementById('pn')!.hasAttribute('aria-label'))).toBe(false);
      const tags = await mark(page, '#pn');
      expect(tags).toEqual(['void-panel-header', 'void-panel-title', 'void-panel-description', 'void-panel-body', 'p']);
      await page.evaluate(() => {
        const t = document.querySelector('#pn void-panel-title')!;
        t.textContent = 'Alerts';
      });
      await expect(page.getByRole('region', { name: 'Alerts' })).toBeVisible();
      expect(await sameNodes(page, '#pn')).toBe(true);
    });

    test('a panel without a title is an unnamed region and takes no name from nowhere', async ({ page }) => {
      expect(await page.evaluate(() => document.getElementById('pn-bare')!.hasAttribute('aria-labelledby'))).toBe(false);
    });
  });

  test.describe('banner', () => {
    test('is dismissed by the control in its close part, by keyboard, and fires void-close', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).__closed = 0;
        // void-close does not bubble: listen in the capture phase.
        document.addEventListener('void-close', (e) => {
          if ((e.target as Element).id === 'bn1' && (e as CustomEvent).detail?.reason === 'close-button') (window as any).__closed++;
        }, true);
      });
      expect(await mark(page, '#bn1')).toEqual(['void-banner-title', 'void-banner-description', 'void-banner-actions', 'void-button', 'void-banner-close', 'button']);
      await page.locator('#bn1-act').focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('#bn1-close')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#bn1')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__closed)).toBe(1);
    });

    test('without a close part there is no dismiss control', async ({ page }) => {
      await expect(page.locator('#bn2 button')).toHaveCount(0);
      await page.locator('#bn2').click();
      await expect(page.locator('#bn2')).toHaveCount(1);
    });
  });

  test.describe('alert', () => {
    test('has no shadow root, and its parts and author button are the whole DOM', async ({ page }) => {
      expect(await page.evaluate(() => document.getElementById('al1')!.shadowRoot)).toBeNull();
      expect(await mark(page, '#al1')).toEqual(['void-alert-title', 'void-alert-description', 'void-alert-close', 'button']);
      await expect(page.locator('#al1')).toHaveAttribute('role', 'status');
      await expect(page.locator('#al1')).not.toHaveAttribute('dismissible');
    });

    test('is dismissed by mouse, Enter and Space, each firing exactly one void-close', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).__closed = [];
        document.addEventListener('void-close', (e) => (window as any).__closed.push((e.target as Element).id), true);
        document.addEventListener('void-dismiss', () => (window as any).__closed.push('void-dismiss'));
      });
      await page.locator('#al1-close').click();
      await expect(page.locator('#al1')).toHaveCount(0);
      await page.locator('#al3-close').focus();
      await page.keyboard.press('Space');
      await expect(page.locator('#al3')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__closed)).toEqual(['al1', 'al3']);
      await page.evaluate(() => {
        document.getElementById('before')!.insertAdjacentHTML('afterend', '<void-alert id="al4"><void-alert-description>New</void-alert-description><void-alert-close><button type="button" id="al4-close" aria-label="Dismiss">x</button></void-alert-close></void-alert>');
      });
      await page.locator('#al4-close').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#al4')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__closed)).toEqual(['al1', 'al3', 'al4']);
    });

    test('focus moves to the next focusable element when the dismissed alert held it', async ({ page }) => {
      await page.locator('#al1-close').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#al1')).toHaveCount(0);
      // The next focusable element after the alert in the document: the second alert's close button.
      await expect(page.locator('#al3-close')).toBeFocused();
    });

    test('a dismissal that did not involve focus leaves focus where it was', async ({ page }) => {
      await page.locator('#before').focus();
      await page.evaluate(() => document.getElementById('al1-close')!.click());
      await expect(page.locator('#al1')).toHaveCount(0);
      await expect(page.locator('#before')).toBeFocused();
    });

    test('the same holds for a banner: focus moves on when it closes', async ({ page }) => {
      await page.locator('#bn1-close').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#bn1')).toHaveCount(0);
      await expect(page.locator('#al1-close')).toBeFocused();
    });

    test('without a close part there is no dismiss control', async ({ page }) => {
      await expect(page.locator('#al2 button')).toHaveCount(0);
      await page.locator('#al2').click();
      await expect(page.locator('#al2')).toHaveCount(1);
    });

    test('the close control sits in the top corner, inside the alert, and is named', async ({ page }) => {
      const box = await page.evaluate(() => {
        const a = document.getElementById('al1')!.getBoundingClientRect();
        const b = document.getElementById('al1-close')!.getBoundingClientRect();
        return { top: b.top - a.top, right: a.right - b.right, w: b.width };
      });
      expect(box.w).toBeGreaterThan(15);
      expect(box.top).toBeGreaterThan(0);
      expect(box.top).toBeLessThan(24);
      expect(box.right).toBeGreaterThan(0);
      await expect(page.getByRole('button', { name: 'Dismiss' }).first()).toBeVisible();
    });
  });

  test.describe('error fallback', () => {
    test('writes its built-in default when no part is written, and fires void-retry from its button', async ({ page }) => {
      await expect(page.locator('#ef1 void-error-fallback-title')).toHaveText('Something went wrong');
      await expect(page.locator('#ef2 void-error-fallback-title')).toHaveText('Could not load');
      await expect(page.locator('#ef2 void-error-fallback-description')).toHaveText('Check your connection.');
      await expect(page.locator('#ef2').getByRole('button', { name: 'Reconnect' })).toBeVisible();
      await page.evaluate(() => {
        (window as any).__retries = 0;
        document.addEventListener('void-retry', () => (window as any).__retries++);
      });
      await page.locator('#ef2').getByRole('button', { name: 'Reconnect' }).click();
      expect(await page.evaluate(() => (window as any).__retries)).toBe(1);
      await expect(page.locator('#ef2')).toHaveAttribute('role', 'alert');
    });

    test('the author parts replace the default, are never moved, and their buttons are their own', async ({ page }) => {
      expect(await mark(page, '#ef3')).toEqual(['void-error-fallback-title', 'void-error-fallback-description', 'void-error-fallback-actions', 'button']);
      await expect(page.locator('#ef3 [data-void-default]')).toHaveCount(0);
      await page.locator('#ef3-btn').click();
      expect(await page.evaluate(() => (window as any).__retries ?? 0)).toBe(0);
      expect(await sameNodes(page, '#ef3')).toBe(true);
    });

    test('the default is written back when the author removes their parts, and removed when they add one', async ({ page }) => {
      await page.evaluate(() => {
        const ef = document.getElementById('ef3')!;
        for (const c of [...ef.children]) c.remove();
      });
      await expect(page.locator('#ef3 void-error-fallback-title')).toHaveText('Something went wrong');
      await page.evaluate(() => {
        const t = document.createElement('void-error-fallback-title');
        t.id = 'late';
        t.textContent = 'Late';
        document.getElementById('ef3')!.append(t);
      });
      await expect(page.locator('#ef3 [data-void-default]')).toHaveCount(0);
      await expect(page.locator('#ef3 #late')).toHaveText('Late');
    });
  });

  test.describe('toast', () => {
    test('a server-rendered toast in the container works with no script-built structure', async ({ page }) => {
      expect(await mark(page, '#t-server')).toEqual(['void-toast-title', 'void-toast-description', 'void-toast-close', 'button']);
      await expect(page.locator('#t-server')).toHaveAttribute('role', 'group');
      await expect(page.locator('#t-alert')).toHaveAttribute('role', 'group');
      const container = page.locator('#flash');
      // The container is not itself live: its two hidden announcers are, and they speak for the toasts.
      await expect(container).not.toHaveAttribute('aria-live', /.+/);
      await expect(container.locator('[role=status]')).toHaveText('Saved. Your changes were saved.');
      await expect(container.locator('[role=alert]')).toContainText('Upload failed.');
      await expect(container).toHaveAttribute('aria-label', 'Notifications');
      const tree = await container.ariaSnapshot();
      expect(tree).toContain('Saved');
      expect(tree).toContain('Your changes were saved.');
      expect(tree).toContain('Upload failed.');
      expect(tree).toMatch(/button "Dismiss"/);
      expect(await isPerceivable(page.locator('#t-server'))).toBe(true);
      await page.locator('#t-server').getByRole('button', { name: 'Dismiss' }).click();
      await expect(page.locator('#t-server')).toHaveCount(0);
      await expect(page.locator('#t-alert void-toast-actions void-button')).toHaveCount(1);
      await expect(page.locator('#t-alert button')).toHaveCount(0);
    });

    test('the announcers are in the accessibility tree before the first toast, and the text arrives after it', async ({ page }) => {
      await load(page, '/sr-notices');
      // Empty, the container is rendered (not display:none) and holds its two announcers, both empty.
      await expect(page.getByRole('region', { name: 'Notifications' })).toHaveCount(1);
      const before = await page.evaluate(() => {
        const c = document.getElementById('flash')!;
        const info = (s: string) => {
          const el = c.shadowRoot!.querySelector(s)!;
          return [el.getAttribute('aria-live'), el.getAttribute('aria-atomic'), el.textContent];
        };
        return { display: getComputedStyle(c).display, toasts: c.querySelectorAll(':scope > void-toast').length, polite: info('[role=status]'), assertive: info('[role=alert]') };
      });
      expect(before.display).not.toBe('none');
      expect(before.toasts).toBe(0);
      expect(before.polite).toEqual(['polite', 'true', '']);
      expect(before.assertive).toEqual(['assertive', 'true', '']);
      // When the toast is inserted the announcer already exists and is still empty; its text comes on a later task.
      const atInsert = await page.evaluate(
        () =>
          new Promise<{ rendered: boolean; text: string }>((resolve) => {
            const c = document.getElementById('flash')!;
            const mo = new MutationObserver(() => {
              mo.disconnect();
              resolve({ rendered: getComputedStyle(c).display !== 'none', text: c.shadowRoot!.querySelector('[role=status]')!.textContent ?? '' });
            });
            mo.observe(c, { childList: true });
            (window as any).VoidUI.toast({ description: 'Changes saved', duration: 0 });
          }),
      );
      expect(atInsert).toEqual({ rendered: true, text: '' });
      await expect(page.getByRole('status')).toHaveText('Changes saved');
      // The visible toast is a group, not a second live region.
      await expect(page.locator('#flash > void-toast')).toHaveAttribute('role', 'group');
      // The same message again is written again: cleared first, then set.
      const seen = await page.evaluate(
        () =>
          new Promise<string[]>((resolve) => {
            const region = document.getElementById('flash')!.shadowRoot!.querySelector('[role=status]')!;
            const log: string[] = [];
            new MutationObserver(() => log.push(region.textContent ?? '')).observe(region, { childList: true });
            (window as any).VoidUI.toast({ description: 'Changes saved', duration: 0 });
            setTimeout(() => resolve(log), 600);
          }),
      );
      expect(seen).toEqual(['', 'Changes saved']);
      // Emptied again, it leaves the top layer but stays rendered.
      await page.evaluate(() => document.querySelectorAll('#flash > void-toast').forEach((t) => t.remove()));
      await expect.poll(() => page.evaluate(() => document.getElementById('flash')!.matches(':popover-open'))).toBe(false);
      expect(await page.evaluate(() => getComputedStyle(document.getElementById('flash')!).display)).not.toBe('none');
      await expect(page.getByRole('region', { name: 'Notifications' })).toHaveCount(1);
    });

    test('toast() writes the parts an author would write', async ({ page }) => {
      const built = await page.evaluate(() => {
        const toast = (window as any).VoidUI.toast as (o: object) => HTMLElement;
        const t = toast({ title: 'Saved', description: 'Your changes were saved.', color: 'success', duration: 0, actions: [{ label: 'Undo' }] });
        const shape = (el: Element): unknown => ({ tag: el.localName, attrs: el.localName === 'void-toast' ? [] : [...el.attributes].map((a) => a.name).filter((n) => !/^(id|role|tabindex)$/.test(n)).sort(), kids: [...el.children].map(shape) });
        return { shape: shape(t), text: t.textContent };
      });
      expect(built.shape).toEqual({
        tag: 'void-toast',
        attrs: [],
        kids: [
          { tag: 'void-toast-title', attrs: [], kids: [] },
          { tag: 'void-toast-description', attrs: [], kids: [] },
          { tag: 'void-toast-actions', attrs: [], kids: [{ tag: 'void-button', attrs: ['size'], kids: [] }] },
          { tag: 'void-toast-close', attrs: [], kids: [{ tag: 'button', attrs: ['aria-label', 'type'], kids: [] }] },
        ],
      });
      // The same markup an author writes gives the same accessibility tree.
      const tree = await page.locator('#flash void-toast', { hasText: 'Your changes were saved.' }).last().ariaSnapshot();
      expect(tree).toContain('Saved');
      expect(tree).toContain('button "Undo"');
      expect(tree).toContain('button "Dismiss"');
    });

    test('toast() text is text, an action runs and the close part dismisses it', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).__undo = 0;
        (window as any).VoidUI.toast({ title: '<b>x</b>', description: '<img src=x onerror="window.__xss=1">', duration: 0, actions: [{ label: 'Undo', onClick: () => (window as any).__undo++ }] });
      });
      const t = page.locator('void-toast', { hasText: 'Undo' });
      await expect(t.locator('b, img')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
      await t.getByRole('button', { name: 'Undo' }).click();
      expect(await page.evaluate(() => (window as any).__undo)).toBe(1);
      await expect(t).toHaveCount(1);
      await t.getByRole('button', { name: 'Dismiss' }).click();
      await expect(t).toHaveCount(0);
    });

    test('a toast with no close part has no button, and still closes by its timer', async ({ page }) => {
      await page.evaluate(() => (window as any).VoidUI.toast({ description: 'Gone soon', duration: 800, dismissable: false }));
      const t = page.locator('void-toast', { hasText: 'Gone soon' });
      await expect(t).toHaveCount(1);
      await expect(t.locator('button')).toHaveCount(0);
      await expect(t).toHaveCount(0);
    });

    test('toasts stack in order, the container is in the top layer only while it holds a toast', async ({ page }) => {
      await page.evaluate(() => {
        const toast = (window as any).VoidUI.toast;
        toast({ description: 'First stacked', duration: 0 });
        toast({ description: 'Second stacked', duration: 0 });
      });
      const order = await page.evaluate(() => [...document.querySelectorAll('#flash > void-toast void-toast-description')].map((t) => t.textContent));
      expect(order.slice(-2)).toEqual(['First stacked', 'Second stacked']);
      const boxes = await page.evaluate(() => [...document.querySelectorAll('#flash > void-toast')].map((t) => t.getBoundingClientRect().top));
      expect(boxes).toEqual([...boxes].sort((a, b) => a - b));
      expect(await page.evaluate(() => document.getElementById('flash')!.matches(':popover-open'))).toBe(true);
      await page.evaluate(() => document.querySelectorAll('#flash > void-toast').forEach((t) => t.remove()));
      await expect.poll(() => page.evaluate(() => document.getElementById('flash')!.matches(':popover-open'))).toBe(false);
    });

    test('hovering pauses the timer and leaving resumes it; focus inside pauses it too', async ({ page }) => {
      await page.evaluate(() => {
        document.querySelectorAll('#flash > void-toast').forEach((t) => t.remove());
        (window as any).VoidUI.toast({ description: 'Timer toast', duration: 1500 });
      });
      const t = page.locator('void-toast', { hasText: 'Timer toast' });
      await t.hover();
      await page.evaluate(() => new Promise((r) => setTimeout(r, 2200)));
      await expect(t).toHaveCount(1);
      await page.mouse.move(5, 5);
      await expect(t).toHaveCount(0);

      await page.evaluate(() => (window as any).VoidUI.toast({ description: 'Focus toast', duration: 1200 }));
      const f = page.locator('void-toast', { hasText: 'Focus toast' });
      await f.getByRole('button', { name: 'Dismiss' }).focus();
      await page.evaluate(() => new Promise((r) => setTimeout(r, 1800)));
      await expect(f).toHaveCount(1);
      await page.locator('#after').focus();
      await expect(f).toHaveCount(0);
    });

    test('a toast added while a modal dialog is open is shown above it', async ({ page }) => {
      await page.evaluate(() => {
        document.body.insertAdjacentHTML('beforeend', '<void-dialog id="dlg" open><void-dialog-title>Modal</void-dialog-title><void-dialog-body>x</void-dialog-body></void-dialog>');
      });
      await expect(page.locator('#dlg')).toHaveAttribute('open', '');
      await settle(page);
      await page.evaluate(() => (window as any).VoidUI.toast({ description: 'Over the dialog', duration: 0 }));
      const t = page.locator('void-toast', { hasText: 'Over the dialog' });
      await expect(t).toBeVisible();
      // The page outside a modal is inert, so a hit test is no use; look at the pixels instead. A toast under the
      // dialog's backdrop would be dimmed, so its background must look the same once the dialog is gone.
      const box = (await t.boundingBox())!;
      const clip = { x: box.x + 4, y: box.y + box.height - 8, width: 6, height: 4 };
      const withDialog = await page.screenshot({ clip });
      await page.evaluate(() => ((document.getElementById('dlg') as any).open = false));
      await expect(page.locator('#dlg')).not.toHaveAttribute('open', '');
      await page.waitForTimeout(400);
      const without = await page.screenshot({ clip });
      expect(withDialog.equals(without), 'the toast is dimmed by the dialog backdrop').toBe(true);
    });
  });
});

test.describe('layout before the script loads', () => {
  for (const id of ['co1', 'co-open', 'pn', 'bn1', 'bn2', 'al1', 'al2', 'ef3', 't-server']) {
    test(`#${id} does not shift when it upgrades`, async ({ page }) => {
      // Hold the component script back, measure the layout, then let it in.
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      await page.route('**/build/ui.js', async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto('/disclosure-notices', { waitUntil: 'commit' });
      await page.waitForSelector('#after', { state: 'attached' });
      const measure = () =>
        page.evaluate((i) => {
          const r = document.getElementById(i)!.getBoundingClientRect();
          return { top: Math.round(r.top + scrollY), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
        }, id);
      const before = await measure();
      // Every element under the component, to be the same nodes after the upgrade.
      await page.evaluate((i) => ((window as any).__nodes = [...document.getElementById(i)!.querySelectorAll('*')]), id);
      release();
      await page.waitForFunction(() => !!customElements.get('void-banner') && !!customElements.get('void-toast'));
      await settle(page);
      const after = await measure();
      expect(
        await page.evaluate((i) => {
          const now = [...document.getElementById(i)!.querySelectorAll('*')];
          const was: Element[] = (window as any).__nodes;
          return now.length === was.length && now.every((e, k) => e === was[k]);
        }, id),
        `${id}: the author's nodes are the same after the upgrade`,
      ).toBe(true);
      // Within a pixel: the same box before and after.
      expect(Math.abs(after.height - before.height), `${id} height ${before.height} -> ${after.height}`).toBeLessThanOrEqual(1);
      expect(Math.abs(after.width - before.width), `${id} width`).toBeLessThanOrEqual(1);
      expect(Math.abs(after.top - before.top), `${id} top`).toBeLessThanOrEqual(1);
    });
  }
});
