import { describe, it, expect } from 'vitest';
import { LitElement } from 'lit';
import { VoidElement } from '../src/base.js';

// Register the element so it can be constructed via document.createElement
customElements.define('void-test-element', VoidElement);

describe('VoidElement', () => {
  it('extends LitElement', () => {
    expect(Object.getPrototypeOf(VoidElement)).toBe(LitElement);
  });

  it('createRenderRoot returns the element instance (Light DOM)', () => {
    const el = document.createElement('void-test-element') as VoidElement;
    expect(el.createRenderRoot()).toBe(el);
  });
});
