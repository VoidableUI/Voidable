// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCombobox } from '../../src/components/combobox.js';
import { VoidOption } from '../../src/components/multiselect.js';

if (!customElements.get('void-option')) {
  customElements.define('void-option', VoidOption);
}
if (!customElements.get('void-combobox')) {
  customElements.define('void-combobox', VoidCombobox);
}

function createWithOptions(opts: Array<{ value: string; label: string }>): VoidCombobox {
  const el = document.createElement('void-combobox') as VoidCombobox;
  for (const opt of opts) {
    const o = document.createElement('void-option') as VoidOption;
    o.value = opt.value;
    o.textContent = opt.label;
    el.appendChild(o);
  }
  return el;
}

describe('VoidCombobox', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidCombobox)).toBe(VoidElement);
    });

    it('is registered as void-combobox', () => {
      expect(customElements.get('void-combobox')).toBe(VoidCombobox);
    });
  });

  describe('default property values', () => {
    let el: VoidCombobox;

    beforeEach(async () => {
      el = document.createElement('void-combobox') as VoidCombobox;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('placeholder defaults to "Search..."', () => {
      expect(el.placeholder).toBe('Search...');
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('error defaults to empty string', () => {
      expect(el.error).toBe('');
    });

    it('name defaults to empty string', () => {
      expect(el.name).toBe('');
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidCombobox;

    beforeEach(async () => {
      el = document.createElement('void-combobox') as VoidCombobox;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="combobox" on host', () => {
      expect(el.getAttribute('role')).toBe('combobox');
    });

    it('sets aria-autocomplete="list" on host', () => {
      expect(el.getAttribute('aria-autocomplete')).toBe('list');
    });

    it('sets aria-expanded="false" initially', () => {
      expect(el.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('opening and closing', () => {
    let el: VoidCombobox;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('opens dropdown on input focus', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-combobox-dropdown')).not.toBeNull();
    });

    it('closes dropdown on Escape key', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-combobox-dropdown')).toBeNull();
    });

    it('closes dropdown when clicking outside', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-combobox-dropdown')).toBeNull();
    });

    it('aria-expanded becomes true when open', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      expect(el.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('filtering', () => {
    let el: VoidCombobox;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
        { value: 'svelte', label: 'Svelte' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('shows all options when query is empty', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      const options = el.querySelectorAll('.void-combobox-option');
      expect(options.length).toBe(3);
    });

    it('filters options based on query', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      input.value = 'vue';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      const options = el.querySelectorAll('.void-combobox-option');
      expect(options.length).toBe(1);
      expect(options[0].textContent?.trim()).toBe('Vue');
    });

    it('shows empty state when no match', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      input.value = 'zzz';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-combobox-empty')).not.toBeNull();
      expect(el.querySelectorAll('.void-combobox-option').length).toBe(0);
    });

    it('filtering is case-insensitive', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      input.value = 'REACT';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await el.updateComplete;
      const options = el.querySelectorAll('.void-combobox-option');
      expect(options.length).toBe(1);
      expect(options[0].textContent?.trim()).toBe('React');
    });
  });

  describe('selecting options', () => {
    let el: VoidCombobox;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
        { value: 'svelte', label: 'Svelte' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('clicking option sets value', async () => {
      const option = el.querySelector('.void-combobox-option') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      expect(el.value).toBe('react');
    });

    it('clicking option closes dropdown', async () => {
      const option = el.querySelector('.void-combobox-option') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-combobox-dropdown')).toBeNull();
    });

    it('clicking option sets input display value', async () => {
      const option = el.querySelector('.void-combobox-option') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      expect(input.value).toBe('React');
    });

    it('dispatches void-change with correct value detail', async () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const option = el.querySelector('.void-combobox-option') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      expect(detail?.value).toBe('react');
    });
  });

  describe('void-change event', () => {
    let el: VoidCombobox;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('void-change bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const option = el.querySelector('.void-combobox-option') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });

    it('void-change detail has value property', async () => {
      let detail: unknown = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const option = el.querySelector('.void-combobox-option') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      expect(detail).toHaveProperty('value');
    });
  });

  describe('disabled', () => {
    let el: VoidCombobox;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
      ]);
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('does not open dropdown on input focus when disabled', async () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-combobox-dropdown')).toBeNull();
    });
  });

  describe('error state', () => {
    let el: VoidCombobox;

    beforeEach(async () => {
      el = document.createElement('void-combobox') as VoidCombobox;
      document.body.appendChild(el);
      el.error = 'Required';
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('renders .void-combobox-error with error text', () => {
      const errorEl = el.querySelector('.void-combobox-error');
      expect(errorEl).not.toBeNull();
      expect(errorEl!.textContent).toBe('Required');
    });

    it('sets aria-invalid="true" on input', () => {
      const input = el.querySelector('.void-combobox-input') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
  });
});
