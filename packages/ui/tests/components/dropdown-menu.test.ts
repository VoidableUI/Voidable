// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDropdownMenu, VoidDropdownMenuItem } from '../../src/components/dropdown-menu.js';
import { cleanup, pointerdown, stack } from '../helpers/overlay.js';

const TAG = 'void-dropdown-menu';
const ITEM = 'void-dropdown-menu-item';

interface ItemSpec { label: string; disabled?: boolean; destructive?: boolean }

const DEFAULT_ITEMS: ItemSpec[] = [{ label: 'Edit' }, { label: 'Duplicate' }, { label: 'Delete', destructive: true }];

async function mount(
  props: Partial<VoidDropdownMenu> = {},
  items: ItemSpec[] = DEFAULT_ITEMS,
  withTrigger = true,
): Promise<VoidDropdownMenu> {
  const el = document.createElement(TAG) as VoidDropdownMenu;
  if (withTrigger) {
    const part = document.createElement('void-dropdown-menu-trigger');
    const t = document.createElement('button');
    t.id = 'trigger';
    t.textContent = 'Actions';
    part.appendChild(t);
    el.appendChild(part);
  }
  const content = document.createElement('void-dropdown-menu-content');
  for (const spec of items) {
    const item = document.createElement(ITEM) as VoidDropdownMenuItem;
    item.textContent = spec.label;
    if (spec.disabled) item.disabled = true;
    if (spec.destructive) item.destructive = true;
    content.appendChild(item);
  }
  el.appendChild(content);
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await Promise.all(menuItems(el).map((i) => i.updateComplete));
  return el;
}

const trigger = (el: Element) => el.querySelector('#trigger') as HTMLButtonElement;
const panels = (el: Element) => el.querySelectorAll('void-dropdown-menu-content');
const menuItems = (el: Element) => Array.from(el.querySelectorAll(ITEM)) as VoidDropdownMenuItem[];

function press(key: string, target: EventTarget = document): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  // Space activates on keyup, as on a native button.
  if (key === ' ') target.dispatchEvent(new KeyboardEvent('keyup', { key: key, bubbles: true, cancelable: true }));
  return e;
}

afterEach(cleanup);

