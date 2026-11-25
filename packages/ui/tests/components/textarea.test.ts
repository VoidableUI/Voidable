// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTextarea } from '../../src/components/textarea.js';
import '../../src/components/field.js';

const TAG = 'void-textarea';

function createElement(): VoidTextarea {
  return document.createElement(TAG) as VoidTextarea;
}

describe('VoidTextarea', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidTextarea.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-textarea', () => {
      expect(customElements.get(TAG)).toBe(VoidTextarea);
    });
  });

  describe('default property values', () => {
    let el: VoidTextarea;

    beforeEach(() => {
      el = createElement();
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('placeholder defaults to empty string', () => {
      expect(el.placeholder).toBe('');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('readonly defaults to false', () => {
      expect(el.readonly).toBe(false);
    });

    it('required defaults to false', () => {
      expect(el.required).toBe(false);
    });

    it('rows defaults to 3', () => {
      expect(el.rows).toBe(3);
    });

    it('resize defaults to vertical', () => {
      expect(el.resize).toBe('vertical');
    });

    it('size defaults to md', () => {
      expect(el.size).toBe('md');
    });

    it('error defaults to empty string', () => {
      expect(el.error).toBe('');
    });
  });

  describe('native textarea rendering', () => {
    let el: VoidTextarea;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders a native textarea element', () => {
      expect(el.querySelector('textarea')).not.toBeNull();
    });

    it('native textarea has no aria-invalid when no error', () => {
      const ta = el.querySelector('textarea')!;
      expect(ta.getAttribute('aria-invalid')).toBe('false');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidTextarea;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('has no role of its own: the native textarea is the textbox', () => {
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-multiline')).toBe(false);
      expect(el.querySelector('textarea')).not.toBeNull();
    });

    it('is named by void-field through the native textarea', async () => {
      const field = document.createElement('void-field') as HTMLElement & { label: string; updateComplete: Promise<boolean> };
      field.label = 'Notes';
      field.appendChild(el);
      document.body.appendChild(field);
      await field.updateComplete;
      await el.updateComplete;
      await new Promise((r) => setTimeout(r, 0));
      const textarea = el.querySelector('textarea')!;
      const label = field.querySelector('.void-field-label')!;
      expect(textarea.getAttribute('aria-labelledby')).toBe(label.id);
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('error rendering', () => {
    let el: VoidTextarea;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('does not render error span when error is empty', () => {
      expect(el.querySelector('.void-textarea-error')).toBeNull();
    });

    it('renders error span when error is set', async () => {
      el.error = 'Something went wrong';
      await el.updateComplete;
      const span = el.querySelector('.void-textarea-error');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('Something went wrong');
    });

    it('sets aria-invalid="true" on native textarea when error is set', async () => {
      el.error = 'Required';
      await el.updateComplete;
      const ta = el.querySelector('textarea')!;
      expect(ta.getAttribute('aria-invalid')).toBe('true');
    });

    it('removes error span when error is cleared', async () => {
      el.error = 'Error';
      await el.updateComplete;
      el.error = '';
      await el.updateComplete;
      expect(el.querySelector('.void-textarea-error')).toBeNull();
    });
  });
});
