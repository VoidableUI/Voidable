// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidField } from '../../src/components/field.js';

if (!customElements.get('void-field')) {
  customElements.define('void-field', VoidField);
}

describe('VoidField', () => {
  let el: VoidField;

  beforeEach(() => {
    el = document.createElement('void-field') as VoidField;
    document.body.appendChild(el);
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('default property values', () => {
    expect(el.label).toBe('');
    expect(el.error).toBe('');
    expect(el.helper).toBe('');
    expect(el.required).toBe(false);
  });

  it('renders label when set', async () => {
    el.label = 'Email';
    await el.updateComplete;
    const label = el.querySelector('.void-field-label');
    expect(label?.textContent?.trim()).toContain('Email');
  });

  it('renders required asterisk when required is true', async () => {
    el.label = 'Email';
    el.required = true;
    await el.updateComplete;
    const required = el.querySelector('.void-field-required');
    expect(required).not.toBeNull();
    expect(required?.textContent).toContain('*');
  });

  it('renders helper text when set', async () => {
    el.helper = 'We will never share your email.';
    await el.updateComplete;
    const helper = el.querySelector('.void-field-helper');
    expect(helper?.textContent).toBe('We will never share your email.');
  });

  it('renders error and error takes precedence over helper', async () => {
    el.helper = 'Some helper';
    el.error = 'This field is required';
    await el.updateComplete;
    const error = el.querySelector('.void-field-error');
    const helper = el.querySelector('.void-field-helper');
    expect(error?.textContent).toBe('This field is required');
    expect(helper).toBeNull();
  });

  it('renders control container', async () => {
    await el.updateComplete;
    const control = el.querySelector('.void-field-control');
    expect(control).not.toBeNull();
  });
});

describe('VoidField accessibility wiring', () => {
  async function make(inner: string, props: Partial<Pick<VoidField, 'label' | 'error' | 'helper'>> = {}) {
    const f = document.createElement('void-field') as VoidField;
    f.innerHTML = inner;
    Object.assign(f, { label: 'Email', ...props });
    document.body.appendChild(f);
    await f.updateComplete;
    await Promise.resolve();
    return f;
  }

  it('associates the label with a native input, generating an id', async () => {
    const f = await make('<input type="text">');
    const input = f.querySelector('input')!;
    const label = f.querySelector('label')!;
    expect(input.id).not.toBe('');
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.getAttribute('aria-labelledby')).toBe(label.id);
    f.remove();
  });

  it('keeps an existing control id', async () => {
    const f = await make('<input id="mine">');
    expect(f.querySelector('input')!.id).toBe('mine');
    expect(f.querySelector('label')!.getAttribute('for')).toBe('mine');
    f.remove();
  });

  it('labels the inner native control of a wrapper component, overriding its aria-label', async () => {
    const f = await make('<div class="wrapper"><input aria-label="Number input"></div>');
    const input = f.querySelector('input')!;
    expect(input.getAttribute('aria-labelledby')).toBe(f.querySelector('label')!.id);
    f.remove();
  });

  it('generates distinct ids per field', async () => {
    const a = await make('<input>');
    const b = await make('<input>');
    expect(a.querySelector('input')!.id).not.toBe(b.querySelector('input')!.id);
    a.remove();
    b.remove();
  });

  it('links error text with aria-describedby and sets aria-invalid', async () => {
    const f = await make('<input>', { error: 'Required' });
    const input = f.querySelector('input')!;
    const err = f.querySelector('.void-field-error')!;
    expect(input.getAttribute('aria-describedby')).toBe(err.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    f.remove();
  });

  it('links helper text and clears aria-invalid when the error goes away', async () => {
    const f = await make('<input>', { error: 'Required', helper: 'Hint' });
    f.error = '';
    await f.updateComplete;
    const input = f.querySelector('input')!;
    expect(input.getAttribute('aria-describedby')).toBe(f.querySelector('.void-field-helper')!.id);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    f.remove();
  });

  it('preserves consumer aria-describedby tokens', async () => {
    const f = await make('<input aria-describedby="extra">', { helper: 'Hint' });
    const tokens = f.querySelector('input')!.getAttribute('aria-describedby')!.split(' ');
    expect(tokens).toContain('extra');
    expect(tokens).toContain(f.querySelector('.void-field-helper')!.id);
    f.remove();
  });

  it('removes aria-describedby when there is no message', async () => {
    const f = await make('<input>');
    expect(f.querySelector('input')!.hasAttribute('aria-describedby')).toBe(false);
    f.remove();
  });
});
