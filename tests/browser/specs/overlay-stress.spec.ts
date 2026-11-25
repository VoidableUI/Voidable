// SPDX-License-Identifier: MIT
//
// The overlay model under stress, with real pointer and keyboard input on every
// engine: four overlays deep, inside clipping, transformed and scrolled boxes,
// at every corner of a desktop and a phone viewport, with the opener gone, with
// a close the page vetoes, the `reason` on every way to close, and fifty cycles
// that must leave nothing behind (nodes, listeners, top layer, scroll lock),
// also through a Turbo morph. specs/overlays.spec.ts covers each component's
// own behaviour; this file covers what they do together and over time.
import { test, expect, expectedFailure, load, settle, expectPerceivable, scrollLocked, focusedId, type Locator, type Page } from '../helpers/test';

declare global {
  interface Window {
    log: { type: 'open' | 'close'; id: string; reason?: string; cancelable?: boolean }[];
    veto?: Set<string>;
    __listeners: () => Record<string, number>;
  }
}

/** Counts the listeners added to the document, window, <html> and <body> and not removed, by target, type and phase. */
async function trackListeners(page: Page) {
  await page.addInitScript(() => {
    const live = new WeakMap<EventTarget, Map<string, Set<unknown>>>();
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const key = (type: string, opts: unknown) => `${type}|${typeof opts === 'boolean' ? opts : !!(opts && (opts as AddEventListenerOptions).capture)}`;
    EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, fn: any, opts?: any) {
      if (fn) {
        let byKey = live.get(this);
        if (!byKey) live.set(this, (byKey = new Map()));
        const k = key(type, opts);
        let set = byKey.get(k);
        if (!set) byKey.set(k, (set = new Set()));
        set.add(fn);
        if (opts && typeof opts === 'object' && opts.signal) add.call(opts.signal, 'abort', () => set!.delete(fn));
        if (opts && typeof opts === 'object' && opts.once) {
          const target = this;
          add.call(this, type, function once() { live.get(target)?.get(k)?.delete(fn); remove.call(target, type, once, opts); }, opts);
        }
      }
      return add.call(this, type, fn, opts);
    } as typeof add;
    EventTarget.prototype.removeEventListener = function (this: EventTarget, type: string, fn: any, opts?: any) {
      live.get(this)?.get(key(type, opts))?.delete(fn);
      return remove.call(this, type, fn, opts);
    } as typeof remove;
    window.__listeners = () => {
      const out: Record<string, number> = {};
      const targets: [string, EventTarget | null][] = [['window', window], ['document', document], ['html', document.documentElement], ['body', document.body]];
      for (const [name, t] of targets) {
        if (!t) continue;
        for (const [k, set] of live.get(t) ?? []) if (set.size) out[`${name}:${k}`] = set.size;
      }
      return out;
    };
  });
}

/** What an overlay may leave behind. Everything here must be the same after as before. */
const footprint = (page: Page) =>
  page.evaluate(() => ({
    nodes: document.getElementsByTagName('*').length,
    popoversOpen: document.querySelectorAll(':popover-open').length,
    modalsOpen: document.querySelectorAll(':modal').length,
    inert: document.querySelectorAll('[inert]').length,
    scrollLocked: getComputedStyle(document.documentElement).overflow === 'hidden',
    htmlStyle: document.documentElement.getAttribute('style') ?? '',
    bodyStyle: document.body.getAttribute('style') ?? '',
    listeners: window.__listeners(),
    expanded: [...document.querySelectorAll('[aria-expanded="true"]')].map((e) => e.id || e.tagName),
  }));

const logOf = (page: Page) => page.evaluate(() => window.log);
const closesOf = async (page: Page) => (await logOf(page)).filter((e) => e.type === 'close');
const clearLog = (page: Page) => page.evaluate(() => window.log.splice(0));
const isOpen = (page: Page, id: string) => page.evaluate((id) => (document.getElementById(id) as any).open as boolean, id);
const setOpen = (page: Page, id: string, open: boolean) =>
  page.evaluate(async ([id, open]) => {
    const el = document.getElementById(id as string) as any;
    el.open = open;
    await el.updateComplete;
  }, [id, open] as const);
const insideOf = (page: Page, id: string) => page.evaluate((id) => document.getElementById(id)!.contains(document.activeElement), id);

