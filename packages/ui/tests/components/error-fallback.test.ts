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

    it('defaults hideIcon to false', () => {
      expect(el.hideIcon).toBe(false);
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

  describe('built-in default (no parts written)', () => {
    let el: VoidErrorFallback;

    beforeEach(async () => {
      el = document.createElement('void-error-fallback') as VoidErrorFallback;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('writes a title part with the default heading', () => {
      const title = el.querySelector(':scope > void-error-fallback-title');
      expect(title).not.toBeNull();
      expect(title!.textContent).toBe('Something went wrong');
      expect(title!.hasAttribute('data-void-default')).toBe(true);
    });

    it('writes no description and no actions by default', () => {
      expect(el.querySelector('void-error-fallback-description')).toBeNull();
      expect(el.querySelector('void-error-fallback-actions')).toBeNull();
    });

    it('follows heading and message', async () => {
      el.heading = 'Could not load';
      el.message = 'Check your connection.';
      await el.updateComplete;
      expect(el.querySelector('void-error-fallback-title')!.textContent).toBe('Could not load');
      expect(el.querySelector('void-error-fallback-description')!.textContent).toBe('Check your connection.');
      el.message = '';
      await el.updateComplete;
      expect(el.querySelector('void-error-fallback-description')).toBeNull();
    });

    it('writes the retry button when retryable, with the default and a custom label', async () => {
      el.retryable = true;
      await el.updateComplete;
      const btn = el.querySelector('void-error-fallback-actions > button') as HTMLButtonElement;
      expect(btn.textContent).toBe('Try again');
      el.retryLabel = 'Reconnect';
      await el.updateComplete;
      expect(el.querySelector('void-error-fallback-actions > button')).toBe(btn);
      expect(btn.textContent).toBe('Reconnect');
      el.retryable = false;
      await el.updateComplete;
      expect(el.querySelector('void-error-fallback-actions')).toBeNull();
    });

    it('keeps the parts in title, description, actions order', async () => {
      el.retryable = true;
      await el.updateComplete;
      el.message = 'late';
      await el.updateComplete;
      expect(Array.from(el.children).map(c => c.localName)).toEqual([
        'void-error-fallback-title', 'void-error-fallback-description', 'void-error-fallback-actions',
      ]);
    });
  });

  describe('author parts replace the default', () => {
    it('writes nothing when the author wrote a title part', async () => {
      const el = document.createElement('void-error-fallback') as VoidErrorFallback;
      el.heading = 'ignored';
      el.retryable = true;
      el.innerHTML = '<void-error-fallback-title>Mine</void-error-fallback-title>';
      const mine = el.firstElementChild;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(Array.from(el.children)).toEqual([mine]);
      expect(el.querySelector('[data-void-default]')).toBeNull();
      el.remove();
    });

    it('takes its own parts away when the author adds one later, and writes them again when it is removed', async () => {
      const el = document.createElement('void-error-fallback') as VoidErrorFallback;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('[data-void-default]')).not.toBeNull();
      const mine = document.createElement('void-error-fallback-title');
      mine.textContent = 'Mine';
      el.append(mine);
      await new Promise(r => setTimeout(r, 0));
      expect(Array.from(el.children)).toEqual([mine]);
      mine.remove();
      await new Promise(r => setTimeout(r, 0));
      expect(el.querySelector('void-error-fallback-title')!.textContent).toBe('Something went wrong');
      el.remove();
    });

    it('does not fire void-retry from the author\'s own buttons', async () => {
      const el = document.createElement('void-error-fallback') as VoidErrorFallback;
      el.innerHTML = '<void-error-fallback-title>T</void-error-fallback-title><void-error-fallback-actions><button type="button">Retry</button></void-error-fallback-actions>';
      document.body.appendChild(el);
      await el.updateComplete;
      const events: Event[] = [];
      document.addEventListener('void-retry', e => events.push(e));
      el.querySelector('button')!.click();
      expect(events).toHaveLength(0);
      el.remove();
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

    it('dispatches void-retry event when the built-in retry button is clicked', async () => {
      const events: Event[] = [];
      document.addEventListener('void-retry', (e) => events.push(e));

      const btn = el.querySelector('void-error-fallback-actions > button') as HTMLButtonElement;
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
