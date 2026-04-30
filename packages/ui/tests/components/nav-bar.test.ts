// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidNavBar } from '../../src/components/nav-bar.js';

const TAG = 'void-nav-bar';

function createElement(): VoidNavBar {
  return document.createElement(TAG) as VoidNavBar;
}

describe('VoidNavBar', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidNavBar)).toBe(VoidElement);
    });

    it('is registered as void-nav-bar', () => {
      expect(customElements.get(TAG)).toBe(VoidNavBar);
    });
  });

  describe('default property values', () => {
    let el: VoidNavBar;

    beforeEach(() => {
      el = createElement();
    });

    it('sticky defaults to false', () => {
      expect(el.sticky).toBe(false);
    });

    it('bordered defaults to true', () => {
      expect(el.bordered).toBe(true);
    });

    it('variant defaults to "default"', () => {
      expect(el.variant).toBe('default');
    });
  });

  describe('ARIA', () => {
    it('sets role="navigation" when connected', () => {
      const el = createElement();
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('navigation');
      el.remove();
    });
  });

  describe('property reflection', () => {
    let el: VoidNavBar;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('reflects sticky to attribute', async () => {
      el.sticky = true;
      await el.updateComplete;
      expect(el.hasAttribute('sticky')).toBe(true);
    });

    it('removes sticky attribute when false', async () => {
      el.sticky = true;
      await el.updateComplete;
      el.sticky = false;
      await el.updateComplete;
      expect(el.hasAttribute('sticky')).toBe(false);
    });

    it('reflects bordered to attribute', async () => {
      el.bordered = false;
      await el.updateComplete;
      expect(el.hasAttribute('bordered')).toBe(false);
    });

    it('reflects variant to attribute', async () => {
      el.variant = 'elevated';
      await el.updateComplete;
      expect(el.getAttribute('variant')).toBe('elevated');
    });

    it('reads sticky from attribute', () => {
      el.setAttribute('sticky', '');
      expect(el.sticky).toBe(true);
    });

    it('reads variant from attribute', () => {
      el.setAttribute('variant', 'elevated');
      expect(el.variant).toBe('elevated');
    });
  });

  describe('rendering', () => {
    it('renders .void-nav-bar-content div', async () => {
      const el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('.void-nav-bar-content')).not.toBeNull();
      el.remove();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });

    it('preserves user children inside .void-nav-bar-content', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<void-nav-bar><a href="#">Link</a></void-nav-bar>';
      document.body.appendChild(container);
      const el = container.querySelector(TAG) as VoidNavBar;
      await el.updateComplete;
      const content = el.querySelector('.void-nav-bar-content');
      expect(content?.querySelector('a')).not.toBeNull();
      container.remove();
    });
  });
});