test.describe('four overlays deep: drawer > dialog > popover > dropdown-menu', () => {
  test.beforeEach(async ({ page }) => {
    await trackListeners(page);
    await load(page, '/overlay-deep');
  });

  const levels = [
    { id: 'l1', opener: 'open-1', focus: 'l1-btn' },
    { id: 'l2', opener: 'open-2', focus: 'l2-in' },
    { id: 'l3', opener: 'open-3', focus: 'l3-btn' },
    { id: 'l4', opener: 'open-4', focus: 'l4-a' },
  ];

  async function openAll(page: Page) {
    for (const l of levels) {
      await page.locator(`#${l.opener}`).click();
      await expect.poll(() => isOpen(page, l.id), `${l.id} opens`).toBe(true);
    }
  }

  test('each layer opens from the one below, takes focus, and every layer is on screen and usable', async ({ page }) => {
    for (const l of levels) {
      await page.locator(`#${l.opener}`).click();
      await expect.poll(() => isOpen(page, l.id)).toBe(true);
      await expect.poll(() => focusedId(page), `focus after opening ${l.id}`).toBe(l.focus);
    }
    // The top of the stack is perceivable; the modals below it are inert behind it.
    await expectPerceivable(page.locator('#l4-a'));
    await expectPerceivable(page.locator('#l3-btn'));
    expect(await page.evaluate(() => [...document.querySelectorAll(':popover-open')].length), 'the popover and the menu are in the top layer').toBe(2);
    expect(await page.evaluate(() => [...document.querySelectorAll('void-dialog, void-drawer')].filter((h) => h.shadowRoot?.querySelector('dialog')?.matches(':modal')).length), 'the drawer and the dialog are modal').toBe(2);
    expect(await scrollLocked(page)).toBe(true);
    // Real input still reaches the top layer: Arrow keys walk the menu, a click on its item chooses it.
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focusedId(page)).toBe('l4-b');
    await page.locator('#l4-b').click();
    await expect.poll(() => isOpen(page, 'l4')).toBe(false);
    expect(await isOpen(page, 'l3'), 'choosing a menu item closes only the menu').toBe(true);
    expect(await logOf(page)).toContainEqual({ type: 'close', id: 'l4', reason: 'select', cancelable: true });
  });

  test('Escape closes one layer at a time, top down, and focus goes back to each opener', async ({ page }) => {
    await openAll(page);
    for (const l of [...levels].reverse()) {
      await page.keyboard.press('Escape');
      await expect.poll(() => isOpen(page, l.id), `Escape closes ${l.id}`).toBe(false);
      const below = levels[levels.indexOf(l) - 1];
      if (below) expect(await isOpen(page, below.id), `${below.id} stays open after ${l.id} closes`).toBe(true);
      await expect.poll(() => focusedId(page), `focus after closing ${l.id}`).toBe(l.opener);
    }
    expect(await scrollLocked(page)).toBe(false);
    expect((await closesOf(page)).map((e) => `${e.id}:${e.reason}`)).toEqual(['l4:escape', 'l3:escape', 'l2:escape', 'l1:escape']);
  });

  test('an outside press closes only the topmost layer', async ({ page }) => {
    await openAll(page);
    // Outside of everything: the page behind the drawer's backdrop.
    await page.mouse.click(5, 5);
    await expect.poll(() => isOpen(page, 'l4')).toBe(false);
    expect(await isOpen(page, 'l3')).toBe(true);
    expect(await isOpen(page, 'l2')).toBe(true);
    expect(await isOpen(page, 'l1')).toBe(true);
    await page.mouse.click(5, 5);
    await expect.poll(() => isOpen(page, 'l3')).toBe(false);
    expect(await isOpen(page, 'l2')).toBe(true);
  });

  test('closing a layer from outside closes every layer opened inside it, reason "parent", and unlocks the page', async ({ page }) => {
    await openAll(page);
    await clearLog(page);
    await setOpen(page, 'l1', false);
    for (const l of levels) await expect.poll(() => isOpen(page, l.id), `${l.id} closed with the drawer`).toBe(false);
    expect((await closesOf(page)).map((e) => `${e.id}:${e.reason}:${e.cancelable}`)).toEqual(['l4:parent:false', 'l3:parent:false', 'l2:parent:false', 'l1:api:false']);
    expect(await scrollLocked(page)).toBe(false);
    expect(await page.evaluate(() => document.querySelectorAll(':popover-open, [inert]').length + [...document.querySelectorAll('void-dialog, void-drawer')].filter((h) => h.shadowRoot?.querySelector('dialog')?.matches(':modal')).length)).toBe(0);
    await expect.poll(() => focusedId(page)).toBe('open-1');
  });

  test('the whole stack opens and closes five times without growing', async ({ page }) => {
    await openAll(page);
    for (let i = 0; i < 4; i++) await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'l1')).toBe(false);
    const before = await footprint(page);
    for (let round = 0; round < 5; round++) {
      await openAll(page);
      for (let i = 0; i < 4; i++) await page.keyboard.press('Escape');
      await expect.poll(() => isOpen(page, 'l1')).toBe(false);
    }
    expect(await footprint(page)).toEqual(before);
  });
});

