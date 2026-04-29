// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidSpinner } from '../../src/components/spinner.js';

if (!customElements.get('void-spinner')) {
  customElements.define('void-spinner', VoidSpinner);
}

describe('VoidSpinner', () => {
  let el: VoidSpinner;

  beforeEach(() => {
    el = document.createElement('void-spinner') as VoidSpinner;
    document.body.appendChild(el);
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('default size is "md"', () => {
    expect(el.size).toBe('md');
  });

  it('default label is "Loading"', () => {
    expect(el.label).toBe('Loading');
  });

  it('sets role="status" on connect', () => {
    expect(el.getAttribute('role')).toBe('status');
  });

  it('sets aria-label from label property', () => {
    expect(el.getAttribute('aria-label')).toBe('Loading');
  });
});
