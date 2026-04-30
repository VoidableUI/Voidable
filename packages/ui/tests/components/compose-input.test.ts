// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidComposeInput } from '../../src/components/compose-input.js';

const TAG = 'void-compose-input';

function createElement(): VoidComposeInput {
  return document.createElement(TAG) as VoidComposeInput;
}

describe('VoidComposeInput', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidComposeInput)).toBe(VoidElement);
    });

    it('is registered as void-compose-input', () => {
      expect(customElements.get(TAG)).toBe(VoidComposeInput);
    });
  });

  describe('default property values', () => {
    let el: VoidComposeInput;

    beforeEach(() => {
      el = createElement();
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('placeholder defaults to "Type a message..."', () => {
      expect(el.placeholder).toBe('Type a message...');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('maxlength defaults to 0', () => {
      expect(el.maxlength).toBe(0);
    });
  });

  describe('rendering', () => {
    let el: VoidComposeInput;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders a textarea', () => {
      expect(el.querySelector('textarea')).not.toBeNull();
    });

    it('renders a send button', () => {
      expect(el.querySelector('.void-compose-input-send')).not.toBeNull();
    });

    it('renders a wrapper div', () => {
      expect(el.querySelector('.void-compose-input-wrapper')).not.toBeNull();
    });

    it('send button is disabled when value is empty', () => {
      const btn = el.querySelector('.void-compose-input-send') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('send button is enabled when value is non-empty', async () => {
      el.value = 'hello';
      await el.updateComplete;
      const btn = el.querySelector('.void-compose-input-send') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('send button is disabled when component is disabled', async () => {
      el.value = 'hello';
      el.disabled = true;
      await el.updateComplete;
      const btn = el.querySelector('.void-compose-input-send') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('reflects disabled attribute', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('textarea is disabled when component is disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      const ta = el.querySelector('textarea') as HTMLTextAreaElement;
      expect(ta.disabled).toBe(true);
    });
  });

  describe('void-input event', () => {
    let el: VoidComposeInput;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-input on textarea input', async () => {
      const handler = vi.fn();
      el.addEventListener('void-input', handler);

      const ta = el.querySelector('textarea') as HTMLTextAreaElement;
      ta.value = 'hello';
      ta.dispatchEvent(new Event('input', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail).toEqual({ value: 'hello' });
    });

    it('updates value property on input', async () => {
      const ta = el.querySelector('textarea') as HTMLTextAreaElement;
      ta.value = 'typed text';
      ta.dispatchEvent(new Event('input', { bubbles: true }));

      expect(el.value).toBe('typed text');
    });
  });

  describe('void-submit event', () => {
    let el: VoidComposeInput;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-submit when send button is clicked', async () => {
      el.value = 'hello world';
      await el.updateComplete;

      const handler = vi.fn();
      el.addEventListener('void-submit', handler);

      const btn = el.querySelector('.void-compose-input-send') as HTMLButtonElement;
      btn.click();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail).toEqual({ value: 'hello world' });
    });

    it('clears value after send', async () => {
      el.value = 'hello';
      await el.updateComplete;

      const btn = el.querySelector('.void-compose-input-send') as HTMLButtonElement;
      btn.click();

      expect(el.value).toBe('');
    });

    it('does not dispatch void-submit when value is empty', async () => {
      const handler = vi.fn();
      el.addEventListener('void-submit', handler);

      const btn = el.querySelector('.void-compose-input-send') as HTMLButtonElement;
      btn.click();

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not dispatch void-submit when disabled', async () => {
      el.value = 'hello';
      el.disabled = true;
      await el.updateComplete;

      const handler = vi.fn();
      el.addEventListener('void-submit', handler);

      el.querySelector('.void-compose-input-send')!.dispatchEvent(new MouseEvent('click'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('dispatches void-submit on Enter key', async () => {
      el.value = 'enter message';
      await el.updateComplete;

      const handler = vi.fn();
      el.addEventListener('void-submit', handler);

      const ta = el.querySelector('textarea') as HTMLTextAreaElement;
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail).toEqual({ value: 'enter message' });
    });

    it('does not dispatch void-submit on Shift+Enter', async () => {
      el.value = 'multiline';
      await el.updateComplete;

      const handler = vi.fn();
      el.addEventListener('void-submit', handler);

      const ta = el.querySelector('textarea') as HTMLTextAreaElement;
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