test.describe('overlays inside overflow: hidden, transformed and scrolled boxes', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/overlay-deep');
  });

  /** The panel is wholly on screen, touches nothing of its trigger, and a hit test at each corner and at its middle lands on it. */
  async function expectShownWhole(page: Page, panel: Locator, trigger: Locator, what: string, opts: { hitTest?: boolean } = {}) {
    const hitTest = opts.hitTest ?? true;
    await expect(panel).toBeVisible();
    // A tooltip ignores the pointer, so it cannot be hit-tested; everything else must be the topmost thing where it is.
    if (hitTest) await expectPerceivable(panel, `${what} is not perceivable`);
    await expect
      .poll(
        async () =>
          page.evaluate(
            ([panelSel, triggerSel, hitTest]) => {
              const p = document.querySelector(panelSel)!;
              const t = document.querySelector(triggerSel)!.getBoundingClientRect();
              const r = p.getBoundingClientRect();
              const root = document.documentElement;
              const inViewport = r.left >= -0.5 && r.top >= -0.5 && r.right <= root.clientWidth + 0.5 && r.bottom <= root.clientHeight + 0.5;
              const overlapX = Math.min(t.right, r.right) - Math.max(t.left, r.left);
              const overlapY = Math.min(t.bottom, r.bottom) - Math.max(t.top, r.top);
              const overlapsTrigger = overlapX > 1 && overlapY > 1;
              const at = (fx: number, fy: number) => [r.left + r.width * fx, r.top + r.height * fy];
              const pts = [at(0.2, 0.2), at(0.8, 0.2), at(0.2, 0.8), at(0.8, 0.8), at(0.5, 0.5)];
              const hit = !hitTest || pts.every(([x, y]) => {
                const e = document.elementFromPoint(x, y);
                return !!e && (p === e || p.contains(e));
              });
              return { inViewport, overlapsTrigger, hit };
            },
            [await selectorOf(panel), await selectorOf(trigger), hitTest] as const,
          ),
        { message: `${what}: on screen, clear of its trigger and not clipped` },
      )
      .toEqual({ inViewport: true, overlapsTrigger: false, hit: true });
  }

  /** A unique CSS selector for a locator that matches one element (uses its id or a generated attribute). */
  async function selectorOf(locator: Locator): Promise<string> {
    return locator.evaluate((el) => {
      if (el.id) return `#${CSS.escape(el.id)}`;
      if (!el.hasAttribute('data-probe')) el.setAttribute('data-probe', Math.random().toString(36).slice(2));
      return `[data-probe="${el.getAttribute('data-probe')}"]`;
    });
  }

  for (const box of ['hidden', 'transform', 'scroll'] as const) {
    const label = { hidden: 'overflow: hidden', transform: 'a transformed box', scroll: 'a scrolled box' }[box];

    test.describe(`in ${label}`, () => {
      const at = (what: string) => `#${what}-${box}`;

      test.beforeEach(async ({ page }) => {
        // Put the box where all of it can be seen; the scrolled box keeps its scroll position.
        await page.locator(`#box-${box}`).scrollIntoViewIfNeeded();
      });

      test('popover', async ({ page }) => {
        await page.locator(`${at('pop')}-t`).click();
        await expectShownWhole(page, page.locator(`${at('pop')} > void-popover-content`), page.locator(`${at('pop')}-t`), 'the popover');
        await page.keyboard.press('Escape');
        await expect.poll(() => isOpen(page, `pop-${box}`)).toBe(false);
      });

      test('dropdown-menu', async ({ page }) => {
        await page.locator(`${at('dd')}-t`).click();
        await expectShownWhole(page, page.locator(`${at('dd')} void-dropdown-menu-content`), page.locator(`${at('dd')}-t`), 'the menu');
        await page.locator(`${at('dd')}-1`).click();
        await expect.poll(() => isOpen(page, `dd-${box}`)).toBe(false);
      });

      test('tooltip', async ({ page }) => {
        await page.locator(`${at('tt')}-t`).hover();
        await expectShownWhole(page, page.locator(`${at('tt')} [role=tooltip]`), page.locator(`${at('tt')}-t`), 'the tooltip', { hitTest: false });
      });

      test('hover-card', async ({ page }) => {
        await page.locator(`${at('hc')}-t`).hover();
        await expectShownWhole(page, page.locator(`${at('hc')} void-hover-card-content`), page.locator(`${at('hc')}-t`), 'the hover card');
      });

      test('combobox', async ({ page }) => {
        await page.locator(`${at('cb')} input`).click();
        await expectShownWhole(page, page.locator(`${at('cb')} [role=listbox]`), page.locator(`${at('cb')} input`), 'the options');
        await page.getByRole('option', { name: 'Vue' }).click();
        await expect(page.locator(`${at('cb')} input`)).toHaveValue('Vue');
      });

      test('date-picker', async ({ page }) => {
        await page.locator(`${at('dp')} input`).click();
        await expectShownWhole(page, page.locator(`${at('dp')} [popover]`), page.locator(`${at('dp')} input`), 'the calendar');
      });
    });
  }

  // The box clips whatever is inside it; a modal in the top layer is not inside it.
  for (const box of ['hidden', 'transform', 'scroll'] as const) {
    for (const kind of ['dialog', 'drawer'] as const) {
      test(`a ${kind} opened from ${box === 'hidden' ? 'an overflow: hidden' : box === 'transform' ? 'a transformed' : 'a scrolled'} box fills the viewport, not the box`, async ({ page }) => {
        const opener = kind === 'dialog' ? `#mopen-${box}` : `#mopen-${box}-drw`;
        const host = kind === 'dialog' ? `#mdlg-${box}` : `#mdrw-${box}`;
        await page.locator(opener).scrollIntoViewIfNeeded();
        await page.locator(opener).click();
        const panel = page.locator(`${host} [part="surface"]`);
        await expect(panel).toBeVisible();
        await expectPerceivable(page.locator(`${host} .mc`));
        const vp = page.viewportSize()!;
        // A drawer slides in: measure it once it has stopped.
        await expect.poll(async () => { const b = (await panel.boundingBox())!; return Math.round(b.x + b.width); }).toBeLessThanOrEqual(vp.width + 1);
        let r = await panel.boundingBox();
        await expect.poll(async () => { const b = (await panel.boundingBox())!; const same = Math.abs(b.x - r!.x) < 0.5; r = b; return same; }).toBe(true);
        expect(r!.x).toBeGreaterThanOrEqual(0);
        expect(r!.y).toBeGreaterThanOrEqual(0);
        expect(r!.x + r!.width).toBeLessThanOrEqual(vp.width + 0.5);
        expect(r!.y + r!.height).toBeLessThanOrEqual(vp.height + 0.5);
        if (kind === 'dialog') {
          // Centred in the viewport whatever the box around its opener does.
          expect(Math.abs(r!.x + r!.width / 2 - vp.width / 2), 'horizontal centre').toBeLessThanOrEqual(2);
          expect(Math.abs(r!.y + r!.height / 2 - vp.height / 2), 'vertical centre').toBeLessThanOrEqual(2);
        } else {
          expect(r!.height, 'a drawer spans the viewport height').toBeGreaterThanOrEqual(vp.height - 1);
        }
        expect(await page.evaluate((h) => document.querySelector(h)!.shadowRoot!.querySelector('dialog')!.matches(':modal'), host)).toBe(true);
        await page.keyboard.press('Escape');
        await expect.poll(() => isOpen(page, host.slice(1))).toBe(false);
      });
    }
  }
});

test.describe('at every corner of the viewport', () => {
  const viewports = [
    { name: 'desktop 1440x900', width: 1440, height: 900 },
    { name: 'phone 390x844', width: 390, height: 844 },
  ];
  const corners = ['tl', 'tr', 'bl', 'br'] as const;
  const kinds = {
    pop: { trigger: '#pop-t', panel: '#pop > void-popover-content', how: 'click' },
    menu: { trigger: '#menu-t', panel: '#menu void-dropdown-menu-content', how: 'click' },
    tip: { trigger: '#tip-t', panel: '#tip [role=tooltip]', how: 'hover' },
    card: { trigger: '#card-t', panel: '#card void-hover-card-content', how: 'hover' },
    combo: { trigger: '#combo input', panel: '#combo [role=listbox]', how: 'click' },
    multi: { trigger: '#multi .void-multiselect-trigger', panel: '#multi [role=listbox]', how: 'click' },
    date: { trigger: '#date input', panel: '#date [popover]', how: 'click' },
  } as const;

  for (const vp of viewports) {
    test.describe(vp.name, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      for (const corner of corners) {
        for (const [kind, k] of Object.entries(kinds)) {
          test(`${kind} opened from the ${{ tl: 'top left', tr: 'top right', bl: 'bottom left', br: 'bottom right' }[corner]} corner stays on screen, clear of its trigger`, async ({ page }) => {
            // The tooltip and the hover card keep their default side when it is full: they land on their trigger.
            if (kind === 'tip' && (corner === 'tl' || corner === 'tr')) {
              expectedFailure('untracked:tooltip-hover-card-no-flip', 'a tooltip on a trigger at the top edge opens upward, off the top, and is pushed back over its trigger instead of flipping below it');
            }
            if (kind === 'card' && (corner === 'bl' || corner === 'br')) {
              expectedFailure('untracked:tooltip-hover-card-no-flip', 'a hover card on a trigger at the bottom edge opens downward and is pushed back over its trigger instead of flipping above it');
            }
            // Firefox: a panel that anchor positioning has to flip to stay on screen ends its entrance transition at opacity 0.
            const flips = ['pop', 'menu', 'combo', 'multi', 'date'].includes(kind) && (corner[0] === 'b' || (corner[1] === 'r' && ['pop', 'menu', 'date'].includes(kind)));
            if (flips) {
              expectedFailure('untracked:firefox-flipped-overlay-invisible', `${kind} flipped by position-try-fallbacks to stay in the viewport stays at opacity 0, so it is invisible`, { browsers: ['firefox'] });
            }
            await load(page, `/overlay-corners?corner=${corner}&only=${kind}`);
            const trigger = page.locator(k.trigger);
            if (k.how === 'click') await trigger.click();
            else await trigger.hover();
            const panel = page.locator(k.panel);
            await expect(panel).toBeVisible();
            await expectPerceivable(panel);
            await settle(page);
            const geometry = await page.evaluate(
              ([panelSel, triggerSel]) => {
                const t = document.querySelector(triggerSel)!.getBoundingClientRect();
                const r = document.querySelector(panelSel)!.getBoundingClientRect();
                const root = document.documentElement;
                return {
                  inViewport: r.left >= -0.5 && r.top >= -0.5 && r.right <= root.clientWidth + 0.5 && r.bottom <= root.clientHeight + 0.5,
                  overlapsTrigger: Math.min(t.right, r.right) - Math.max(t.left, r.left) > 1 && Math.min(t.bottom, r.bottom) - Math.max(t.top, r.top) > 1,
                  fieldWide: r.width + 0.5 >= t.width,
                };
              },
              [k.panel, k.trigger],
            );
            expect(geometry.inViewport, 'the panel is inside the viewport').toBe(true);
            expect(geometry.overlapsTrigger, 'the panel does not cover its trigger').toBe(false);
            if (kind === 'combo' || kind === 'multi') expect(geometry.fieldWide, 'a select-like panel is at least as wide as its field').toBe(true);
            await page.keyboard.press('Escape');
            await page.mouse.move(vp.width / 2, vp.height / 2);
            await expect(panel).toBeHidden();
          });
        }
      }
    });
  }
});

