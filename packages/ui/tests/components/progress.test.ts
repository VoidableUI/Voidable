// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidProgress } from '../../src/components/progress.js';

describe('VoidProgress', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidProgress)).toBe(VoidElement);
  });

  it('registers as void-progress custom element', () => {
    expect(customElements.get('void-progress')).toBe(VoidProgress);
  });

  describe('default properties', () => {
    let el: VoidProgress;

    beforeEach(() => {
      el = document.createElement('void-progress') as VoidProgress;
    });

    it('defaults value to 0', () => {
      expect(el.value).toBe(0);
    });

    it('defaults max to 100', () => {
      expect(el.max).toBe(100);
    });

    it('defaults color to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('defaults size to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('defaults indeterminate to false', () => {
      expect(el.indeterminate).toBe(false);
    });
  });

  describe('ARIA', () => {
    let el: VoidProgress;

    beforeEach(() => {
      el = document.createElement('void-progress') as VoidProgress;
      document.body.appendChild(el);
    });

    it('sets role="progressbar" on connect', () => {
      expect(el.getAttribute('role')).toBe('progressbar');
    });

    it('sets aria-valuemin="0" on connect', () => {
      expect(el.getAttribute('aria-valuemin')).toBe('0');
    });

    it('sets aria-valuemax from max on connect', () => {
      expect(el.getAttribute('aria-valuemax')).toBe('100');
    });

    it('sets aria-valuenow from value on connect', () => {
      expect(el.getAttribute('aria-valuenow')).toBe('0');
    });

    it('updates aria-valuenow when value changes', async () => {
      el.value = 50;
      await el.updateComplete;
      expect(el.getAttribute('aria-valuenow')).toBe('50');
    });

    it('updates aria-valuemax when max changes', async () => {
      el.max = 200;
      await el.updateComplete;
      expect(el.getAttribute('aria-valuemax')).toBe('200');
    });
  });

  describe('indeterminate', () => {
    it('removes aria-valuenow when indeterminate is set', async () => {
      const el = document.createElement('void-progress') as VoidProgress;
      document.body.appendChild(el);
      el.value = 40;
      await el.updateComplete;
      el.indeterminate = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-valuenow')).toBeNull();
    });

    it('restores aria-valuenow when indeterminate is cleared', async () => {
      const el = document.createElement('void-progress') as VoidProgress;
      el.indeterminate = true;
      document.body.appendChild(el);
      el.indeterminate = false;
      el.value = 75;
      await el.updateComplete;
      expect(el.getAttribute('aria-valuenow')).toBe('75');
    });
  });

  describe('value clamping', () => {
    let el: VoidProgress;

    beforeEach(async () => {
      el = document.createElement('void-progress') as VoidProgress;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('clamps fill width to 100% when value exceeds max', async () => {
      el.value = 150;
      await el.updateComplete;
      const fill = el.querySelector('.void-progress-fill') as HTMLElement;
      expect(fill.style.getPropertyValue('--void-progress-fill')).toBe('100%');
    });

    it('clamps fill width to 0% when value is negative', async () => {
      el.value = -10;
      await el.updateComplete;
      const fill = el.querySelector('.void-progress-fill') as HTMLElement;
      expect(fill.style.getPropertyValue('--void-progress-fill')).toBe('0%');
    });

    it('sets fill width to 50% when value is half of max', async () => {
      el.value = 50;
      await el.updateComplete;
      const fill = el.querySelector('.void-progress-fill') as HTMLElement;
      expect(fill.style.getPropertyValue('--void-progress-fill')).toBe('50%');
    });
  });
});
