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

/** An item written with its parts: a button trigger and a dropdown panel. */
function dropdownItem(label = 'Products'): VoidNavMenuItem {
  const el = createItem();
  el.innerHTML = `<void-nav-menu-trigger><button type="button">${label}</button></void-nav-menu-trigger><void-nav-menu-content><a href="/a">A</a></void-nav-menu-content>`;
  return el;
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

    it('active defaults to false', () => {
      expect(el.active).toBe(false);
    });
  });

  describe('open state', () => {
    let el: VoidNavMenuItem;

    beforeEach(async () => {
      el = dropdownItem();
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
      el = dropdownItem();
      el.disabled = true;
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
      el = dropdownItem();
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

  describe('explicit parts', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('renders nothing of its own and moves no node', async () => {
      const el = dropdownItem();
      const before = Array.from(el.querySelectorAll('*'));
      document.body.appendChild(el);
      await el.updateComplete;
      expect(Array.from(el.querySelectorAll('*'))).toEqual(before);
      expect(el.querySelector('.void-nav-menu-trigger, .void-nav-menu-content')).toBeNull();
    });

    it('gives the control the menubar ARIA and links it to the panel', async () => {
      const el = dropdownItem();
      document.body.appendChild(el);
      await el.updateComplete;
      const control = el.querySelector('button')!;
      const content = el.querySelector('void-nav-menu-content')!;
      expect(control.getAttribute('role')).toBe('menuitem');
      expect(control.getAttribute('aria-haspopup')).toBe('true');
      expect(control.getAttribute('aria-expanded')).toBe('false');
      expect(content.id).not.toBe('');
      expect(control.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('role')).toBe('menu');
      el.open = true;
      await el.updateComplete;
      expect(control.getAttribute('aria-expanded')).toBe('true');
    });

    it('a link entry with no panel takes no popup ARIA and navigates', async () => {
      const el = createItem();
      el.innerHTML = '<void-nav-menu-trigger><a href="/docs">Docs</a></void-nav-menu-trigger>';
      el.active = true;
      document.body.appendChild(el);
      await el.updateComplete;
      const link = el.querySelector('a')!;
      expect(link.getAttribute('role')).toBe('menuitem');
      expect(link.hasAttribute('aria-haspopup')).toBe(false);
      expect(link.hasAttribute('aria-expanded')).toBe(false);
      expect(link.getAttribute('aria-current')).toBe('page');
      link.click();
      expect(el.open).toBe(false);
    });

    it('never replaces an id or a role the author wrote', async () => {
      const el = createItem();
      el.innerHTML = '<void-nav-menu-trigger><button role="menuitem">P</button></void-nav-menu-trigger><void-nav-menu-content id="mine" role="group">x</void-nav-menu-content>';
      document.body.appendChild(el);
      await el.updateComplete;
      const content = el.querySelector('void-nav-menu-content')!;
      expect(content.id).toBe('mine');
      expect(content.getAttribute('role')).toBe('group');
      expect(el.querySelector('button')!.getAttribute('aria-controls')).toBe('mine');
    });

    it('wires a panel that arrives late and unwires one that is removed', async () => {
      const el = createItem();
      el.innerHTML = '<void-nav-menu-trigger><button>P</button></void-nav-menu-trigger>';
      document.body.appendChild(el);
      await el.updateComplete;
      const control = el.querySelector('button')!;
      expect(control.hasAttribute('aria-haspopup')).toBe(false);
      const content = document.createElement('void-nav-menu-content');
      content.textContent = 'x';
      el.appendChild(content);
      await new Promise(r => setTimeout(r, 0));
      expect(control.getAttribute('aria-haspopup')).toBe('true');
      content.remove();
      await new Promise(r => setTimeout(r, 0));
      expect(control.hasAttribute('aria-haspopup')).toBe(false);
      expect(control.hasAttribute('aria-controls')).toBe(false);
    });

    it('marks a disabled entry on its control', async () => {
      const el = dropdownItem();
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
      const control = el.querySelector('button')!;
      expect(control.hasAttribute('disabled')).toBe(true);
      expect(control.getAttribute('aria-disabled')).toBe('true');
      el.disabled = false;
      await el.updateComplete;
      expect(control.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('activation (one open or close per Enter, Space and click)', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    async function mountItem(): Promise<{ el: VoidNavMenuItem; opens: () => number; closes: () => number; button: HTMLButtonElement }> {
      const el = dropdownItem();
      document.body.appendChild(el);
      await el.updateComplete;
      let o = 0;
      let c = 0;
      el.addEventListener('void-open', () => o++);
      el.addEventListener('void-close', () => c++);
      return { el, opens: () => o, closes: () => c, button: el.querySelector('button')! };
    }

    it('a click on the button opens the panel, a second click closes it', async () => {
      const { el, opens, closes, button } = await mountItem();
      button.click();
      await el.updateComplete;
      expect(el.open).toBe(true);
      expect(opens()).toBe(1);
      button.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
      expect(closes()).toBe(1);
    });

    it('does not prevent the native click: a key that clicks a button toggles exactly once', async () => {
      const { el, opens, button } = await mountItem();
      // A browser turns Enter (keydown) and Space (keyup) on a button into one click each.
      const keydown = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      button.dispatchEvent(keydown);
      expect(keydown.defaultPrevented).toBe(false);
      button.click();
      await el.updateComplete;
      expect(opens()).toBe(1);
    });

    it('a click after the hover opened the panel keeps it open (pins it)', async () => {
      const { el, closes, button } = await mountItem();
      el.dispatchEvent(new MouseEvent('mouseenter'));
      await new Promise(r => setTimeout(r, 200));
      expect(el.open).toBe(true);
      button.click();
      expect(el.open).toBe(true);
      expect(closes()).toBe(0);
      button.click();
      expect(el.open).toBe(false);
    });

    it('opens on hover after the delay and closes after leaving', async () => {
      const { el } = await mountItem();
      el.dispatchEvent(new MouseEvent('mouseenter'));
      await new Promise(r => setTimeout(r, 200));
      expect(el.open).toBe(true);
      el.dispatchEvent(new MouseEvent('mouseleave'));
      await new Promise(r => setTimeout(r, 400));
      expect(el.open).toBe(false);
    });

    it('closes when focus leaves the item', async () => {
      const { el, button } = await mountItem();
      el.open = true;
      await el.updateComplete;
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
      expect(el.open).toBe(false);
    });
  });

  describe('menu keyboard', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('arrow keys move between the trigger controls, Escape closes and returns focus', async () => {
      const menu = createMenu();
      menu.innerHTML =
        '<void-nav-menu-item><void-nav-menu-trigger><button id="a">A</button></void-nav-menu-trigger><void-nav-menu-content><a id="inner" href="#">x</a></void-nav-menu-content></void-nav-menu-item>' +
        '<void-nav-menu-item><void-nav-menu-trigger><a id="b" href="/b">B</a></void-nav-menu-trigger></void-nav-menu-item>';
      document.body.appendChild(menu);
      await menu.updateComplete;
      const a = menu.querySelector<HTMLElement>('#a')!;
      const b = menu.querySelector<HTMLElement>('#b')!;
      a.focus();
      a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(document.activeElement).toBe(b);
      b.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(document.activeElement).toBe(a);
      const item = menu.querySelector<VoidNavMenuItem>('void-nav-menu-item')!;
      item.open = true;
      await item.updateComplete;
      const inner = menu.querySelector<HTMLElement>('#inner')!;
      inner.focus();
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(item.open).toBe(false);
      expect(document.activeElement).toBe(a);
    });

    it('opening one item closes the others', async () => {
      const menu = createMenu();
      menu.append(dropdownItem('A'), dropdownItem('B'));
      document.body.appendChild(menu);
      await menu.updateComplete;
      const [x, y] = Array.from(menu.querySelectorAll<VoidNavMenuItem>('void-nav-menu-item'));
      x!.querySelector('button')!.click();
      expect(x!.open).toBe(true);
      y!.querySelector('button')!.click();
      expect(y!.open).toBe(true);
      expect(x!.open).toBe(false);
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