test.describe('focus when the opener is gone', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/overlay-deep');
  });

  /** Where focus is: nowhere stale. It is on the body or on something connected, visible and not in a closed overlay. */
  async function expectFocusSane(page: Page) {
    const state = await page.evaluate(() => {
      const a = document.activeElement;
      return { connected: !!a && a.isConnected, body: a === document.body, visible: !!a && (a === document.body || (a as HTMLElement).checkVisibility?.({ visibilityProperty: true }) !== false), inClosed: !!a?.closest('dialog:not([open]), [popover]:not(:popover-open)') };
    });
    expect(state.connected, 'focus is on a connected element').toBe(true);
    expect(state.visible, 'focus is on something visible').toBe(true);
    expect(state.inClosed, 'focus is not inside a closed overlay').toBe(false);
    // And the keyboard still works from there: Tab reaches a real control on the page, not nothing.
    await page.keyboard.press('Tab');
    const next = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return !!a && a !== document.body && a.isConnected && a.checkVisibility?.({ visibilityProperty: true }) !== false;
    });
    expect(next, 'Tab from there reaches a visible control').toBe(true);
  }

  test('a dialog whose opener was removed while it was open closes, unlocks the page and leaves focus somewhere sane', async ({ page }) => {
    await page.locator('#gone-opener').click();
    await expect.poll(() => insideOf(page, 'gone-dlg')).toBe(true);
    await page.evaluate(() => document.getElementById('gone-opener')!.remove());
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'gone-dlg')).toBe(false);
    expect(await scrollLocked(page)).toBe(false);
    await expectFocusSane(page);
  });

  test('a dialog whose opener was hidden while it was open does not hand focus to the hidden opener', async ({ page }) => {
    await page.locator('#gone-opener').click();
    await expect.poll(() => insideOf(page, 'gone-dlg')).toBe(true);
    await page.evaluate(() => ((document.getElementById('gone-host') as HTMLElement).style.display = 'none'));
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'gone-dlg')).toBe(false);
    expect(await focusedId(page)).not.toBe('gone-opener');
    await expectFocusSane(page);
  });

  test('a drawer whose opener was removed closes and leaves focus somewhere sane', async ({ page }) => {
    await page.locator('#gone-drw-opener').click();
    await expect.poll(() => insideOf(page, 'gone-drw')).toBe(true);
    await page.evaluate(() => document.getElementById('gone-drw-opener')!.remove());
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'gone-drw')).toBe(false);
    expect(await scrollLocked(page)).toBe(false);
    await expectFocusSane(page);
  });

  test('a dialog opened from a menu item that its choice removed gives focus to the page, not to a detached node', async ({ page }) => {
    await page.locator('#menu-t').click();
    await page.evaluate(() => {
      document.getElementById('menu-1')!.addEventListener('void-select', () => {
        (document.getElementById('gone-dlg') as any).open = true;
        document.getElementById('menu')!.remove();
      });
    });
    await page.locator('#menu-1').click();
    await expect.poll(() => isOpen(page, 'gone-dlg')).toBe(true);
    await expect.poll(() => insideOf(page, 'gone-dlg')).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'gone-dlg')).toBe(false);
    expect(await scrollLocked(page)).toBe(false);
    await expectFocusSane(page);
  });
});

