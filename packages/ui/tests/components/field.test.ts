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
