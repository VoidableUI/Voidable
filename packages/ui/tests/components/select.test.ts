// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidSelect } from '../../src/components/select.js';

if (!customElements.get('void-select')) {
  customElements.define('void-select', VoidSelect);
}

describe('VoidSelect', () => {
  let el: VoidSelect;

  beforeEach(() => {
    el = document.createElement('void-select') as VoidSelect;
    document.body.appendChild(el);
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('default value is empty string', () => {
    expect(el.value).toBe('');
  });

  it('default size is md', () => {
    expect(el.size).toBe('md');
  });

  it('default disabled is false', () => {
    expect(el.disabled).toBe(false);
  });

  it('default required is false', () => {
    expect(el.required).toBe(false);
  });

  it('default error is empty string', () => {
    expect(el.error).toBe('');
  });

  it('renders a native select', async () => {
    await el.updateComplete;
    const select = el.querySelector('select');
    expect(select).not.toBeNull();
  });

  it('renders error message when error is set', async () => {
    el.error = 'Please select an option';
    await el.updateComplete;
    const errorEl = el.querySelector('.void-select-error');
    expect(errorEl?.textContent).toBe('Please select an option');
  });

  it('sets aria-invalid when error is set', async () => {
    el.error = 'Invalid';
    await el.updateComplete;
    const select = el.querySelector('select');
    expect(select?.getAttribute('aria-invalid')).toBe('true');
  });

  it('sets disabled attribute on native select', async () => {
    el.disabled = true;
    await el.updateComplete;
    const select = el.querySelector('select');
    expect(select?.disabled).toBe(true);
  });
});
