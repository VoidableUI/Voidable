// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidEditable } from '../../src/components/editable.js';

if (!customElements.get('void-editable')) {
  customElements.define('void-editable', VoidEditable);
}

describe('VoidEditable', () => {
  let el: VoidEditable;

  beforeEach(() => {
    el = document.createElement('void-editable') as VoidEditable;
    document.body.appendChild(el);
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('is registered as void-editable', () => {
    expect(customElements.get('void-editable')).toBe(VoidEditable);
  });

  it('has correct default properties', () => {
    expect(el.value).toBe('');
    expect(el.editing).toBe(false);
    expect(el.disabled).toBe(false);
    expect(el.placeholder).toBe('Click to edit');
    expect(el.submitMode).toBe('both');
    expect(el.size).toBe('md');
  });

  it('enters edit mode on click', async () => {
    await el.updateComplete;
    el.click();
    expect(el.editing).toBe(true);
  });

  it('confirms with Enter and dispatches void-change', async () => {
    el.value = 'old';
    await el.updateComplete;
    el.click();
    await el.updateComplete;

    const input = el.querySelector<HTMLInputElement>('.void-editable-input')!;
    input.value = 'new';

    let detail: { value: string } | undefined;
    el.addEventListener('void-change', ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.editing).toBe(false);
    expect(el.value).toBe('new');
    expect(detail).toEqual({ value: 'new' });
  });

  it('cancels with Escape and restores value', async () => {
    el.value = 'original';
    await el.updateComplete;
    el.click();
    await el.updateComplete;

    const input = el.querySelector<HTMLInputElement>('.void-editable-input')!;
    input.value = 'changed';

    let cancelled = false;
    el.addEventListener('void-cancel', () => {
      cancelled = true;
    });

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(el.editing).toBe(false);
    expect(el.value).toBe('original');
    expect(cancelled).toBe(true);
  });

  it('does not enter edit mode when disabled', async () => {
    el.disabled = true;
    await el.updateComplete;
    el.click();
    expect(el.editing).toBe(false);
  });

  it('shows placeholder when value is empty', async () => {
    await el.updateComplete;
    const placeholder = el.querySelector('.void-editable-placeholder');
    expect(placeholder).not.toBeNull();
    expect(placeholder?.textContent).toBe('Click to edit');
  });
});
