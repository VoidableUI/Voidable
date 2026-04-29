// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidBadge } from '../../src/components/badge.js';

describe('VoidBadge', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidBadge)).toBe(VoidElement);
  });

  it('registers as void-badge custom element', () => {
    expect(customElements.get('void-badge')).toBe(VoidBadge);
  });

  describe('default properties', () => {
    let el: VoidBadge;

    beforeEach(() => {
      el = document.createElement('void-badge') as VoidBadge;
    });

    it('defaults color to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('defaults size to "md"', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('attribute reflection', () => {
    let el: VoidBadge;

    beforeEach(() => {
      el = document.createElement('void-badge') as VoidBadge;
      document.body.appendChild(el);
    });

    it('reflects color property to attribute', async () => {
      el.color = 'error';
      await el.updateComplete;
      expect(el.getAttribute('color')).toBe('error');
    });

    it('reflects size property to attribute', async () => {
      el.size = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });

    it('reads color from attribute', () => {
      el.setAttribute('color', 'success');
      expect(el.color).toBe('success');
    });

    it('reads size from attribute', () => {
      el.setAttribute('size', 'sm');
      expect(el.size).toBe('sm');
    });
  });

  describe('ARIA', () => {
    it('sets role="status" when connected', () => {
      const el = document.createElement('void-badge') as VoidBadge;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('status');
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-badge') as VoidBadge;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
