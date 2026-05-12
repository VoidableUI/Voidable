// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidNavMenu, VoidNavMenuItem } from '../../src/components/nav-menu.js';

const MENU_TAG = 'void-nav-menu';
const ITEM_TAG = 'void-nav-menu-item';

function createMenu(): VoidNavMenu {
  return document.createElement(MENU_TAG) as VoidNavMenu;
}

function createItem(): VoidNavMenuItem {
  return document.createElement(ITEM_TAG) as VoidNavMenuItem;
}

describe('VoidNavMenu', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidNavMenu)).toBe(VoidElement);
    });

    it('is registered as void-nav-menu', () => {
      expect(customElements.get(MENU_TAG)).toBe(VoidNavMenu);
    });
  });

  describe('default property values', () => {
    let el: VoidNavMenu;

    beforeEach(() => {
      el = createMenu();
    });

    it('orientation defaults to "horizontal"', () => {
      expect(el.orientation).toBe('horizontal');
    });
  });

  describe('ARIA', () => {
    it('sets role="menubar" when connected', () => {
      const el = createMenu();
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('menubar');
      el.remove();
    });
  });

  describe('property reflection', () => {
    let el: VoidNavMenu;

    beforeEach(() => {
      el = createMenu();
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    it('reflects orientation to attribute', async () => {
      el.orientation = 'vertical';
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('vertical');
    });

    it('reads orientation from attribute', () => {
      el.setAttribute('orientation', 'vertical');
      expect(el.orientation).toBe('vertical');
    });
  });
});

describe('VoidNavMenuItem', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidNavMenuItem)).toBe(VoidElement);
    });

    it('is registered as void-nav-menu-item', () => {
      expect(customElements.get(ITEM_TAG)).toBe(VoidNavMenuItem);
    });
  });

  describe('default property values', () => {
    let el: VoidNavMenuItem;

    beforeEach(() => {
      el = createItem();
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('href defaults to empty string', () => {
      expect(el.href).toBe('');
    });

    it('active defaults to false', () => {
      expect(el.active).toBe(false);
    });
  });

  describe('open state', () => {
    let el: VoidNavMenuItem;

    beforeEach(async () => {
      el = createItem();
      el.textContent = 'Products';
      const dropdown = document.createElement('div');
      dropdown.textContent = 'Dropdown content';
      el.appendChild(dropdown);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('opens when open is set to true', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('closes when open is set to false', async () => {
      el.open = true;
      await el.updateComplete;
      el.open = false;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(false);
    });
  });

  describe('disabled prevents opening', () => {
    let el: VoidNavMenuItem;

    beforeEach(async () => {
      el = createItem();
      el.disabled = true;
      el.textContent = 'Products';
      const dropdown = document.createElement('div');
      dropdown.textContent = 'Dropdown';
      el.appendChild(dropdown);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('mouseenter does not open when disabled', async () => {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      // Wait for any potential timeout
      await new Promise(resolve => setTimeout(resolve, 200));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });
  });

  describe('events', () => {
    let el: VoidNavMenuItem;

    beforeEach(async () => {
      el = createItem();
      el.textContent = 'Products';
      const dropdown = document.createElement('div');
      dropdown.textContent = 'Dropdown content';
      el.appendChild(dropdown);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('dispatches void-open when opened', async () => {
      let fired = false;
      el.addEventListener('void-open', () => { fired = true; });
      el.open = false;
      // Simulate opening via internal method by triggering mouseenter
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 200));
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('dispatches void-close when closed', async () => {
      // First open it
      el.open = true;
      await el.updateComplete;
      let fired = false;
      el.addEventListener('void-close', () => { fired = true; });
      // Simulate closing via mouseleave
      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 400));
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-open bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-open', () => { firedOnParent = true; }, { once: true });
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 200));
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });
  });

  describe('active attribute', () => {
    let el: VoidNavMenuItem;

    beforeEach(() => {
      el = createItem();
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    it('reflects active to attribute', async () => {
      el.active = true;
      await el.updateComplete;
      expect(el.hasAttribute('active')).toBe(true);
    });

    it('removes active attribute when false', async () => {
      el.active = true;
      await el.updateComplete;
      el.active = false;
      await el.updateComplete;
      expect(el.hasAttribute('active')).toBe(false);
    });
  });

  describe('trigger rendering', () => {
    it('renders a button trigger when no href', async () => {
      const el = createItem();
      el.textContent = 'Products';
      document.body.appendChild(el);
      await el.updateComplete;
      const trigger = el.querySelector('.void-nav-menu-trigger');
      expect(trigger).not.toBeNull();
      expect(trigger?.tagName.toLowerCase()).toBe('button');
      el.remove();
    });

    it('renders an anchor trigger when href is set', async () => {
      const el = createItem();
      el.href = '/products';
      el.textContent = 'Products';
      document.body.appendChild(el);
      await el.updateComplete;
      const trigger = el.querySelector('.void-nav-menu-trigger');
      expect(trigger).not.toBeNull();
      expect(trigger?.tagName.toLowerCase()).toBe('a');
      el.remove();
    });
  });

  describe('disabled reflection', () => {
    let el: VoidNavMenuItem;

    beforeEach(() => {
      el = createItem();
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    it('reflects disabled to attribute', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('removes disabled attribute when false', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createItem();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
