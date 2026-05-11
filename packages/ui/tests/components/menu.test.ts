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

function createMenu(items: Array<{ value: string; label: string; disabled?: boolean }>): VoidMenu {
  const el = document.createElement('void-menu') as VoidMenu;
  for (const item of items) {
    const mi = document.createElement('void-menu-item') as VoidMenuItem;
    mi.value = item.value;
    mi.textContent = item.label;
    if (item.disabled) mi.disabled = true;
    el.appendChild(mi);
  }
  return el;
}

function createGroupedMenu(): VoidMenu {
  const el = document.createElement('void-menu') as VoidMenu;
  const g1 = document.createElement('void-menu-group') as VoidMenuGroup;
  g1.label = 'File';
  const i1 = document.createElement('void-menu-item') as VoidMenuItem;
  i1.value = 'new'; i1.textContent = 'New File';
  const i2 = document.createElement('void-menu-item') as VoidMenuItem;
  i2.value = 'open'; i2.textContent = 'Open File';
  g1.appendChild(i1);
  g1.appendChild(i2);
  el.appendChild(g1);
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

    it('searchable defaults to false', () => {
      expect(el.searchable).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('placeholder defaults to "Search..."', () => {
      expect(el.placeholder).toBe('Search...');
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidMenu;

    beforeEach(async () => {
      el = document.createElement('void-menu') as VoidMenu;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="menu" on host', () => {
      expect(el.getAttribute('role')).toBe('menu');
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

    it('does not render list when closed', () => {
      expect(el.querySelector('.void-menu-list')).toBeNull();
    });

    it('renders list when open', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.querySelector('.void-menu-list')).not.toBeNull();
    });

    it('reflects open attribute', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('closes on Escape key', async () => {
      el.open = true;
      await el.updateComplete;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
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
      ]);
      el.searchable = true;
      el.open = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('renders search input when searchable', () => {
      expect(el.querySelector('.void-menu-search')).not.toBeNull();
    });

    it('does not render search input when not searchable', async () => {
      el.searchable = false;
      await el.updateComplete;
      expect(el.querySelector('.void-menu-search')).toBeNull();
    });

    it('filters items based on text input', async () => {
      const input = el.querySelector('.void-menu-search') as HTMLInputElement;
      input.value = 'bravo';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      const items = el.querySelectorAll('void-menu-item:not([hidden])');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('Bravo');
    });

    it('filtering is case-insensitive', async () => {
      const input = el.querySelector('.void-menu-search') as HTMLInputElement;
      input.value = 'ALPHA';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      const items = el.querySelectorAll('void-menu-item:not([hidden])');
      expect(items.length).toBe(1);
    });

    it('shows empty state when no match', async () => {
      const input = el.querySelector('.void-menu-search') as HTMLInputElement;
      input.value = 'zzz';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-menu-empty')).not.toBeNull();
    });

    it('removes empty state when items match again', async () => {
      const input = el.querySelector('.void-menu-search') as HTMLInputElement;
      input.value = 'zzz';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      input.value = '';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-menu-empty')).toBeNull();
    });

    it('filters by value attribute too', async () => {
      const input = el.querySelector('.void-menu-search') as HTMLInputElement;
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

    it('ArrowDown focuses first item from none', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const items = el.querySelectorAll('void-menu-item');
      expect(document.activeElement).toBe(items[0]);
    });

    it('ArrowDown moves focus to next item', () => {
      const items = el.querySelectorAll<HTMLElement>('void-menu-item');
      items[0].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(items[1]);
    });

    it('ArrowUp wraps to last item from first', () => {
      const items = el.querySelectorAll<HTMLElement>('void-menu-item');
      items[0].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(document.activeElement).toBe(items[2]);
    });

    it('ArrowDown wraps to first item from last', () => {
      const items = el.querySelectorAll<HTMLElement>('void-menu-item');
      items[2].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(items[0]);
    });

    it('skips disabled items', async () => {
      const items = el.querySelectorAll<VoidMenuItem>('void-menu-item');
      items[1].disabled = true;
      await el.updateComplete;
      items[0].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(items[2]);
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

    it('shortcut defaults to empty string', () => {
      expect(el.shortcut).toBe('');
    });

    it('icon defaults to empty string', () => {
      expect(el.icon).toBe('');
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

    it('sets tabindex="0" when not disabled', () => {
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('sets tabindex="-1" when disabled', async () => {
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

    it('dispatches void-select on click', () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-select', (e) => { detail = (e as CustomEvent).detail; });
      el.click();
      expect(detail?.value).toBe('test-val');
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

  describe('default property values', () => {
    let el: VoidMenuGroup;

    beforeEach(() => {
      el = document.createElement('void-menu-group') as VoidMenuGroup;
    });

    it('label defaults to empty string', () => {
      expect(el.label).toBe('');
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidMenuGroup;

    beforeEach(async () => {
      el = document.createElement('void-menu-group') as VoidMenuGroup;
      el.label = 'Actions';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="group"', () => {
      expect(el.getAttribute('role')).toBe('group');
    });

    it('sets aria-label from label property', () => {
      expect(el.getAttribute('aria-label')).toBe('Actions');
    });
  });

  describe('rendering', () => {
    let el: VoidMenuGroup;

    beforeEach(async () => {
      el = document.createElement('void-menu-group') as VoidMenuGroup;
      el.label = 'File';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('renders group label', () => {
      const labelEl = el.querySelector('.void-menu-group-label');
      expect(labelEl).not.toBeNull();
      expect(labelEl!.textContent).toBe('File');
    });

    it('renders items container', () => {
      expect(el.querySelector('.void-menu-group-items')).not.toBeNull();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-menu-group') as VoidMenuGroup;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
