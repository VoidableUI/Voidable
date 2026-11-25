// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidMenu, VoidMenuItem, VoidMenuGroup } from '../../src/components/menu.js';

if (!customElements.get('void-menu')) {
  customElements.define('void-menu', VoidMenu);
}
if (!customElements.get('void-menu-item')) {
  customElements.define('void-menu-item', VoidMenuItem);
}
if (!customElements.get('void-menu-group')) {
  customElements.define('void-menu-group', VoidMenuGroup);
}

function createMenu(items: Array<{ value: string; label: string; disabled?: boolean }>, searchable = false): VoidMenu {
  const el = document.createElement('void-menu') as VoidMenu;
  if (searchable) {
    const search = document.createElement('void-menu-search');
    const input = document.createElement('input');
    input.type = 'search';
    input.setAttribute('aria-label', 'Search');
    search.appendChild(input);
    el.appendChild(search);
  }
  const content = document.createElement('void-menu-content');
  for (const item of items) {
    const mi = document.createElement('void-menu-item') as VoidMenuItem;
    mi.value = item.value;
    mi.textContent = item.label;
    if (item.disabled) mi.disabled = true;
    content.appendChild(mi);
  }
  el.appendChild(content);
  return el;
}

function createGroupedMenu(): VoidMenu {
  const el = document.createElement('void-menu') as VoidMenu;
  el.innerHTML =
    '<void-menu-content><void-menu-group><void-menu-group-label>File</void-menu-group-label>' +
    '<void-menu-item value="new">New File</void-menu-item><void-menu-item value="open">Open File</void-menu-item></void-menu-group></void-menu-content>';
  return el;
}

