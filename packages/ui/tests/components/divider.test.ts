// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDivider } from '../../src/components/divider.js';

if (!customElements.get('void-divider')) {
  customElements.define('void-divider', VoidDivider);
}

describe('VoidDivider', () => {
  let el: VoidDivider;

  beforeEach(() => {
    el = document.createElement('void-divider') as VoidDivider;
    document.body.appendChild(el);
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('default orientation is horizontal', () => {
    expect(el.orientation).toBe('horizontal');
  });

  it('sets role="separator"', () => {
    expect(el.getAttribute('role')).toBe('separator');
  });

  it('sets aria-orientation to match orientation', () => {
    expect(el.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('reflects orientation attribute', async () => {
    el.orientation = 'vertical';
    await el.updateComplete;
    expect(el.getAttribute('orientation')).toBe('vertical');
  });
});