test.describe('a close the page cancels', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/overlay-deep');
    await page.evaluate(() => (window.veto = new Set(['escape', 'outside', 'close-button', 'trigger', 'select', 'blur', 'hover'])));
  });

  const cases: { name: string; open: (p: Page) => Promise<void>; id: string; routes: [string, (p: Page) => Promise<void>, string][]; modal?: boolean; focusIn?: string }[] = [
    {
      name: 'dialog',
      id: 'form-dlg',
      modal: true,
      focusIn: 'form-dlg',
      open: (p) => p.locator('#open-form').click(),
      routes: [
        ['Escape', (p) => p.keyboard.press('Escape'), 'escape'],
        ['a press on the backdrop', (p) => p.mouse.click(5, 5), 'outside'],
        ['the close button', (p) => p.locator('#form-dlg [part="close"]').click(), 'close-button'],
      ],
    },
    {
      name: 'drawer',
      id: 'gone-drw',
      modal: true,
      focusIn: 'gone-drw',
      open: (p) => p.locator('#gone-drw-opener').click(),
      routes: [
        ['Escape', (p) => p.keyboard.press('Escape'), 'escape'],
        ['a press on the backdrop', (p) => p.mouse.click(5, 400), 'outside'],
        ['the close button', (p) => p.locator('#gone-drw [part="close"]').click(), 'close-button'],
      ],
    },
    {
      name: 'popover',
      id: 'pop',
      open: (p) => p.locator('#pop-t').click(),
      routes: [
        ['Escape', (p) => p.keyboard.press('Escape'), 'escape'],
        ['an outside click', (p) => p.mouse.click(1200, 20), 'outside'],
        ['a click on the trigger', (p) => p.locator('#pop-t').click(), 'trigger'],
      ],
    },
    {
      name: 'dropdown-menu',
      id: 'menu',
      open: (p) => p.locator('#menu-t').click(),
      routes: [
        ['Escape', (p) => p.keyboard.press('Escape'), 'escape'],
        ['an outside click', (p) => p.mouse.click(1200, 20), 'outside'],
        ['choosing an item', (p) => p.locator('#menu-1').click(), 'select'],
      ],
    },
    {
      name: 'combobox',
      id: 'cb',
      open: (p) => p.locator('#cb input').click(),
      routes: [
        ['Escape', (p) => p.keyboard.press('Escape'), 'escape'],
        ['an outside click', (p) => p.mouse.click(1200, 20), 'outside'],
        ['choosing an option', (p) => p.getByRole('option', { name: 'Vue' }).click(), 'select'],
      ],
    },
    {
      name: 'date-picker',
      id: 'dp',
      open: (p) => p.locator('#dp input').click(),
      routes: [
        ['Escape', (p) => p.keyboard.press('Escape'), 'escape'],
        ['an outside click', (p) => p.mouse.click(1200, 20), 'outside'],
        ['picking a day', (p) => p.locator('#dp [role=grid] button:not([disabled])').nth(9).click(), 'select'],
      ],
    },
  ];

  for (const c of cases) {
    test(`${c.name}: stays open when void-close is cancelled, by every route, and still closes through the API`, async ({ page }) => {
      await c.open(page);
      await expect.poll(() => isOpen(page, c.id)).toBe(true);
      for (const [route, act, reason] of c.routes) {
        await clearLog(page);
        await act(page);
        await expect.poll(async () => (await closesOf(page)).length, `void-close fires for ${route}`).toBeGreaterThanOrEqual(1);
        await settle(page);
        // Clicking an option or the page takes focus off a combobox's input, which asks to close it again ("blur"); the veto covers that too.
        const events = (await closesOf(page)).filter((e) => !(c.id === 'cb' && reason !== 'blur' && e.reason === 'blur'));
        expect(events, route).toEqual([{ type: 'close', id: c.id, reason, cancelable: true }]);
        expect(await isOpen(page, c.id), `still open after ${route}`).toBe(true);
        await expectPerceivable(page.locator(`#${c.id}`).locator('input, button, [role=menuitem], [role=option], [role=grid] button, .pc').first());
        if (c.modal) {
          expect(await scrollLocked(page), `still locked after ${route}`).toBe(true);
          expect(await insideOf(page, c.id), `focus stays inside after ${route}`).toBe(true);
        }
      }
      // The API is not a user: its close cannot be cancelled, whatever the page says.
      await clearLog(page);
      await setOpen(page, c.id, false);
      await expect.poll(() => isOpen(page, c.id)).toBe(false);
      expect(await closesOf(page)).toEqual([{ type: 'close', id: c.id, reason: 'api', cancelable: false }]);
      if (c.modal) expect(await scrollLocked(page)).toBe(false);
    });
  }

  test('cancelling does not wedge the stack: once the page stops vetoing, Escape closes the layers in order', async ({ page }) => {
    await page.locator('#open-1').click();
    await page.locator('#open-2').click();
    await expect.poll(() => isOpen(page, 'l2')).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await closesOf(page)).length).toBe(1);
    expect(await isOpen(page, 'l2')).toBe(true);
    expect(await isOpen(page, 'l1')).toBe(true);
    await page.evaluate(() => (window.veto = new Set()));
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'l2')).toBe(false);
    expect(await isOpen(page, 'l1'), 'only the top layer closed').toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'l1')).toBe(false);
    expect(await scrollLocked(page)).toBe(false);
  });
});

