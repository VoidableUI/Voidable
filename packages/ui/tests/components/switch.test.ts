// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidSwitch } from '../../src/components/switch.js';

const TAG = 'void-switch';

function createElement(): VoidSwitch {
  return document.createElement(TAG) as VoidSwitch;
}

describe('VoidSwitch', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidSwitch)).toBe(VoidElement);
    });

    it('is registered as void-switch', () => {
      expect(customElements.get(TAG)).toBe(VoidSwitch);
    });
  });

  describe('default property values', () => {
    let el: VoidSwitch;

    beforeEach(() => {
      el = createElement();
    });

    it('checked defaults to false', () => {
      expect(el.checked).toBe(false);
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('color defaults to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidSwitch;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('sets role="switch" on connect', () => {
      expect(el.getAttribute('role')).toBe('switch');
    });

    it('sets tabindex="0" on connect when not disabled', () => {
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('sets aria-checked="false" on connect', () => {
      expect(el.getAttribute('aria-checked')).toBe('false');
    });

    it('updates aria-checked when checked changes', async () => {
      el.checked = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-checked')).toBe('true');
    });

    it('sets aria-disabled when disabled changes', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-disabled')).toBe('true');
    });

    it('sets tabindex="-1" when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.getAttribute('tabindex')).toBe('-1');
    });

    it('restores tabindex="0" when re-enabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      expect(el.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('toggling', () => {
    let el: VoidSwitch;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('toggles checked to true on click', () => {
      el.click();
      expect(el.checked).toBe(true);
    });

    it('toggles checked back to false on second click', () => {
      el.click();
      el.click();
      expect(el.checked).toBe(false);
    });
  });

  describe('void-change event', () => {
    let el: VoidSwitch;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('dispatches void-change on click', () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.click();
      expect(fired).toBe(true);
    });

    it('void-change detail reflects new checked state', () => {
      let detail: { checked: boolean } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      el.click();
      expect(detail).toEqual({ checked: true });
    });

    it('void-change bubbles', () => {
      let firedOnParent = false;
      document.body.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      el.click();
      expect(firedOnParent).toBe(true);
    });
  });

  describe('disabled blocks toggle', () => {
    let el: VoidSwitch;

    beforeEach(async () => {
      el = createElement();
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('does not toggle checked when disabled', () => {
      el.click();
      expect(el.checked).toBe(false);
    });

    it('does not dispatch void-change when disabled', () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.click();
      expect(fired).toBe(false);
    });
  });

  describe('keyboard handling', () => {
    let el: VoidSwitch;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('Space key toggles checked', () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(el.checked).toBe(true);
    });

    it('Enter key toggles checked', () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.checked).toBe(true);
    });

    it('Space key dispatches void-change', () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('Enter key dispatches void-change', () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('Space does not toggle when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(el.checked).toBe(false);
    });

    it('Enter does not toggle when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.checked).toBe(false);
    });

    it('other keys do not toggle', () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(el.checked).toBe(false);
    });
  });
});
