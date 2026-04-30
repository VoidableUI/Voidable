// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDrawer } from '../../src/components/drawer.js';

const TAG = 'void-drawer';

function createElement(): VoidDrawer {
  return document.createElement(TAG) as VoidDrawer;
}

describe('VoidDrawer', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidDrawer)).toBe(VoidElement);
    });

    it('is registered as void-drawer', () => {
      expect(customElements.get(TAG)).toBe(VoidDrawer);
    });
  });

  describe('default property values', () => {
    let el: VoidDrawer;

    beforeEach(() => {
      el = createElement();
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });

    it('side defaults to "right"', () => {
      expect(el.side).toBe('right');
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('heading defaults to empty string', () => {
      expect(el.heading).toBe('');
    });

    it('closable defaults to true', () => {
      expect(el.closable).toBe(true);
    });
  });

  describe('ARIA', () => {
    let el: VoidDrawer;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="dialog" on connect', () => {
      expect(el.getAttribute('role')).toBe('dialog');
    });

    it('sets aria-modal="true" on connect', () => {
      expect(el.getAttribute('aria-modal')).toBe('true');
    });

    it('sets aria-label from heading when heading is set', async () => {
      el.heading = 'Settings';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Settings');
    });

    it('removes aria-label when heading is cleared', async () => {
      el.heading = 'Settings';
      await el.updateComplete;
      el.heading = '';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBeNull();
    });
  });

  describe('attribute reflection', () => {
    let el: VoidDrawer;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    it('reflects open to attribute', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('reflects side to attribute', async () => {
      el.side = 'left';
      await el.updateComplete;
      expect(el.getAttribute('side')).toBe('left');
    });

    it('reflects size to attribute', async () => {
      el.size = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });

    it('reads side from attribute', () => {
      el.setAttribute('side', 'bottom');
      expect(el.side).toBe('bottom');
    });

    it('reads size from attribute', () => {
      el.setAttribute('size', 'sm');
      expect(el.size).toBe('sm');
    });
  });

  describe('rendering', () => {
    let el: VoidDrawer;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('renders nothing when closed', () => {
      expect(el.querySelector('.void-drawer-backdrop')).toBeNull();
      expect(el.querySelector('.void-drawer-panel')).toBeNull();
    });

    it('renders backdrop and panel when open', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.querySelector('.void-drawer-backdrop')).not.toBeNull();
      expect(el.querySelector('.void-drawer-panel')).not.toBeNull();
    });

    it('renders heading when heading is set', async () => {
      el.heading = 'My Drawer';
      el.open = true;
      await el.updateComplete;
      const heading = el.querySelector('.void-drawer-heading');
      expect(heading).not.toBeNull();
      expect(heading?.textContent).toBe('My Drawer');
    });

    it('does not render heading element when heading is empty', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.querySelector('.void-drawer-heading')).toBeNull();
    });

    it('renders close button when closable', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.querySelector('.void-drawer-close')).not.toBeNull();
    });

    it('does not render close button when not closable', async () => {
      el.closable = false;
      el.open = true;
      await el.updateComplete;
      expect(el.querySelector('.void-drawer-close')).toBeNull();
    });

    it('renders body element when open', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.querySelector('.void-drawer-body')).not.toBeNull();
    });
  });

  describe('close behavior', () => {
    let el: VoidDrawer;

    beforeEach(async () => {
      el = createElement();
      el.open = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('closes when close button is clicked', async () => {
      const btn = el.querySelector('.void-drawer-close') as HTMLButtonElement;
      btn.click();
      expect(el.open).toBe(false);
    });

    it('dispatches void-close event when close button is clicked', async () => {
      let fired = false;
      el.addEventListener('void-close', () => { fired = true; });
      const btn = el.querySelector('.void-drawer-close') as HTMLButtonElement;
      btn.click();
      expect(fired).toBe(true);
    });

    it('void-close event bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-close', () => { firedOnParent = true; }, { once: true });
      const btn = el.querySelector('.void-drawer-close') as HTMLButtonElement;
      btn.click();
      expect(firedOnParent).toBe(true);
    });

    it('closes on backdrop click', async () => {
      const backdrop = el.querySelector('.void-drawer-backdrop') as HTMLElement;
      backdrop.click();
      expect(el.open).toBe(false);
    });

    it('dispatches void-close on backdrop click', async () => {
      let fired = false;
      el.addEventListener('void-close', () => { fired = true; });
      const backdrop = el.querySelector('.void-drawer-backdrop') as HTMLElement;
      backdrop.click();
      expect(fired).toBe(true);
    });

    it('closes on Escape key', async () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(el.open).toBe(false);
    });

    it('dispatches void-close on Escape key', async () => {
      let fired = false;
      el.addEventListener('void-close', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('does not close on Escape when not closable', async () => {
      el.closable = false;
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(el.open).toBe(true);
    });

    it('does not close on backdrop click when not closable', async () => {
      el.closable = false;
      el.open = true;
      await el.updateComplete;
      const backdrop = el.querySelector('.void-drawer-backdrop') as HTMLElement;
      backdrop?.click();
      expect(el.open).toBe(true);
    });

    it('other keys do not close the drawer', async () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(el.open).toBe(true);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