describe('VoidMenu', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidMenu)).toBe(VoidElement);
    });

    it('is registered as void-menu', () => {
      expect(customElements.get('void-menu')).toBe(VoidMenu);
    });
  });

  describe('default property values', () => {
    let el: VoidMenu;

    beforeEach(() => {
      el = document.createElement('void-menu') as VoidMenu;
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidMenu;

    beforeEach(async () => {
      el = document.createElement('void-menu') as VoidMenu;
      el.innerHTML = '<void-menu-content></void-menu-content>';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('puts role="menu" on the list (the host has no role, so a search field is not a menu child)', () => {
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.querySelector('void-menu-content')!.getAttribute('role')).toBe('menu');
    });

    it('has no listbox between the menu and its items', () => {
      expect(el.querySelector('[role="listbox"]')).toBeNull();
    });
  });

  describe('open/close behavior', () => {
    let el: VoidMenu;

    beforeEach(async () => {
      el = createMenu([
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Bravo' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('is hidden by the theme through the open attribute, and its parts stay where they are', async () => {
      const content = el.querySelector('void-menu-content')!;
      const items = Array.from(el.querySelectorAll('void-menu-item'));
      expect(el.hasAttribute('open')).toBe(false);
      el.open = true;
      await el.updateComplete;
      el.open = false;
      await el.updateComplete;
      expect(el.querySelector('void-menu-content')).toBe(content);
      expect(Array.from(el.querySelectorAll('void-menu-item'))).toEqual(items);
    });

    it('reflects open attribute', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('closes on Escape key', async () => {
      el.open = true;
      await el.updateComplete;
      const item = el.querySelector<HTMLElement>('void-menu-item')!;
      item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });
  });

  describe('search filtering', () => {
    let el: VoidMenu;

    beforeEach(async () => {
      el = createMenu([
        { value: 'alpha', label: 'Alpha' },
        { value: 'bravo', label: 'Bravo' },
        { value: 'charlie', label: 'Charlie' },
      ], true);
      el.open = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('the search part wraps the author field, which the menu links to the list', () => {
      const input = el.querySelector('void-menu-search > input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.getAttribute('aria-controls')).toBe(el.querySelector('void-menu-content')!.id);
    });

    it('without a search part there is no search and typing in the list only jumps', async () => {
      el.querySelector('void-menu-search')!.remove();
      await new Promise(r => setTimeout(r));
      expect(el.querySelector('input')).toBeNull();
    });

    it('filters items based on text input', async () => {
      const input = el.querySelector('void-menu-search > input') as HTMLInputElement;
      input.value = 'bravo';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      const items = el.querySelectorAll('void-menu-item:not([hidden])');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('Bravo');
    });

    it('filtering is case-insensitive', async () => {
      const input = el.querySelector('void-menu-search > input') as HTMLInputElement;
      input.value = 'ALPHA';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      const items = el.querySelectorAll('void-menu-item:not([hidden])');
      expect(items.length).toBe(1);
    });

    it('marks the menu empty when no item matches, and clears it when items match again', async () => {
      const input = el.querySelector('void-menu-search > input') as HTMLInputElement;
      input.value = 'zzz';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('empty')).toBe(true);
      input.value = '';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('empty')).toBe(false);
      expect(el.querySelectorAll('void-menu-item[hidden]').length).toBe(0);
    });

    it('creates no node for the empty state: an author part replaces the default text', async () => {
      const empty = document.createElement('void-menu-empty');
      empty.textContent = 'Nothing here';
      el.appendChild(empty);
      const before = Array.from(el.querySelectorAll('*'));
      const input = el.querySelector('void-menu-search > input') as HTMLInputElement;
      input.value = 'zzz';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      expect(Array.from(el.querySelectorAll('*'))).toEqual(before);
    });

    it('does not unhide an item the author hid when the search is cleared', async () => {
      const first = el.querySelector('void-menu-item')!;
      const input = el.querySelector('void-menu-search > input') as HTMLInputElement;
      input.value = 'bravo';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      expect(first.hasAttribute('hidden')).toBe(true);
      input.value = '';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      expect(first.hasAttribute('hidden')).toBe(false);
    });

    it('filters by value attribute too', async () => {
      const input = el.querySelector('void-menu-search > input') as HTMLInputElement;
      input.value = 'charlie';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      const items = el.querySelectorAll('void-menu-item:not([hidden])');
      expect(items.length).toBe(1);
    });
  });

  describe('keyboard navigation', () => {
    let el: VoidMenu;

    beforeEach(async () => {
      el = createMenu([
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Bravo' },
        { value: 'c', label: 'Charlie' },
      ]);
      el.open = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    const items = () => Array.from(el.querySelectorAll<VoidMenuItem>('void-menu-item'));
    const press = (target: Element, key: string) => {
      const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      target.dispatchEvent(e);
      return e;
    };

    it('exactly one item is the tab stop (roving tabindex)', () => {
      expect(items().map(i => i.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    });

    it('the tab stop follows focus', () => {
      items()[2]!.focus();
      expect(items().map(i => i.getAttribute('tabindex'))).toEqual(['-1', '-1', '0']);
    });

    it('a late item does not add a second tab stop', async () => {
      const late = document.createElement('void-menu-item') as VoidMenuItem;
      late.textContent = 'Delta';
      el.appendChild(late);
      await el.updateComplete;
      await late.updateComplete;
      await new Promise(r => setTimeout(r));
      expect(items().filter(i => i.getAttribute('tabindex') === '0')).toHaveLength(1);
    });

    it('ArrowDown moves focus to the next item and prevents default', () => {
      items()[0]!.focus();
      const e = press(items()[0]!, 'ArrowDown');
      expect(document.activeElement).toBe(items()[1]);
      expect(e.defaultPrevented).toBe(true);
    });

    it('ArrowUp wraps to the last item from the first', () => {
      items()[0]!.focus();
      press(items()[0]!, 'ArrowUp');
      expect(document.activeElement).toBe(items()[2]);
    });

    it('ArrowDown wraps to the first item from the last', () => {
      items()[2]!.focus();
      press(items()[2]!, 'ArrowDown');
      expect(document.activeElement).toBe(items()[0]);
    });

    it('Home and End focus the first and last item', () => {
      items()[1]!.focus();
      press(items()[1]!, 'End');
      expect(document.activeElement).toBe(items()[2]);
      press(items()[2]!, 'Home');
      expect(document.activeElement).toBe(items()[0]);
    });

    it('typing jumps to the next item starting with the characters', () => {
      items()[0]!.focus();
      press(items()[0]!, 'c');
      expect(document.activeElement).toBe(items()[2]);
    });

    it('skips disabled items', async () => {
      items()[1]!.disabled = true;
      await el.updateComplete;
      items()[0]!.focus();
      press(items()[0]!, 'ArrowDown');
      expect(document.activeElement).toBe(items()[2]);
    });

    it('does not touch arrow keys pressed elsewhere on the page (a textarea, say)', () => {
      const area = document.createElement('textarea');
      document.body.appendChild(area);
      area.focus();
      const e = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      area.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(area);
      area.remove();
    });

    it('ignores keys while closed', async () => {
      el.open = false;
      await el.updateComplete;
      const e = press(items()[0]!, 'ArrowDown');
      expect(e.defaultPrevented).toBe(false);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-menu') as VoidMenu;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});

describe('VoidMenuItem', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidMenuItem)).toBe(VoidElement);
    });

    it('is registered as void-menu-item', () => {
      expect(customElements.get('void-menu-item')).toBe(VoidMenuItem);
    });
  });

  describe('default property values', () => {
    let el: VoidMenuItem;

    beforeEach(() => {
      el = document.createElement('void-menu-item') as VoidMenuItem;
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('has no icon or shortcut property: those are parts', () => {
      expect('icon' in el).toBe(false);
      expect('shortcut' in el).toBe(false);
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidMenuItem;

    beforeEach(async () => {
      el = document.createElement('void-menu-item') as VoidMenuItem;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="menuitem"', () => {
      expect(el.getAttribute('role')).toBe('menuitem');
    });

    it('is not a tab stop by itself (the menu roves tabindex)', () => {
      expect(el.getAttribute('tabindex')).toBe('-1');
    });

    it('stays at tabindex="-1" when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.getAttribute('tabindex')).toBe('-1');
    });

    it('sets aria-disabled when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('void-select event', () => {
    let el: VoidMenuItem;

    beforeEach(async () => {
      el = document.createElement('void-menu-item') as VoidMenuItem;
      el.value = 'test-val';
      el.textContent = 'Test';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('dispatches void-select on click with the item and its value, as dropdown-menu-item does', () => {
      let detail: { item: unknown; value: string } | null = null;
      el.addEventListener('void-select', (e) => { detail = (e as CustomEvent).detail; });
      el.click();
      expect(detail?.value).toBe('test-val');
      expect(detail?.item).toBe(el);
    });

    it('reflects value as an attribute', async () => {
      expect(el.getAttribute('value')).toBe('test-val');
    });

    it('void-select bubbles', () => {
      let firedOnParent = false;
      document.body.addEventListener('void-select', () => { firedOnParent = true; }, { once: true });
      el.click();
      expect(firedOnParent).toBe(true);
    });

    it('dispatches void-select on Enter key', () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-select', (e) => { detail = (e as CustomEvent).detail; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(detail?.value).toBe('test-val');
    });

    it('dispatches void-select on Space key', () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-select', (e) => { detail = (e as CustomEvent).detail; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(detail?.value).toBe('test-val');
    });

    it('does not dispatch void-select when disabled', () => {
      el.disabled = true;
      let fired = false;
      el.addEventListener('void-select', () => { fired = true; });
      el.click();
      expect(fired).toBe(false);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-menu-item') as VoidMenuItem;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});

describe('VoidMenuGroup', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidMenuGroup)).toBe(VoidElement);
    });

    it('is registered as void-menu-group', () => {
      expect(customElements.get('void-menu-group')).toBe(VoidMenuGroup);
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidMenuGroup;

    beforeEach(async () => {
      el = document.createElement('void-menu-group') as VoidMenuGroup;
      el.innerHTML = '<void-menu-group-label>Actions</void-menu-group-label><void-menu-item>One</void-menu-item>';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="group"', () => {
      expect(el.getAttribute('role')).toBe('group');
    });

    it('is named by its label part, which gets an id only when it has none', () => {
      const label = el.querySelector('void-menu-group-label')!;
      expect(label.id).not.toBe('');
      expect(el.getAttribute('aria-labelledby')).toBe(label.id);
    });

    it('keeps an id the author wrote on the label', async () => {
      const g = document.createElement('void-menu-group') as VoidMenuGroup;
      g.innerHTML = '<void-menu-group-label id="mine">Mine</void-menu-group-label>';
      document.body.appendChild(g);
      await g.updateComplete;
      expect(g.getAttribute('aria-labelledby')).toBe('mine');
      g.remove();
    });

    it('renders nothing of its own', () => {
      expect(Array.from(el.children).map(c => c.localName)).toEqual(['void-menu-group-label', 'void-menu-item']);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-menu-group') as VoidMenuGroup;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