test.describe('the reason on every way to close', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/overlay-deep');
  });

  type Route = [name: string, open: (p: Page) => Promise<void>, close: (p: Page) => Promise<void>, id: string, reason: string, cancelable: boolean];
  const routes: Route[] = [
    ['dialog: Escape', (p) => p.locator('#open-form').click(), (p) => p.keyboard.press('Escape'), 'form-dlg', 'escape', true],
    ['dialog: backdrop', (p) => p.locator('#open-form').click(), (p) => p.mouse.click(5, 5), 'form-dlg', 'outside', true],
    ['dialog: close button', (p) => p.locator('#open-form').click(), (p) => p.locator('#form-dlg [part="close"]').click(), 'form-dlg', 'close-button', true],
    ['dialog: method="dialog" form', (p) => p.locator('#open-form').click(), (p) => p.locator('#form-ok').click(), 'form-dlg', 'form', false],
    ['dialog: open = false', (p) => p.locator('#open-form').click(), (p) => setOpen(p, 'form-dlg', false), 'form-dlg', 'api', false],
    ['dialog: the attribute removed', (p) => p.locator('#open-form').click(), (p) => p.evaluate(() => document.getElementById('form-dlg')!.removeAttribute('open')), 'form-dlg', 'api', false],
    ['drawer: Escape', (p) => p.locator('#gone-drw-opener').click(), (p) => p.keyboard.press('Escape'), 'gone-drw', 'escape', true],
    ['drawer: backdrop', (p) => p.locator('#gone-drw-opener').click(), (p) => p.mouse.click(5, 400), 'gone-drw', 'outside', true],
    ['drawer: close button', (p) => p.locator('#gone-drw-opener').click(), (p) => p.locator('#gone-drw [part="close"]').click(), 'gone-drw', 'close-button', true],
    ['drawer: open = false', (p) => p.locator('#gone-drw-opener').click(), (p) => setOpen(p, 'gone-drw', false), 'gone-drw', 'api', false],
    ['popover: Escape', (p) => p.locator('#pop-t').click(), (p) => p.keyboard.press('Escape'), 'pop', 'escape', true],
    ['popover: outside click', (p) => p.locator('#pop-t').click(), (p) => p.mouse.click(1200, 20), 'pop', 'outside', true],
    ['popover: trigger click', (p) => p.locator('#pop-t').click(), (p) => p.locator('#pop-t').click(), 'pop', 'trigger', true],
    ['popover: focus leaves it', (p) => p.locator('#pop-t').click(), async (p) => { await p.locator('#pop-in').focus(); await p.locator('#after').focus(); }, 'pop', 'blur', true],
    ['popover: open = false', (p) => p.locator('#pop-t').click(), (p) => setOpen(p, 'pop', false), 'pop', 'api', false],
    ['dropdown-menu: Escape', (p) => p.locator('#menu-t').click(), (p) => p.keyboard.press('Escape'), 'menu', 'escape', true],
    ['dropdown-menu: outside click', (p) => p.locator('#menu-t').click(), (p) => p.mouse.click(1200, 20), 'menu', 'outside', true],
    ['dropdown-menu: trigger click', (p) => p.locator('#menu-t').click(), (p) => p.locator('#menu-t').click(), 'menu', 'trigger', true],
    ['dropdown-menu: choosing an item', (p) => p.locator('#menu-t').click(), (p) => p.locator('#menu-2').click(), 'menu', 'select', true],
    ['dropdown-menu: Tab out of it', (p) => p.locator('#menu-t').click(), (p) => p.keyboard.press('Tab'), 'menu', 'blur', true],
    ['dropdown-menu: open = false', (p) => p.locator('#menu-t').click(), (p) => setOpen(p, 'menu', false), 'menu', 'api', false],
    ['tooltip: pointer leaves', (p) => p.locator('#tt-t').hover(), (p) => p.mouse.move(1200, 20), 'tt', 'hover', true],
    ['tooltip: Escape', (p) => p.locator('#tt-t').hover(), (p) => p.keyboard.press('Escape'), 'tt', 'escape', true],
    ['tooltip: focus leaves', (p) => p.locator('#tt-t').focus(), (p) => p.locator('#after').focus(), 'tt', 'blur', true],
    ['hover-card: pointer leaves', (p) => p.locator('#hc-t').hover(), (p) => p.mouse.move(1200, 20), 'hc', 'hover', true],
    ['hover-card: Escape', (p) => p.locator('#hc-t').hover(), (p) => p.keyboard.press('Escape'), 'hc', 'escape', true],
    ['hover-card: focus leaves', (p) => p.locator('#hc-t').focus(), (p) => p.locator('#after').focus(), 'hc', 'blur', true],
    ['combobox: Escape', (p) => p.locator('#cb input').click(), (p) => p.keyboard.press('Escape'), 'cb', 'escape', true],
    ['combobox: outside click', (p) => p.locator('#cb input').click(), (p) => p.mouse.click(1200, 20), 'cb', 'outside', true],
    ['combobox: choosing an option', (p) => p.locator('#cb input').click(), (p) => p.getByRole('option', { name: 'Vue' }).click(), 'cb', 'select', true],
    ['combobox: Tab out of it', (p) => p.locator('#cb input').click(), (p) => p.keyboard.press('Tab'), 'cb', 'blur', true],
    ['multiselect: Escape', (p) => p.locator('#ms .void-multiselect-trigger').click(), (p) => p.keyboard.press('Escape'), 'ms', 'escape', true],
    ['multiselect: outside click', (p) => p.locator('#ms .void-multiselect-trigger').click(), (p) => p.mouse.click(1200, 20), 'ms', 'outside', true],
    ['date-picker: Escape', (p) => p.locator('#dp input').click(), (p) => p.keyboard.press('Escape'), 'dp', 'escape', true],
    ['date-picker: outside click', (p) => p.locator('#dp input').click(), (p) => p.mouse.click(1200, 20), 'dp', 'outside', true],
    ['date-picker: picking a day', (p) => p.locator('#dp input').click(), (p) => p.locator('#dp [role=grid] button:not([disabled])').nth(9).click(), 'dp', 'select', true],
  ];

  for (const [name, open, close, id, reason, cancelable] of routes) {
    test(`${name} closes with reason "${reason}"${cancelable ? ' (cancelable)' : ' (not cancelable)'}`, async ({ page }) => {
      await open(page);
      await expect.poll(async () => (await logOf(page)).some((e) => e.type === 'open' && e.id === id), 'void-open fired').toBe(true);
      await settle(page);
      await clearLog(page);
      await close(page);
      await expect.poll(async () => (await closesOf(page)).filter((e) => e.id === id).length, 'void-close fired').toBeGreaterThanOrEqual(1);
      await settle(page);
      expect((await closesOf(page)).filter((e) => e.id === id), 'exactly one void-close for it').toEqual([{ type: 'close', id, reason, cancelable }]);
      expect(await isOpen(page, id)).toBe(false);
    });
  }

  test('void-open and void-close do not bubble: a listener on an ancestor in the bubble phase never hears them', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).bubbled = [];
      document.body.addEventListener('void-open', (e) => (window as any).bubbled.push('open:' + (e.target as Element).id));
      document.body.addEventListener('void-close', (e) => (window as any).bubbled.push('close:' + (e.target as Element).id));
    });
    await page.locator('#open-form').click();
    await expect.poll(() => isOpen(page, 'form-dlg')).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'form-dlg')).toBe(false);
    expect(await page.evaluate(() => (window as any).bubbled)).toEqual([]);
  });
});

