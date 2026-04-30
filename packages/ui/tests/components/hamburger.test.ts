// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidHamburger } from '../../src/components/hamburger.js';

const TAG = 'void-hamburger';

function createElement(): VoidHamburger {
  return document.createElement(TAG) as VoidHamburger;
}

describe('VoidHamburger', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidHamburger)).toBe(VoidElement);
    });

    it('is registered as void-hamburger', () => {
      expect(customElements.get(TAG)).toBe(VoidHamburger);
    });
  });

  describe('default property values', () => {
    let el: VoidHamburger;

    beforeEach(() => {
      el = createElement();
    });

    it('active defaults to false', () => {
      expect(el.active).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidHamburger;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('sets role="button" on connect', () => {
      expect(el.getAttribute('role')).toBe('button');
    });

    it('sets tabindex="0" on connect', () => {
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('sets aria-expanded="false" on connect', () => {
      expect(el.getAttribute('aria-expanded')).toBe('false');
    });

    it('sets aria-label="Menu" on connect', () => {
      expect(el.getAttribute('aria-label')).toBe('Menu');
    });

    it('updates aria-expanded when active changes', async () => {
      el.active = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-expanded')).toBe('true');
    });

    it('updates aria-label to "Close menu" when active', async () => {
      el.active = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Close menu');
    });

    it('restores aria-label to "Menu" when deactivated', async () => {
      el.active = true;
      await el.updateComplete;
      el.active = false;
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Menu');
    });
  });

  describe('toggling', () => {
    let el: VoidHamburger;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('toggles active to true on click', () => {
      el.click();
      expect(el.active).toBe(true);
    });

    it('toggles active back to false on second click', () => {
      el.click();
      el.click();
      expect(el.active).toBe(false);
    });
  });

  describe('void-toggle event', () => {
    let el: VoidHamburger;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('dispatches void-toggle on click', () => {
      let fired = false;
      el.addEventListener('void-toggle', () => { fired = true; });
      el.click();
      expect(fired).toBe(true);
    });

    it('void-toggle detail reflects new active state', () => {
      let detail: { active: boolean } | null = null;
      el.addEventListener('void-toggle', (e) => { detail = (e as CustomEvent).detail; });
      el.click();
      expect(detail).toEqual({ active: true });
    });

    it('void-toggle bubbles', () => {
      let firedOnParent = false;
      document.body.addEventListener('void-toggle', () => { firedOnParent = true; }, { once: true });
      el.click();
      expect(firedOnParent).toBe(true);
    });
  });

  describe('keyboard handling', () => {
    let el: VoidHamburger;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('Space key toggles active', () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(el.active).toBe(true);
    });

    it('Enter key toggles active', () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.active).toBe(true);
    });

    it('Space key dispatches void-toggle', () => {
      let fired = false;
      el.addEventListener('void-toggle', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('Enter key dispatches void-toggle', () => {
      let fired = false;
      el.addEventListener('void-toggle', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('other keys do not toggle', () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(el.active).toBe(false);
    });
  });

  describe('render', () => {
    let el: VoidHamburger;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders three line spans', () => {
      const lines = el.querySelectorAll('.void-hamburger-line');
      expect(lines.length).toBe(3);
    });

    it('renders a lines wrapper', () => {
      expect(el.querySelector('.void-hamburger-lines')).not.toBeNull();
    });
  });
});
