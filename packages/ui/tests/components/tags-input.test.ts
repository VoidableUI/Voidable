// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTagsInput } from '../../src/components/tags-input.js';

const TAG = 'void-tags-input';

function createElement(): VoidTagsInput {
  return document.createElement(TAG) as VoidTagsInput;
}

describe('VoidTagsInput', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidTagsInput)).toBe(VoidElement);
    });

    it('is registered as void-tags-input', () => {
      expect(customElements.get(TAG)).toBe(VoidTagsInput);
    });
  });

  describe('default property values', () => {
    let el: VoidTagsInput;

    beforeEach(() => {
      el = createElement();
    });

    it('value defaults to empty array', () => {
      expect(el.value).toEqual([]);
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('readonly defaults to false', () => {
      expect(el.readonly).toBe(false);
    });

    it('max defaults to Infinity', () => {
      expect(el.max).toBe(Infinity);
    });

    it('placeholder defaults to "Add tag..."', () => {
      expect(el.placeholder).toBe('Add tag...');
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('color defaults to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('allowDuplicates defaults to false', () => {
      expect(el.allowDuplicates).toBe(false);
    });
  });

  describe('adding a tag', () => {
    let el: VoidTagsInput;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('updates value array when a tag is added via Enter', async () => {
      await el.updateComplete;
      const input = el.querySelector('.void-tags-input-field') as HTMLInputElement;
      input.value = 'hello';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.value).toEqual(['hello']);
    });

    it('updates value array when a tag is added via comma', async () => {
      await el.updateComplete;
      const input = el.querySelector('.void-tags-input-field') as HTMLInputElement;
      input.value = 'world';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ',', bubbles: true }));
      expect(el.value).toEqual(['world']);
    });
  });

  describe('removing a tag', () => {
    let el: VoidTagsInput;

    beforeEach(() => {
      el = createElement();
      el.value = ['one', 'two', 'three'];
      document.body.appendChild(el);
    });

    it('updates value array when remove button is clicked', async () => {
      await el.updateComplete;
      const removeBtn = el.querySelector('.void-tags-input-tag-remove') as HTMLButtonElement;
      removeBtn.click();
      expect(el.value).toEqual(['two', 'three']);
    });

    it('removes last tag on Backspace when input is empty', async () => {
      await el.updateComplete;
      const input = el.querySelector('.void-tags-input-field') as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
      expect(el.value).toEqual(['one', 'two']);
    });
  });

  describe('duplicate prevention', () => {
    let el: VoidTagsInput;

    beforeEach(() => {
      el = createElement();
      el.value = ['existing'];
      document.body.appendChild(el);
    });

    it('rejects duplicate tags by default', async () => {
      await el.updateComplete;
      const input = el.querySelector('.void-tags-input-field') as HTMLInputElement;
      input.value = 'existing';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.value).toEqual(['existing']);
    });

    it('allows duplicate tags when allowDuplicates is true', async () => {
      el.allowDuplicates = true;
      await el.updateComplete;
      const input = el.querySelector('.void-tags-input-field') as HTMLInputElement;
      input.value = 'existing';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.value).toEqual(['existing', 'existing']);
    });
  });

  describe('max enforcement', () => {
    let el: VoidTagsInput;

    beforeEach(() => {
      el = createElement();
      el.max = 2;
      el.value = ['one', 'two'];
      document.body.appendChild(el);
    });

    it('does not render input field when at max', async () => {
      await el.updateComplete;
      const input = el.querySelector('.void-tags-input-field');
      expect(input).toBeNull();
    });

    it('does not add tags beyond max', async () => {
      el.value = ['one'];
      await el.updateComplete;
      const input = el.querySelector('.void-tags-input-field') as HTMLInputElement;
      input.value = 'two';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      // Now at max
      input.value = 'three';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.value).toEqual(['one', 'two']);
    });
  });

  describe('void-change event', () => {
    let el: VoidTagsInput;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('dispatches void-change when a tag is added', async () => {
      await el.updateComplete;
      let detail: { value: string[] } | null = null;
      el.addEventListener('void-change', ((e: CustomEvent) => {
        detail = e.detail;
      }) as EventListener, { once: true });
      const input = el.querySelector('.void-tags-input-field') as HTMLInputElement;
      input.value = 'test';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(detail).toEqual({ value: ['test'] });
    });

    it('dispatches void-change when a tag is removed', async () => {
      el.value = ['remove-me'];
      await el.updateComplete;
      let detail: { value: string[] } | null = null;
      el.addEventListener('void-change', ((e: CustomEvent) => {
        detail = e.detail;
      }) as EventListener, { once: true });
      const removeBtn = el.querySelector('.void-tags-input-tag-remove') as HTMLButtonElement;
      removeBtn.click();
      expect(detail).toEqual({ value: [] });
    });
  });

  describe('disabled state', () => {
    let el: VoidTagsInput;

    beforeEach(() => {
      el = createElement();
      el.disabled = true;
      el.value = ['locked'];
      document.body.appendChild(el);
    });

    it('does not render remove buttons when disabled', async () => {
      await el.updateComplete;
      const removeBtn = el.querySelector('.void-tags-input-tag-remove');
      expect(removeBtn).toBeNull();
    });

    it('renders a disabled input', async () => {
      await el.updateComplete;
      const input = el.querySelector('.void-tags-input-field') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('ARIA', () => {
    it('sets role="listbox" when connected', () => {
      const el = createElement();
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('listbox');
    });

    it('tags have role="option"', async () => {
      const el = createElement();
      el.value = ['tag1'];
      document.body.appendChild(el);
      await el.updateComplete;
      const tag = el.querySelector('.void-tags-input-tag');
      expect(tag?.getAttribute('role')).toBe('option');
    });
  });
});