describe('VoidDropdownMenu', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidDropdownMenu.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-dropdown-menu', () => {
      expect(customElements.get(TAG)).toBe(VoidDropdownMenu);
    });
  });

  describe('defaults and reflection', () => {
    it('open defaults to false, position to "bottom" and align to "start"', () => {
      const el = document.createElement(TAG) as VoidDropdownMenu;
      expect(el.open).toBe(false);
      expect(el.position).toBe('bottom');
      expect(el.align).toBe('start');
    });

    it('reflects open, position and align', async () => {
      const el = await mount({ open: true, position: 'top', align: 'end' });
      expect(el.hasAttribute('open')).toBe(true);
      expect(el.getAttribute('position')).toBe('top');
      expect(el.getAttribute('align')).toBe('end');
    });

    it('reads the open attribute', async () => {
      const el = await mount();
      el.setAttribute('open', '');
      await el.updateComplete;
      expect(el.open).toBe(true);
    });
  });

  describe('structure (explicit parts, #52)', () => {
    it('moves nothing: the trigger and content parts stay where the author put them', async () => {
      const el = await mount();
      expect([...el.children].map((c) => c.localName)).toEqual(['void-dropdown-menu-trigger', 'void-dropdown-menu-content']);
      expect(trigger(el).parentElement!.localName).toBe('void-dropdown-menu-trigger');
      expect(panels(el)[0]!.querySelectorAll(ITEM)).toHaveLength(3);
    });

    it('makes the content part the role="menu" popover', async () => {
      const el = await mount();
      const panel = panels(el)[0]!;
      expect(panel.getAttribute('role')).toBe('menu');
      expect(panel.id).not.toBe('');
    });

    it('keeps an author id on the content part', async () => {
      const el = document.createElement(TAG) as VoidDropdownMenu;
      el.innerHTML = '<void-dropdown-menu-trigger><button id="trigger">t</button></void-dropdown-menu-trigger><void-dropdown-menu-content id="srv"><void-dropdown-menu-item>a</void-dropdown-menu-item></void-dropdown-menu-content>';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(panels(el)[0]!.id).toBe('srv');
      expect(trigger(el).getAttribute('aria-controls')).toBe('srv');
    });

    it('gives separators role="separator"', async () => {
      const el = document.createElement(TAG) as VoidDropdownMenu;
      el.innerHTML = '<void-dropdown-menu-trigger><button id="trigger">t</button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item>a</void-dropdown-menu-item><void-dropdown-menu-separator></void-dropdown-menu-separator><void-dropdown-menu-item>b</void-dropdown-menu-item></void-dropdown-menu-content>';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('void-dropdown-menu-separator')!.getAttribute('role')).toBe('separator');
    });

    it('renders no element of its own, even with no items', async () => {
      const el = await mount({}, []);
      expect(panels(el)).toHaveLength(1);
      expect(panels(el)[0]!.children).toHaveLength(0);
    });

    it('does not throw without parts', async () => {
      const el = await mount({}, [], false);
      el.open = true;
      await el.updateComplete;
      expect(el.children).toHaveLength(1);
    });

    it('wires a content part that arrives after the upgrade', async () => {
      const el = document.createElement(TAG) as VoidDropdownMenu;
      el.innerHTML = '<void-dropdown-menu-trigger><button id="trigger">t</button></void-dropdown-menu-trigger>';
      document.body.appendChild(el);
      await el.updateComplete;
      const content = document.createElement('void-dropdown-menu-content');
      content.innerHTML = '<void-dropdown-menu-item>late</void-dropdown-menu-item>';
      el.appendChild(content);
      await new Promise((r) => setTimeout(r, 0));
      expect(content.getAttribute('role')).toBe('menu');
      expect(trigger(el).getAttribute('aria-controls')).toBe(content.id);
    });
  });

  describe('opening and closing', () => {
    it('opens when the trigger is clicked and closes on a second click', async () => {
      const el = await mount();
      trigger(el).click();
      expect(el.open).toBe(true);
      trigger(el).click();
      expect(el.open).toBe(false);
    });

    it('reflects open back to the attribute', async () => {
      const el = await mount();
      trigger(el).click();
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('closes on an outside press', async () => {
      const el = await mount({ open: true });
      pointerdown(document.body);
      expect(el.open).toBe(false);
    });

    it('stays open on a press inside the menu (panel or trigger)', async () => {
      const el = await mount({ open: true });
      pointerdown(menuItems(el)[0]!);
      expect(el.open).toBe(true);
      pointerdown(trigger(el));
      expect(el.open).toBe(true);
    });

    it('ignores outside presses while already closed', async () => {
      const el = await mount();
      pointerdown(document.body);
      expect(el.open).toBe(false);
    });

    it('can be opened programmatically', async () => {
      const el = await mount();
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('Escape closes an open menu and returns focus to the trigger', async () => {
      const el = await mount();
      trigger(el).focus();
      trigger(el).click();
      await el.updateComplete;
      expect(document.activeElement).toBe(menuItems(el)[0]);
      const e = press('Escape', menuItems(el)[0]!);
      expect(el.open).toBe(false);
      await el.updateComplete;
      expect(document.activeElement).toBe(trigger(el));
      expect(e.defaultPrevented).toBe(true);
    });

    it('Escape on a closed menu does nothing (focus is left alone)', async () => {
      const el = await mount();
      const other = document.createElement('input');
      document.body.appendChild(other);
      other.focus();
      press('Escape');
      expect(el.open).toBe(false);
      expect(document.activeElement).toBe(other);
    });

    it('closes when an item is selected (reason select)', async () => {
      const el = await mount({ open: true });
      const reasons: string[] = [];
      el.addEventListener('void-close', e => reasons.push((e as CustomEvent).detail.reason));
      menuItems(el)[0]!.click();
      expect(el.open).toBe(false);
      expect(reasons).toEqual(['select']);
    });

    it('closes when an item is activated with the keyboard', async () => {
      const el = await mount({ open: true });
      press('Enter', menuItems(el)[0]!);
      expect(el.open).toBe(false);
    });

    it('stays open when a keep-open item is chosen', async () => {
      const el = await mount({ open: true });
      const item = menuItems(el)[1]!;
      item.keepOpen = true;
      await item.updateComplete;
      expect(item.hasAttribute('keep-open')).toBe(true);
      item.click();
      press(' ', item);
      expect(el.open).toBe(true);
    });

    it('a void-close listener can keep it open by cancelling', async () => {
      const el = await mount({ open: true });
      el.addEventListener('void-close', e => e.preventDefault());
      menuItems(el)[0]!.click();
      expect(el.open).toBe(true);
    });

    it('stays open when a disabled item is clicked', async () => {
      const el = await mount({ open: true }, [{ label: 'Nope', disabled: true }]);
      menuItems(el)[0]!.click();
      expect(el.open).toBe(true);
    });
  });

  describe('trigger ARIA', () => {
    it('marks the trigger with aria-haspopup="menu" and points aria-controls at the panel', async () => {
      const el = await mount();
      expect(trigger(el).getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger(el).getAttribute('aria-controls')).toBe(el.querySelector('void-dropdown-menu-content')!.id);
      expect(el.querySelector('void-dropdown-menu-content')!.getAttribute('aria-labelledby')).toBe(trigger(el).id);
    });

    it('keeps aria-expanded on the trigger in sync with open', async () => {
      const el = await mount();
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
      trigger(el).click();
      await el.updateComplete;
      expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('keyboard (focus is approximate in happy-dom)', () => {
    it('ArrowDown on the trigger opens the menu and focuses the first item', async () => {
      const el = await mount();
      trigger(el).focus();
      const e = press('ArrowDown', trigger(el));
      await el.updateComplete;
      expect(el.open).toBe(true);
      expect(e.defaultPrevented).toBe(true);
      await Promise.resolve();
      expect(document.activeElement).toBe(menuItems(el)[0]);
    });

    it('ArrowUp on the trigger opens the menu and focuses the last item', async () => {
      const el = await mount();
      trigger(el).focus();
      press('ArrowUp', trigger(el));
      await el.updateComplete;
      await Promise.resolve();
      expect(document.activeElement).toBe(menuItems(el)[2]);
    });

    it('Enter and Space on a trigger that is not natively activated open the menu', async () => {
      const el = await mount({}, DEFAULT_ITEMS, false);
      const part = document.createElement('void-dropdown-menu-trigger');
      const custom = document.createElement('void-button');
      custom.id = 'trigger';
      part.appendChild(custom);
      el.prepend(part);
      await new Promise((r) => setTimeout(r, 0));
      await el.updateComplete;
      press('Enter', custom);
      expect(el.open).toBe(true);
      press(' ', custom);
      expect(el.open).toBe(false);
    });

    it('does not double-toggle on a native button trigger (its Enter and Space already click)', async () => {
      const el = await mount();
      press('Enter', trigger(el));
      expect(el.open).toBe(false);
    });

    it('ArrowUp on the trigger opens the menu on its last enabled item', async () => {
      const el = await mount({}, [{ label: 'a' }, { label: 'b' }, { label: 'c', disabled: true }]);
      trigger(el).focus();
      press('ArrowUp', trigger(el));
      await el.updateComplete;
      expect(document.activeElement).toBe(menuItems(el)[1]);
    });

    it('ArrowDown moves to the next item and wraps to the first', async () => {
      const el = await mount({ open: true });
      const items = menuItems(el);
      items[0]!.focus();
      const e = press('ArrowDown', items[0]!);
      expect(document.activeElement).toBe(items[1]);
      expect(e.defaultPrevented).toBe(true);
      items[2]!.focus();
      press('ArrowDown', items[2]!);
      expect(document.activeElement).toBe(items[0]);
    });

    it('ArrowUp moves to the previous item and wraps to the last; Home and End jump', async () => {
      const el = await mount({ open: true });
      const items = menuItems(el);
      items[1]!.focus();
      press('ArrowUp', items[1]!);
      expect(document.activeElement).toBe(items[0]);
      press('ArrowUp', items[0]!);
      expect(document.activeElement).toBe(items[2]);
    });

    it('Home and End focus the first and last item', async () => {
      const el = await mount({ open: true });
      const items = menuItems(el);
      items[1]!.focus();
      press('End', items[1]!);
      expect(document.activeElement).toBe(items[2]);
      press('Home', items[2]!);
      expect(document.activeElement).toBe(items[0]);
    });

    it('typing jumps to the next item starting with the characters', async () => {
      const el = await mount({ open: true });
      const items = menuItems(el);
      items[0]!.focus();
      press('d', items[0]!);
      expect(document.activeElement).toBe(items[1]);
    });

    it('skips disabled items', async () => {
      const el = await mount({ open: true }, [{ label: 'a' }, { label: 'b', disabled: true }, { label: 'c' }]);
      const items = menuItems(el);
      items[0]!.focus();
      press('ArrowDown', items[0]!);
      expect(document.activeElement).toBe(items[2]);
    });

    it('Tab closes the menu and is not prevented', async () => {
      const el = await mount({ open: true });
      const items = menuItems(el);
      items[0]!.focus();
      const e = press('Tab', items[0]!);
      expect(el.open).toBe(false);
      expect(e.defaultPrevented).toBe(false);
    });

    it('does not take over arrow keys elsewhere on the page while open (a textarea, say)', async () => {
      await mount({ open: true });
      const area = document.createElement('textarea');
      document.body.appendChild(area);
      area.focus();
      expect(press('ArrowDown', area).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(area);
    });

    it('does nothing (and does not throw) when every item is disabled', async () => {
      const el = await mount({ open: true }, [{ label: 'a', disabled: true }]);
      expect(() => press('ArrowDown', menuItems(el)[0]!)).not.toThrow();
    });

    it('focus moving out of the menu (Tab) closes it', async () => {
      const el = await mount();
      const after = document.createElement('button');
      document.body.appendChild(after);
      trigger(el).click();
      await el.updateComplete;
      after.focus();
      expect(el.open).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('leaves the overlay stack when removed while open (no document listeners stay behind)', async () => {
      const el = await mount({ open: true });
      el.remove();
      await Promise.resolve();
      await Promise.resolve();
      expect(stack()).toEqual([]);
      const e = press('Escape', document.body);
      expect(e.defaultPrevented).toBe(false);
    });

    it('still toggles once per trigger click after reconnecting', async () => {
      const el = await mount();
      el.remove();
      document.body.appendChild(el);
      await el.updateComplete;
      trigger(el).click();
      expect(el.open).toBe(true);
    });

    // Regression: connectedCallback used to build a new panel on every connect and move every
    // non-trigger child into it, including the previous panel, so each reconnect (or a framework
    // moving the element) nested another panel. Fixed by the ProjectionController migration (#4).
    it('does not nest a second panel when reconnected', async () => {
      const el = await mount();
      el.remove();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(panels(el)).toHaveLength(1);
      expect(menuItems(el)[0]!.parentElement).toBe(panels(el)[0]);
    });
  });
});

describe('VoidDropdownMenuItem', () => {
  async function item(props: Partial<VoidDropdownMenuItem> = {}): Promise<VoidDropdownMenuItem> {
    const el = document.createElement(ITEM) as VoidDropdownMenuItem;
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  it('extends VoidElement and is registered', () => {
    expect(VoidDropdownMenuItem.prototype).toBeInstanceOf(VoidElement);
    expect(customElements.get(ITEM)).toBe(VoidDropdownMenuItem);
  });

  it('defaults disabled and destructive to false', () => {
    const el = document.createElement(ITEM) as VoidDropdownMenuItem;
    expect(el.disabled).toBe(false);
    expect(el.destructive).toBe(false);
  });

  it('reflects disabled and destructive', async () => {
    const el = await item({ disabled: true, destructive: true });
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('destructive')).toBe(true);
  });

  it('has role="menuitem" and takes focus from the menu, not from Tab (tabindex="-1")', async () => {
    const el = await item();
    expect(el.getAttribute('role')).toBe('menuitem');
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  it('exposes disabled via aria-disabled, and recovers', async () => {
    const el = await item({ disabled: true });
    expect(el.getAttribute('aria-disabled')).toBe('true');
    el.disabled = false;
    await el.updateComplete;
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  describe('void-select event', () => {
    it('is dispatched on click with the item as detail', async () => {
      const el = await item();
      let detail: { item: Element } | null = null;
      el.addEventListener('void-select', (e) => { detail = (e as CustomEvent).detail; });
      el.click();
      expect(detail!.item).toBe(el);
    });

    it('bubbles and is composed', async () => {
      const el = await item();
      let ev: CustomEvent | null = null;
      document.body.addEventListener('void-select', (e) => { ev = e as CustomEvent; }, { once: true });
      el.click();
      expect(ev!.bubbles).toBe(true);
      expect(ev!.composed).toBe(true);
    });

    it('is dispatched exactly once per click', async () => {
      const el = await item();
      let count = 0;
      el.addEventListener('void-select', () => count++);
      el.click();
      expect(count).toBe(1);
    });

    it('is dispatched for Enter and Space (with default prevented)', async () => {
      const el = await item();
      let count = 0;
      el.addEventListener('void-select', () => count++);
      expect(press('Enter', el).defaultPrevented).toBe(true);
      expect(press(' ', el).defaultPrevented).toBe(true);
      expect(count).toBe(2);
    });

    it('is not dispatched for other keys', async () => {
      const el = await item();
      let count = 0;
      el.addEventListener('void-select', () => count++);
      press('a', el);
      expect(count).toBe(0);
    });

    it('is not dispatched when disabled (click or keyboard)', async () => {
      const el = await item({ disabled: true });
      let count = 0;
      el.addEventListener('void-select', () => count++);
      el.click();
      press('Enter', el);
      press(' ', el);
      expect(count).toBe(0);
    });

    it('a disabled click does not reach ancestors', async () => {
      const el = await item({ disabled: true });
      let reached = false;
      document.body.addEventListener('click', () => { reached = true; }, { once: true });
      el.click();
      expect(reached).toBe(false);
    });

    it('stops dispatching after disconnect', async () => {
      const el = await item();
      el.remove();
      let count = 0;
      el.addEventListener('void-select', () => count++);
      el.click();
      expect(count).toBe(0);
    });
  });
});
