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
      expect(VoidSlider.prototype).toBeInstanceOf(VoidElement);
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

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('has no role or value attributes on the host: the native range input is the slider', () => {
      for (const name of ['role', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow']) {
        expect(el.hasAttribute(name), name).toBe(false);
      }
    });

    it('keeps value and bounds on the native range input', async () => {
      el.min = 10;
      el.max = 200;
      el.value = 75;
      await el.updateComplete;
      const input = el.querySelector('input[type="range"]') as HTMLInputElement;
      expect(input.min).toBe('10');
      expect(input.max).toBe('200');
      expect(input.value).toBe('75');
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
      expect(el.hasAttribute('show-value')).toBe(true);
    });

    it('reflects size to attribute', async () => {
      el.size = 'lg';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });
  });
});

describe('VoidSlider native input order (#140)', () => {
  it('writes min and max to the input before the render writes its value', async () => {
    const el = createElement();
    el.min = 500;
    el.max = 3500;
    el.value = 2500;
    document.body.append(el);
    await el.updateComplete;
    const input = el.querySelector('input[type="range"]') as HTMLInputElement;
    const log: string[] = [];
    const set = input.setAttribute.bind(input);
    input.setAttribute = (n: string, v: string) => { log.push(n); set(n, v); };
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!;
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() { return desc.get!.call(this); },
      set(v) { log.push('value'); desc.set!.call(this, v); },
    });
    el.min = 1000;
    el.max = 5000;
    el.value = 4000;
    await el.updateComplete;
    expect(log.indexOf('min')).toBeGreaterThan(-1);
    expect(log.indexOf('min')).toBeLessThan(log.lastIndexOf('value'));
    expect(log.indexOf('max')).toBeLessThan(log.lastIndexOf('value'));
    el.remove();
  });
});
