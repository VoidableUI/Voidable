// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidButton } from '../../src/components/button.js';

// VoidButton self-registers with a guard; ensure it's defined before tests run.
const TAG = 'void-button';

function createElement(): VoidButton {
  return document.createElement(TAG) as VoidButton;
}

describe('VoidButton', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidButton)).toBe(VoidElement);
    });

    it('is registered as void-button', () => {
      expect(customElements.get(TAG)).toBe(VoidButton);
    });
  });

  describe('default property values', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
    });

    it('variant defaults to outline', () => {
      expect(el.variant).toBe('outline');
    });

    it('color defaults to default', () => {
      expect(el.color).toBe('default');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('type defaults to button', () => {
      expect(el.type).toBe('button');
    });

    it('size defaults to md', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('attribute reflection', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('reflects variant to attribute', async () => {
      el.variant = 'filled';
      await el.updateComplete;
      expect(el.getAttribute('variant')).toBe('filled');
    });

    it('reflects color to attribute', async () => {
      el.color = 'error';
      await el.updateComplete;
      expect(el.getAttribute('color')).toBe('error');
    });

    it('reflects disabled to attribute', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('removes disabled attribute when set to false', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(false);
    });

    it('reflects size to attribute', async () => {
      el.size = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidButton;

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

    it('sets aria-disabled="false" on connect', () => {
      expect(el.getAttribute('aria-disabled')).toBe('false');
    });

    it('updates aria-disabled when disabled changes', async () => {
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

  describe('void-click event', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('dispatches void-click on click', () => {
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.click();
      expect(fired).toBe(true);
    });

    it('does not dispatch void-click when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;

      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.click();
      expect(fired).toBe(false);
    });

    it('void-click bubbles', () => {
      let firedOnParent = false;
      document.body.addEventListener('void-click', () => { firedOnParent = true; }, { once: true });
      el.click();
      expect(firedOnParent).toBe(true);
    });
  });

  describe('keyboard handling', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('Enter key dispatches void-click', () => {
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('Space key dispatches void-click', () => {
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('Enter key does not dispatch void-click when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;

      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(fired).toBe(false);
    });

    it('Space key does not dispatch void-click when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;

      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(fired).toBe(false);
    });

    it('other keys do not dispatch void-click', () => {
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(fired).toBe(false);
    });
  });

  describe('form association', () => {
    it('resets the form when type="reset" and clicked', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.name = 'field';
      input.defaultValue = 'initial';
      form.appendChild(input);

      const el = createElement();
      el.type = 'reset';
      form.appendChild(el);
      document.body.appendChild(form);

      input.value = 'changed';
      el.click();
      // After reset, value returns to the element's defaultValue.
      expect(input.value).toBe('initial');
    });
  });
});
