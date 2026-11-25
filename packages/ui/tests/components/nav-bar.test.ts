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

    it('reflects bordered=false as the string "false" so markup round-trips', async () => {
      el.bordered = false;
      await el.updateComplete;
      expect(el.getAttribute('bordered')).toBe('false');
    });

    it('turns bordered off from markup with bordered="false"', async () => {
      const off = document.createElement('void-nav-bar') as VoidNavBar;
      off.setAttribute('bordered', 'false');
      document.body.appendChild(off);
      await off.updateComplete;
      expect(off.bordered).toBe(false);
      off.remove();
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

  describe('structure', () => {
    it('renders nothing of its own and leaves the author nodes where they are', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<void-nav-bar><void-brand>Acme</void-brand><void-nav-links><a href="#" aria-current="page">Home</a></void-nav-links><void-spacer></void-spacer><button>Sign in</button></void-nav-bar>';
      document.body.appendChild(container);
      const el = container.querySelector(TAG) as VoidNavBar;
      const before = Array.from(el.children);
      await el.updateComplete;
      expect(Array.from(el.children)).toEqual(before);
      expect(el.querySelector('.void-nav-bar-content')).toBeNull();
      expect(el.getAttribute('role')).toBe('navigation');
      container.remove();
    });
  });
});
