// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidSelect } from '../../src/components/select.js';

if (!customElements.get('void-select')) {
  customElements.define('void-select', VoidSelect);
}

describe('VoidSelect', () => {
  let el: VoidSelect;

  beforeEach(async () => {
    document.body.innerHTML = '<void-select><select name="s"><option value="a">A</option><option value="b">B</option></select></void-select>';
    el = document.querySelector('void-select') as VoidSelect;
    await el.updateComplete;
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('value is the native select value', () => {
    expect(el.value).toBe('a');
  });

  it('default size is md', () => {
    expect(el.size).toBe('md');
  });

  it('default error is empty string', () => {
    expect(el.error).toBe('');
  });

  it('renders no select of its own: the author writes it (#52)', () => {
    expect(el.querySelectorAll('select')).toHaveLength(1);
    expect(el.select).toBe(el.querySelector('select'));
  });

  it('has no form attributes of its own: they stay on the native select', () => {
    for (const name of ['name', 'required', 'disabled', 'placeholder']) expect(name in el, name).toBe(false);
    expect(el.select!.name).toBe('s');
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
    expect(el.select?.getAttribute('aria-invalid')).toBe('true');
  });

  it('works with no select inside (nothing to enhance) without throwing', async () => {
    const empty = document.createElement('void-select') as VoidSelect;
    document.body.append(empty);
    await empty.updateComplete;
    expect(empty.value).toBe('');
    empty.value = 'x';
    expect(empty.value).toBe('x');
  });
});
