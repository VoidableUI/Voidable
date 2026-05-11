// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidSlider } from '../../src/components/slider.js';

const TAG = 'void-slider';

function createElement(): VoidSlider {
  return document.createElement(TAG) as VoidSlider;
}

describe('VoidSlider', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidSlider)).toBe(VoidElement);
    });

    it('is registered as void-slider', () => {
      expect(customElements.get(TAG)).toBe(VoidSlider);
    });
  });

  describe('default property values', () => {
    let el: VoidSlider;

    beforeEach(() => {
      el = createElement();
    });

    it('value defaults to 50', () => {
      expect(el.value).toBe(50);
    });

    it('min defaults to 0', () => {
      expect(el.min).toBe(0);
    });

    it('max defaults to 100', () => {
      expect(el.max).toBe(100);
    });

    it('step defaults to 1', () => {
      expect(el.step).toBe(1);
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('name defaults to empty string', () => {
      expect(el.name).toBe('');
    });

    it('showValue defaults to false', () => {
      expect(el.showValue).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('ARIA', () => {
    let el: VoidSlider;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('sets role="slider" on connect', () => {
      expect(el.getAttribute('role')).toBe('slider');
    });

    it('sets aria-valuemin on connect', () => {
      expect(el.getAttribute('aria-valuemin')).toBe('0');
    });

    it('sets aria-valuemax on connect', () => {
      expect(el.getAttribute('aria-valuemax')).toBe('100');
    });

    it('sets aria-valuenow on connect', () => {
      expect(el.getAttribute('aria-valuenow')).toBe('50');
    });

    it('updates aria-valuenow when value changes', async () => {
      el.value = 75;
      await el.updateComplete;
      expect(el.getAttribute('aria-valuenow')).toBe('75');
    });

    it('updates aria-valuemin when min changes', async () => {
      el.min = 10;
      await el.updateComplete;
      expect(el.getAttribute('aria-valuemin')).toBe('10');
    });

    it('updates aria-valuemax when max changes', async () => {
      el.max = 200;
      await el.updateComplete;
      expect(el.getAttribute('aria-valuemax')).toBe('200');
    });
  });

  describe('rendering', () => {
    let el: VoidSlider;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders a native range input', () => {
      const input = el.querySelector('input[type="range"]');
      expect(input).not.toBeNull();
    });

    it('input has correct min attribute', () => {
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.getAttribute('min')).toBe('0');
    });

    it('input has correct max attribute', () => {
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.getAttribute('max')).toBe('100');
    });

    it('input has correct step attribute', () => {
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.getAttribute('step')).toBe('1');
    });

    it('sets --void-slider-fill CSS variable on input', () => {
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.style.getPropertyValue('--void-slider-fill')).toBe('50%');
    });

    it('does not render value label when showValue is false', () => {
      const label = el.querySelector('.void-slider-value');
      expect(label).toBeNull();
    });

    it('renders value label when showValue is true', async () => {
      el.showValue = true;
      await el.updateComplete;
      const label = el.querySelector('.void-slider-value');
      expect(label).not.toBeNull();
    });

    it('value label shows current value', async () => {
      el.showValue = true;
      el.value = 42;
      await el.updateComplete;
      const label = el.querySelector('.void-slider-value');
      expect(label?.textContent).toBe('42');
    });
  });

  describe('fill calculation', () => {
    let el: VoidSlider;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('computes 50% fill at default value', () => {
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.style.getPropertyValue('--void-slider-fill')).toBe('50%');
    });

    it('computes 0% fill at min value', async () => {
      el.value = 0;
      await el.updateComplete;
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.style.getPropertyValue('--void-slider-fill')).toBe('0%');
    });

    it('computes 100% fill at max value', async () => {
      el.value = 100;
      await el.updateComplete;
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.style.getPropertyValue('--void-slider-fill')).toBe('100%');
    });

    it('computes 25% fill at quarter of range', async () => {
      el.value = 25;
      await el.updateComplete;
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.style.getPropertyValue('--void-slider-fill')).toBe('25%');
    });
  });

  describe('void-input event', () => {
    let el: VoidSlider;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-input on input event', async () => {
      let fired = false;
      el.addEventListener('void-input', () => { fired = true; });
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      input.value = '70';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(fired).toBe(true);
    });

    it('void-input detail contains numeric value', () => {
      let detail: { value: number } | null = null;
      el.addEventListener('void-input', (e) => { detail = (e as CustomEvent).detail; });
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      input.value = '70';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(detail).toEqual({ value: 70 });
    });

    it('void-input bubbles', () => {
      let firedOnParent = false;
      document.body.addEventListener('void-input', () => { firedOnParent = true; }, { once: true });
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      input.value = '60';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(firedOnParent).toBe(true);
    });
  });

  describe('void-change event', () => {
    let el: VoidSlider;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-change on change event', () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      input.value = '80';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(fired).toBe(true);
    });

    it('void-change detail contains numeric value', () => {
      let detail: { value: number } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      input.value = '80';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(detail).toEqual({ value: 80 });
    });

    it('void-change bubbles', () => {
      let firedOnParent = false;
      document.body.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      input.value = '80';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(firedOnParent).toBe(true);
    });
  });

  describe('reflected attributes', () => {
    let el: VoidSlider;

    beforeEach(() => {
      el = createElement();
    });

    it('reflects disabled to attribute', async () => {
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('reflects name to attribute', async () => {
      el.name = 'volume';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('name')).toBe('volume');
    });

    it('reflects showValue to attribute', async () => {
      el.showValue = true;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.hasAttribute('showvalue')).toBe(true);
    });

    it('reflects size to attribute', async () => {
      el.size = 'lg';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });
  });
});