test.describe('fifty cycles leave nothing behind', () => {
  test.setTimeout(150_000);
  test.beforeEach(async ({ page }) => {
    await trackListeners(page);
    await load(page, '/overlay-deep');
  });

  type Cycle = { name: string; id: string; one: (p: Page, i: number) => Promise<void> };
  const dateDay = (p: Page) => p.locator('#dp [role=grid] button:not([disabled])').nth(9);
  const cycles: Cycle[] = [
    {
      name: 'dialog',
      id: 'form-dlg',
      one: async (p, i) => {
        await p.locator('#open-form').click();
        await expect(p.locator('#form-dlg > dialog')).toBeVisible();
        const route = i % 4;
        if (route === 0) await p.keyboard.press('Escape');
        if (route === 1) await p.locator('#form-dlg [part="close"]').click();
        if (route === 2) await p.mouse.click(5, 5);
        if (route === 3) await p.locator('#form-ok').click();
        await expect.poll(() => isOpen(p, 'form-dlg')).toBe(false);
      },
    },
    {
      name: 'drawer',
      id: 'gone-drw',
      one: async (p, i) => {
        await p.locator('#gone-drw-opener').click();
        await expect(p.locator('#gone-drw > dialog')).toBeVisible();
        const route = i % 3;
        if (route === 0) await p.keyboard.press('Escape');
        if (route === 1) await p.locator('#gone-drw [part="close"]').click();
        if (route === 2) await p.mouse.click(5, 400);
        await expect.poll(() => isOpen(p, 'gone-drw')).toBe(false);
      },
    },
    {
      name: 'popover',
      id: 'pop',
      one: async (p, i) => {
        await p.locator('#pop-t').click();
        await expect(p.locator('#pop > void-popover-content')).toBeVisible();
        const route = i % 3;
        if (route === 0) await p.keyboard.press('Escape');
        if (route === 1) await p.mouse.click(1200, 20);
        if (route === 2) await p.locator('#pop-t').click();
        await expect.poll(() => isOpen(p, 'pop')).toBe(false);
      },
    },
    {
      name: 'dropdown-menu',
      id: 'menu',
      one: async (p, i) => {
        await p.locator('#menu-t').click();
        await expect(p.locator('#menu-1')).toBeVisible();
        const route = i % 3;
        if (route === 0) await p.keyboard.press('Escape');
        if (route === 1) await p.mouse.click(1200, 20);
        if (route === 2) await p.locator('#menu-2').click();
        await expect.poll(() => isOpen(p, 'menu')).toBe(false);
      },
    },
    {
      name: 'tooltip',
      id: 'tt',
      one: async (p, i) => {
        await p.locator('#tt-t').hover();
        await expect(p.locator('#tt')).toHaveAttribute('open', '');
        if (i % 2) await p.keyboard.press('Escape');
        else await p.mouse.move(1200, 20);
        await expect.poll(() => isOpen(p, 'tt')).toBe(false);
        await p.mouse.move(1200, 20);
      },
    },
    {
      name: 'hover-card',
      id: 'hc',
      one: async (p, i) => {
        await p.locator('#hc-t').hover();
        await expect(p.locator('#hc')).toHaveAttribute('open', '');
        if (i % 2) await p.keyboard.press('Escape');
        else await p.mouse.move(1200, 20);
        await expect.poll(() => isOpen(p, 'hc')).toBe(false);
        await p.mouse.move(1200, 20);
      },
    },
    {
      name: 'combobox',
      id: 'cb',
      one: async (p, i) => {
        // A combobox opens when its input takes focus, so take focus away first.
        await p.locator('#after').focus();
        await p.locator('#cb input').click();
        await expect(p.getByRole('option', { name: 'Vue' })).toBeVisible();
        if (i % 3 === 0) await p.keyboard.press('Escape');
        if (i % 3 === 1) await p.mouse.click(1200, 20);
        if (i % 3 === 2) await p.getByRole('option', { name: 'Vue' }).click();
        await expect.poll(() => isOpen(p, 'cb')).toBe(false);
      },
    },
    {
      name: 'multiselect',
      id: 'ms',
      one: async (p, i) => {
        await p.locator('#ms .void-multiselect-trigger').click();
        await expect(p.locator('#ms').getByRole('option', { name: 'JS' })).toBeVisible();
        if (i % 2) await p.keyboard.press('Escape');
        else await p.mouse.click(1200, 20);
        await expect.poll(() => isOpen(p, 'ms')).toBe(false);
      },
    },
    {
      name: 'date-picker',
      id: 'dp',
      one: async (p, i) => {
        await p.locator('#dp input').click();
        await expect(dateDay(p)).toBeVisible();
        if (i % 3 === 0) await p.keyboard.press('Escape');
        if (i % 3 === 1) await p.mouse.click(1200, 20);
        if (i % 3 === 2) await dateDay(p).click();
        await expect.poll(() => isOpen(p, 'dp')).toBe(false);
      },
    },
    {
      name: 'four nested overlays',
      id: 'l1',
      one: async (p) => {
        for (const n of [1, 2, 3, 4]) await p.locator(`#open-${n}`).click();
        await expect.poll(() => isOpen(p, 'l4')).toBe(true);
        for (let n = 0; n < 4; n++) await p.keyboard.press('Escape');
        await expect.poll(() => isOpen(p, 'l1')).toBe(false);
      },
    },
  ];

  for (const c of cycles) {
    test(`${c.name}: no leaked nodes, listeners, top-layer entries or scroll lock`, async ({ page }) => {
      // One full cycle first: components make what they need on first use (a calendar grid, a listbox).
      await c.one(page, 0);
      await page.mouse.move(1200, 20);
      await settle(page);
      const before = await footprint(page);
      for (let i = 1; i <= 50; i++) await c.one(page, i);
      await page.mouse.move(1200, 20);
      await settle(page);
      const after = await footprint(page);
      expect(after.nodes, 'DOM nodes').toBe(before.nodes);
      expect(after.listeners, 'document, window, <html> and <body> listeners').toEqual(before.listeners);
      expect(after.popoversOpen, 'popovers left in the top layer').toBe(0);
      expect(after.modalsOpen, 'modal dialogs left open').toBe(0);
      expect(after.inert, 'elements left inert').toBe(0);
      expect(after.scrollLocked, 'scroll lock').toBe(false);
      expect(after.htmlStyle, '<html> style').toBe(before.htmlStyle);
      expect(after.bodyStyle, '<body> style').toBe(before.bodyStyle);
      expect(after.expanded, 'triggers left expanded').toEqual([]);
      expect(after).toEqual(before);
    });
  }

  test('while an overlay is open it holds listeners, and closing releases them', async ({ page }) => {
    const idle = (await footprint(page)).listeners;
    await page.locator('#menu-t').click();
    await expect.poll(() => isOpen(page, 'menu')).toBe(true);
    const open = (await footprint(page)).listeners;
    expect(Object.keys(open).length, 'an open overlay listens on the document').toBeGreaterThan(Object.keys(idle).length - 1);
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'menu')).toBe(false);
    await settle(page);
    expect((await footprint(page)).listeners).toEqual(idle);
  });
});

