// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidInput } from '../../src/components/input.js';

if (!customElements.get('void-input')) {
  customElements.define('void-input', VoidInput);
}

describe('VoidInput', () => {
  let el: VoidInput;

  beforeEach(() => {
    el = document.createElement('void-input') as VoidInput;
    document.body.appendChild(el);
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('default type is text', () => {
    expect(el.type).toBe('text');
  });

  it('default size is md', () => {
    expect(el.size).toBe('md');
  });

  it('default value is empty', () => {
    expect(el.value).toBe('');
  });

  it('renders a native input', async () => {
    await el.updateComplete;
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
  });

  it('sets role=textbox', () => {
    expect(el.getAttribute('role')).toBe('textbox');
  });

  it('renders error message when error is set', async () => {
    el.error = 'Required field';
    await el.updateComplete;
    const errorEl = el.querySelector('.void-input-error');
    expect(errorEl?.textContent).toBe('Required field');
  });

  it('sets aria-invalid when error is set', async () => {
    el.error = 'Invalid';
    await el.updateComplete;
    const input = el.querySelector('input');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
  });
});
