// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidRadio } from '../../src/components/radio.js';

const TAG = 'void-radio';

function createElement(): VoidRadio {
  return document.createElement(TAG) as VoidRadio;
}

describe('VoidRadio', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidRadio)).toBe(VoidElement);
    });

    it('is registered as void-radio', () => {
      expect(customElements.get(TAG)).toBe(VoidRadio);
    });
  });

  describe('default property values', () => {
    let el: VoidRadio;

    beforeEach(() => {
      el = createElement();
    });

    it('checked defaults to false', () => {
      expect(el.checked).toBe(false);
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('name defaults to empty string', () => {
      expect(el.name).toBe('');
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('color defaults to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidRadio;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('sets role="radio" on connect', () => {
      expect(el.getAttribute('role')).toBe('radio');
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

  describe('selecting', () => {
    let el: VoidRadio;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('sets checked to true on click', () => {
      el.click();
      expect(el.checked).toBe(true);
    });

    it('does not uncheck on second click', () => {
      el.click();
      el.click();
      expect(el.checked).toBe(true);
    });
  });

  describe('void-change event', () => {
    let el: VoidRadio;

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

    it('void-change detail reflects checked state and value', () => {
      el.value = 'option-a';
      let detail: { value: string; checked: boolean } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      el.click();
      expect(detail).toEqual({ value: 'option-a', checked: true });
    });

    it('void-change bubbles', () => {
      let firedOnParent = false;
      document.body.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      el.click();
      expect(firedOnParent).toBe(true);
    });

    it('does not dispatch void-change when already checked', () => {
      el.checked = true;
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.click();
      expect(fired).toBe(false);
    });
  });

  describe('disabled blocks selection', () => {
    let el: VoidRadio;

    beforeEach(async () => {
      el = createElement();
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('does not set checked when disabled', () => {
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
    let el: VoidRadio;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('Space key sets checked to true', () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(el.checked).toBe(true);
    });

    it('Space key dispatches void-change', () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('Space does not select when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(el.checked).toBe(false);
    });

    it('other keys do not select', () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.checked).toBe(false);
    });
  });
});