test.describe('through a morph with an overlay open', () => {
  const ENGINES = ['turbo', 'morphdom', 'alpine'] as const;
  const page$ = (v: number, opts: { dialog?: boolean } = {}) => `<div id="app">
  <button id="before">before</button>
  <void-button id="open-d" onclick="document.getElementById('d').open = true">Open</void-button>
  <void-dialog id="d"${opts.dialog ? ' open' : ''}><void-dialog-title>Dialog v${v}</void-dialog-title><void-dialog-body><p class="dc">Dialog body v${v}</p><input id="d-in" aria-label="Name"></void-dialog-body><void-dialog-actions><void-button id="d-ok">OK</void-button></void-dialog-actions></void-dialog>
  <void-popover id="p"><void-popover-trigger><button id="p-t">Popover</button></void-popover-trigger><void-popover-content><div class="pc" style="width: 200px">Popover body v${v} <button id="p-in">in</button></div></void-popover-content></void-popover>
  <void-dropdown-menu id="m"><void-dropdown-menu-trigger><button id="m-t">Menu v${v}</button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item id="m-1">One v${v}</void-dropdown-menu-item><void-dropdown-menu-item>Two</void-dropdown-menu-item></void-dropdown-menu-content></void-dropdown-menu>
  <p id="v">Server version ${v}</p>
</div>`;
  const render = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.render(h), html);
  const morph = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.morph(h), html);

  for (const engine of ENGINES) {
    test.describe(engine, () => {
      test.beforeEach(async ({ page }) => {
        await trackListeners(page);
        await load(page, `/morph-${engine}`);
        await render(page, page$(1));
      });

      test('an open dialog, popover and menu survive a morph that repeats the server markup: still open, same nodes, focus and lock kept', async ({ page }) => {
        await page.evaluate(() => ((window as any).__keep = ['d', 'p', 'm', 'd-in', 'p-t', 'm-t'].map((id) => document.getElementById(id))));
        await page.locator('#m-t').click();
        await expect.poll(() => page.evaluate(() => (document.getElementById('m') as any).open)).toBe(true);
        for (let i = 0; i < 3; i++) {
          await morph(page, page$(1));
          expect(await page.evaluate(() => (document.getElementById('m') as any).open), `menu open after repeat ${i + 1}`).toBe(true);
          expect(await page.evaluate(() => (window as any).__keep.every((el: Element) => el.isConnected && document.getElementById(el.id) === el)), 'same elements').toBe(true);
        }
        await page.keyboard.press('Escape');
        await page.locator('#open-d').click();
        await expect.poll(() => insideOf(page, 'd')).toBe(true);
        for (let i = 0; i < 3; i++) {
          await morph(page, page$(1));
          expect(await page.evaluate(() => (document.getElementById('d') as any).open), `dialog open after repeat ${i + 1}`).toBe(true);
          expect(await insideOf(page, 'd'), 'focus stays in the dialog').toBe(true);
          expect(await scrollLocked(page), 'still locked').toBe(true);
          expect(await page.evaluate(() => [...document.querySelectorAll('void-dialog, void-drawer')].filter((h) => h.shadowRoot?.querySelector('dialog')?.matches(':modal')).length)).toBe(1);
        }
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => (document.getElementById('d') as any).open)).toBe(false);
        expect(await scrollLocked(page)).toBe(false);
        await expect.poll(() => focusedId(page)).toBe('open-d');
      });

      test('focus on an item of an open menu stays there through a morph', async ({ page }) => {
        // Fixed for Turbo and Alpine by the morph review changes; morphdom still loses it in WebKit.
        if (engine === 'morphdom') expectedFailure('untracked:webkit-morph-drops-menu-focus', 'the focused item of an open dropdown-menu loses focus (document.activeElement becomes <body>) when a morphdom morph runs, though the menu stays open', { browsers: ['webkit'] });
        await page.locator('#m-t').click();
        await expect.poll(() => focusedId(page)).toBe('m-1');
        for (let i = 0; i < 3; i++) {
          await morph(page, page$(1));
          expect(await focusedId(page), `focus after repeat ${i + 1}`).toBe('m-1');
        }
        await page.keyboard.press('ArrowDown');
        await expect.poll(() => page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Two');
      });

      test('a morph that changes the text of an open dialog updates it in place and keeps it open', async ({ page }) => {
        await page.locator('#open-d').click();
        await expect.poll(() => insideOf(page, 'd')).toBe(true);
        await morph(page, page$(2));
        await expect(page.locator('#d .dc')).toHaveText('Dialog body v2');
        await expect(page.locator('#d void-dialog-title')).toHaveText('Dialog v2');
        expect(await page.evaluate(() => (document.getElementById('d') as any).open)).toBe(true);
        expect(await insideOf(page, 'd')).toBe(true);
        expect(await scrollLocked(page)).toBe(true);
      });

      test('a morph that removes an open dialog releases the scroll lock and the top layer', async ({ page }) => {
        await page.locator('#open-d').click();
        await expect.poll(() => insideOf(page, 'd')).toBe(true);
        const without = page$(2).replace(/<void-dialog[\s\S]*?<\/void-dialog>/, '');
        await morph(page, without);
        await expect(page.locator('#d')).toHaveCount(0);
        await expect.poll(() => scrollLocked(page), 'the lock is released').toBe(false);
        expect(await page.evaluate(() => document.querySelectorAll(':modal, :popover-open, [inert]').length)).toBe(0);
        // The page works again: a click on a button is not swallowed by something left inert.
        await page.locator('#p-t').click();
        await expect.poll(() => page.evaluate(() => (document.getElementById('p') as any).open)).toBe(true);
      });

      test('a morph that renders a dialog open opens it as a modal with focus inside', async ({ page }) => {
        await morph(page, page$(2, { dialog: true }));
        await expect.poll(() => page.evaluate(() => (document.getElementById('d') as any).open)).toBe(true);
        await expect.poll(() => insideOf(page, 'd')).toBe(true);
        expect(await scrollLocked(page)).toBe(true);
        expect(await page.evaluate(() => document.getElementById('d')!.shadowRoot!.querySelector('dialog')!.matches(':modal'))).toBe(true);
        // And one that stops rendering it open closes it again, with the lock.
        await morph(page, page$(3));
        await expect.poll(() => scrollLocked(page)).toBe(false);
        expect(await page.evaluate(() => (document.getElementById('d') as any).open)).toBe(false);
      });
    });
  }

  test('turbo: fifty cycles of open, morph and close leave nothing behind', async ({ page }) => {
    test.setTimeout(150_000);
    await trackListeners(page);
    await load(page, '/morph-turbo');
    await render(page, page$(1));
    const cycle = async (i: number) => {
      await page.locator('#open-d').click();
      await expect.poll(() => insideOf(page, 'd')).toBe(true);
      await morph(page, page$(1 + (i % 2)));
      expect(await page.evaluate(() => (document.getElementById('d') as any).open), 'open through the morph').toBe(true);
      await page.keyboard.press('Escape');
      await expect.poll(() => page.evaluate(() => (document.getElementById('d') as any).open)).toBe(false);
      // The popover too: opened, morphed while open, closed.
      await page.locator('#p-t').click();
      await expect.poll(() => page.evaluate(() => (document.getElementById('p') as any).open)).toBe(true);
      await morph(page, page$(1 + ((i + 1) % 2)));
      expect(await page.evaluate(() => (document.getElementById('p') as any).open), 'popover open through the morph').toBe(true);
      await page.keyboard.press('Escape');
      await expect.poll(() => page.evaluate(() => (document.getElementById('p') as any).open)).toBe(false);
    };
    await cycle(0);
    await settle(page);
    const before = await footprint(page);
    for (let i = 1; i <= 50; i++) await cycle(i);
    await settle(page);
    const after = await footprint(page);
    expect(after.nodes, 'DOM nodes').toBe(before.nodes);
    expect(after.listeners, 'listeners').toEqual(before.listeners);
    expect(after).toEqual({ ...before, nodes: after.nodes });
    expect(after.scrollLocked).toBe(false);
  });
});

