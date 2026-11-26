// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidScrollArea } from '../../src/components/scroll-area.js';

const TAG = 'void-scroll-area';

function createElement(): VoidScrollArea {
  return document.createElement(TAG) as VoidScrollArea;
}

describe('VoidScrollArea', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidScrollArea)).toBe(VoidElement);
    });

    it('is registered as void-scroll-area', () => {
      expect(customElements.get(TAG)).toBe(VoidScrollArea);
    });
  });

  describe('default property values', () => {
    let el: VoidScrollArea;

    beforeEach(() => {
      el = createElement();
    });

    it('maxHeight defaults to empty string', () => {
      expect(el.maxHeight).toBe('');
    });

    it('orientation defaults to "vertical"', () => {
      expect(el.orientation).toBe('vertical');
    });
  });

  describe('orientation reflection', () => {
    let el: VoidScrollArea;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('reflects orientation property to attribute', async () => {
      el.orientation = 'horizontal';
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('horizontal');
    });

    it('reflects both orientation to attribute', async () => {
      el.orientation = 'both';
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('both');
    });

    it('reflects vertical orientation to attribute', async () => {
      el.orientation = 'vertical';
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('vertical');
    });

    it('reads orientation from attribute', () => {
      el.setAttribute('orientation', 'horizontal');
      expect(el.orientation).toBe('horizontal');
    });

    it('reads both from attribute', () => {
      el.setAttribute('orientation', 'both');
      expect(el.orientation).toBe('both');
    });

    it('reads vertical from attribute', () => {
      el.setAttribute('orientation', 'vertical');
      expect(el.orientation).toBe('vertical');
    });
  });

  describe('rendering', () => {
    it('renders viewport div', async () => {
      const el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('.void-scroll-area-viewport')).not.toBeNull();
    });
  });

  describe('maxHeight', () => {
    it('sets max-height style on viewport when maxHeight is provided', async () => {
      const el = createElement();
      el.maxHeight = '400px';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.style.getPropertyValue('--void-scroll-area-max-height')).toBe('400px');
    });

    it('sets max-height with viewport unit', async () => {
      const el = createElement();
      el.maxHeight = '50vh';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.style.getPropertyValue('--void-scroll-area-max-height')).toBe('50vh');
    });

    it('clears max-height when maxHeight is empty string', async () => {
      const el = createElement();
      el.maxHeight = '400px';
      document.body.appendChild(el);
      await el.updateComplete;
      el.maxHeight = '';
      await el.updateComplete;
      const viewport = el.querySelector('.void-scroll-area-viewport') as HTMLElement;
      expect(viewport.style.maxHeight).toBe('');
    });
  });

  describe('child preservation', () => {
    it('moves children into viewport div', async () => {
      const el = createElement();
      const p = document.createElement('p');
      p.textContent = 'Hello';
      el.appendChild(p);
      document.body.appendChild(el);
      await el.updateComplete;
      const viewport = el.querySelector('.void-scroll-area-viewport')!;
      expect(viewport.contains(p)).toBe(true);
    });

    it('preserves multiple children in order', async () => {
      const el = createElement();
      const a = document.createElement('span');
      a.textContent = 'A';
      const b = document.createElement('span');
      b.textContent = 'B';
      el.appendChild(a);
      el.appendChild(b);
      document.body.appendChild(el);
      await el.updateComplete;
      const viewport = el.querySelector('.void-scroll-area-viewport')!;
      const children = Array.from(viewport.children);
      expect(children[0]).toBe(a);
      expect(children[1]).toBe(b);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
