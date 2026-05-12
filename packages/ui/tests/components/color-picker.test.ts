// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidColorPicker } from '../../src/components/color-picker.js';

const TAG = 'void-color-picker';

function createElement(): VoidColorPicker {
  return document.createElement(TAG) as VoidColorPicker;
}

describe('VoidColorPicker', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidColorPicker)).toBe(VoidElement);
    });

    it('is registered as void-color-picker', () => {
      expect(customElements.get(TAG)).toBe(VoidColorPicker);
    });
  });

  describe('default property values', () => {
    let el: VoidColorPicker;

    beforeEach(() => {
      el = createElement();
    });

    it('value defaults to #000000', () => {
      expect(el.value).toBe('#000000');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('size defaults to md', () => {
      expect(el.size).toBe('md');
    });

    it('swatches defaults to empty array', () => {
      expect(el.swatches).toEqual([]);
    });

    it('showInput defaults to true', () => {
      expect(el.showInput).toBe(true);
    });
  });

  describe('reflected attributes', () => {
    let el: VoidColorPicker;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('reflects value to attribute', async () => {
      el.value = '#ff0000';
      await el.updateComplete;
      expect(el.getAttribute('value')).toBe('#ff0000');
    });

    it('reflects disabled to attribute', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('reflects size to attribute', async () => {
      el.size = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });
  });

  describe('void-change event', () => {
    let el: VoidColorPicker;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-change on hex input change', async () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const input = el.querySelector('.void-color-picker-input') as HTMLInputElement;
      input.value = '#ff5500';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(detail).toEqual({ value: '#ff5500' });
    });

    it('void-change event bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const input = el.querySelector('.void-color-picker-input') as HTMLInputElement;
      input.value = '#00ff00';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(firedOnParent).toBe(true);
    });
  });

  describe('disabled state', () => {
    let el: VoidColorPicker;

    beforeEach(async () => {
      el = createElement();
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('disables the hex input when disabled', () => {
      const input = el.querySelector('.void-color-picker-input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('hex color validation', () => {
    it('accepts valid 6-digit hex', () => {
      expect(VoidColorPicker.isValidHex('#ff0000')).toBe(true);
    });

    it('accepts uppercase hex', () => {
      expect(VoidColorPicker.isValidHex('#FF0000')).toBe(true);
    });

    it('rejects short hex', () => {
      expect(VoidColorPicker.isValidHex('#f00')).toBe(false);
    });

    it('rejects missing hash', () => {
      expect(VoidColorPicker.isValidHex('ff0000')).toBe(false);
    });

    it('rejects invalid characters', () => {
      expect(VoidColorPicker.isValidHex('#gggggg')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(VoidColorPicker.isValidHex('')).toBe(false);
    });
  });

  describe('rendering', () => {
    let el: VoidColorPicker;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders the spectrum area', () => {
      expect(el.querySelector('.void-color-picker-area')).not.toBeNull();
    });

    it('renders the hue slider', () => {
      expect(el.querySelector('.void-color-picker-hue')).not.toBeNull();
    });

    it('renders the field swatch', () => {
      expect(el.querySelector('.void-color-picker-field-swatch')).not.toBeNull();
    });

    it('renders hex input by default', () => {
      expect(el.querySelector('.void-color-picker-input')).not.toBeNull();
    });

    it('hides hex input when showInput is false', async () => {
      el.showInput = false;
      await el.updateComplete;
      expect(el.querySelector('.void-color-picker-input')).toBeNull();
    });

    it('renders swatches when provided', async () => {
      el.swatches = ['#ff0000', '#00ff00', '#0000ff'];
      await el.updateComplete;
      const buttons = el.querySelectorAll('.void-color-picker-swatch');
      expect(buttons.length).toBe(3);
    });

    it('does not render swatches when empty', () => {
      expect(el.querySelector('.void-color-picker-swatches')).toBeNull();
    });
  });
});
