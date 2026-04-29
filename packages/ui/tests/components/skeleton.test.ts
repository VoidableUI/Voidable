// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidSkeleton } from '../../src/components/skeleton.js';

describe('VoidSkeleton', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidSkeleton)).toBe(VoidElement);
  });

  it('default variant is "text"', () => {
    const el = document.createElement('void-skeleton') as VoidSkeleton;
    expect(el.variant).toBe('text');
  });

  describe('connectedCallback', () => {
    let el: VoidSkeleton;

    beforeEach(() => {
      el = document.createElement('void-skeleton') as VoidSkeleton;
      document.body.appendChild(el);
    });

    it('sets role="presentation"', () => {
      expect(el.getAttribute('role')).toBe('presentation');
    });

    it('sets aria-hidden="true"', () => {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
