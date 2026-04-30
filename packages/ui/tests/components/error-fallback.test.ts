// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidErrorFallback } from '../../src/components/error-fallback.js';

describe('VoidErrorFallback', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidErrorFallback)).toBe(VoidElement);
  });

  it('registers as void-error-fallback custom element', () => {
    expect(customElements.get('void-error-fallback')).toBe(VoidErrorFallback);
  });

  describe('default properties', () => {
    let el: VoidErrorFallback;

    beforeEach(() => {
      el = document.createElement('void-error-fallback') as VoidErrorFallback;
    });

    it('defaults heading to "Something went wrong"', () => {
      expect(el.heading).toBe('Something went wrong');
    });

    it('defaults message to empty string', () => {
      expect(el.message).toBe('');
    });

    it('defaults retryable to false', () => {
      expect(el.retryable).toBe(false);
    });

    it('defaults retryLabel to "Try again"', () => {
      expect(el.retryLabel).toBe('Try again');
    });

    it('defaults icon to true', () => {
      expect(el.icon).toBe(true);
    });
  });

  describe('ARIA', () => {
    it('sets role="alert" when connected', () => {
      const el = document.createElement('void-error-fallback') as VoidErrorFallback;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('alert');
      el.remove();
    });
  });

  describe('rendering', () => {
    let el: VoidErrorFallback;

    beforeEach(async () => {
      el = document.createElement('void-error-fallback') as VoidErrorFallback;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('renders the content wrapper', () => {
      expect(el.querySelector('.void-error-fallback-content')).not.toBeNull();
    });

    it('renders the heading', () => {
      const heading = el.querySelector('.void-error-fallback-heading');
      expect(heading).not.toBeNull();
      expect(heading!.textContent).toBe('Something went wrong');
    });

    it('renders the icon by default', () => {
      expect(el.querySelector('.void-error-fallback-icon')).not.toBeNull();
    });

    it('does not render icon when icon is false', async () => {
      el.icon = false;
      await el.updateComplete;
      expect(el.querySelector('.void-error-fallback-icon')).toBeNull();
    });

    it('does not render message when message is empty', () => {
      expect(el.querySelector('.void-error-fallback-message')).toBeNull();
    });

    it('renders message when message is set', async () => {
      el.message = 'An unexpected error occurred.';
      await el.updateComplete;
      const msg = el.querySelector('.void-error-fallback-message');
      expect(msg).not.toBeNull();
      expect(msg!.textContent).toBe('An unexpected error occurred.');
    });

    it('does not render retry button when retryable is false', () => {
      expect(el.querySelector('.void-error-fallback-retry')).toBeNull();
    });

    it('renders retry button when retryable is true', async () => {
      el.retryable = true;
      await el.updateComplete;
      expect(el.querySelector('.void-error-fallback-retry')).not.toBeNull();
    });

    it('renders retry button with default label', async () => {
      el.retryable = true;
      await el.updateComplete;
      const btn = el.querySelector('.void-error-fallback-retry') as HTMLButtonElement;
      expect(btn.textContent).toBe('Try again');
    });

    it('renders retry button with custom retryLabel', async () => {
      el.retryable = true;
      el.retryLabel = 'Reconnect';
      await el.updateComplete;
      const btn = el.querySelector('.void-error-fallback-retry') as HTMLButtonElement;
      expect(btn.textContent).toBe('Reconnect');
    });
  });

  describe('retry event', () => {
    let el: VoidErrorFallback;

    beforeEach(async () => {
      el = document.createElement('void-error-fallback') as VoidErrorFallback;
      el.retryable = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('dispatches void-retry event when retry button is clicked', async () => {
      const events: Event[] = [];
      document.addEventListener('void-retry', (e) => events.push(e));

      const btn = el.querySelector('.void-error-fallback-retry') as HTMLButtonElement;
      btn.click();

      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect((events[0] as CustomEvent).composed).toBe(true);
    });
  });

  describe('reflected attributes', () => {
    it('reflects retryable as attribute', async () => {
      const el = document.createElement('void-error-fallback') as VoidErrorFallback;
      document.body.appendChild(el);
      await el.updateComplete;
      el.retryable = true;
      await el.updateComplete;
      expect(el.hasAttribute('retryable')).toBe(true);
      el.remove();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-error-fallback') as VoidErrorFallback;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
