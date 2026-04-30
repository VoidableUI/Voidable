// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidToast, VoidToastContainer } from '../../src/components/toast.js';

describe('VoidToast', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidToast)).toBe(VoidElement);
  });

  it('registers as void-toast custom element', () => {
    expect(customElements.get('void-toast')).toBe(VoidToast);
  });

  describe('default properties', () => {
    let el: VoidToast;
    beforeEach(() => { el = document.createElement('void-toast') as VoidToast; });
    it('defaults color to "default"', () => { expect(el.color).toBe('default'); });
    it('defaults duration to 5000', () => { expect(el.duration).toBe(5000); });
    it('defaults dismissable to true', () => { expect(el.dismissable).toBe(true); });
    it('defaults heading to ""', () => { expect(el.heading).toBe(''); });
  });

  describe('ARIA', () => {
    it('sets role="status" when connected', () => {
      const el = document.createElement('void-toast') as VoidToast;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('status');
      el.remove();
    });
  });

  describe('attribute reflection', () => {
    let el: VoidToast;
    beforeEach(async () => {
      el = document.createElement('void-toast') as VoidToast;
      el.duration = 0;
      document.body.appendChild(el);
    });
    afterEach(() => { el.remove(); });

    it('reflects color to attribute', async () => {
      el.color = 'error';
      await el.updateComplete;
      expect(el.getAttribute('color')).toBe('error');
    });

    it('reflects dismissable to attribute', async () => {
      el.dismissable = false;
      await el.updateComplete;
      expect(el.hasAttribute('dismissable')).toBe(false);
    });
  });

  describe('close button', () => {
    it('renders close button when dismissable=true', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.dismissable = true;
      document.body.appendChild(el);
      await el.updateComplete;
      const btn = el.querySelector('.void-toast-close');
      expect(btn).not.toBeNull();
      el.remove();
    });

    it('does not render close button when dismissable=false', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.dismissable = false;
      document.body.appendChild(el);
      await el.updateComplete;
      const btn = el.querySelector('.void-toast-close');
      expect(btn).toBeNull();
      el.remove();
    });
  });

  describe('void-close event', () => {
    it('dispatches void-close event when close button is clicked', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.dismissable = true;
      document.body.appendChild(el);
      await el.updateComplete;
      const events: Event[] = [];
      document.addEventListener('void-close', (e) => events.push(e));
      const btn = el.querySelector('.void-toast-close') as HTMLButtonElement;
      btn.click();
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect((events[0] as CustomEvent).composed).toBe(true);
    });
  });

  describe('self-removal', () => {
    it('removes itself from the DOM when close button is clicked', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.dismissable = true;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(document.body.contains(el)).toBe(true);
      const btn = el.querySelector('.void-toast-close') as HTMLButtonElement;
      btn.click();
      expect(document.body.contains(el)).toBe(false);
    });
  });

  describe('heading', () => {
    it('renders heading when set', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.heading = 'Test Heading';
      document.body.appendChild(el);
      await el.updateComplete;
      const headingEl = el.querySelector('span.void-toast-heading');
      expect(headingEl).not.toBeNull();
      el.remove();
    });

    it('does not render heading element when heading is empty', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.heading = '';
      document.body.appendChild(el);
      await el.updateComplete;
      const headingEl = el.querySelector('.void-toast-heading');
      expect(headingEl).toBeNull();
      el.remove();
    });
  });

  describe('auto-dismiss', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('removes itself after duration', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.duration = 1000;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(document.body.contains(el)).toBe(true);
      vi.advanceTimersByTime(1000);
      expect(document.body.contains(el)).toBe(false);
    });

    it('does not auto-dismiss when duration is 0', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.duration = 0;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(document.body.contains(el)).toBe(true);
      vi.advanceTimersByTime(10000);
      expect(document.body.contains(el)).toBe(true);
      el.remove();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-toast') as VoidToast;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});

describe('VoidToastContainer', () => {
  afterEach(() => {
    document.querySelectorAll('void-toast-container').forEach(el => el.remove());
  });

  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidToastContainer)).toBe(VoidElement);
  });

  it('registers as void-toast-container custom element', () => {
    expect(customElements.get('void-toast-container')).toBe(VoidToastContainer);
  });

  describe('default properties', () => {
    let el: VoidToastContainer;
    beforeEach(() => { el = document.createElement('void-toast-container') as VoidToastContainer; });
    it('defaults position to "bottom-right"', () => { expect(el.position).toBe('bottom-right'); });
  });

  describe('attribute reflection', () => {
    it('reflects position to attribute', async () => {
      const el = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(el);
      el.position = 'top-left';
      await el.updateComplete;
      expect(el.getAttribute('position')).toBe('top-left');
    });
  });

  describe('ARIA', () => {
    it('sets role="region" when connected', () => {
      const el = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('region');
    });

    it('sets aria-label="Notifications" when connected', () => {
      const el = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(el);
      expect(el.getAttribute('aria-label')).toBe('Notifications');
    });

    it('sets aria-live="polite" when connected', () => {
      const el = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(el);
      expect(el.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('VoidToastContainer.show()', () => {
    it('creates a toast and appends it to container', () => {
      const toast = VoidToastContainer.show({ message: 'Test message' });
      const container = document.querySelector('void-toast-container');
      expect(container).not.toBeNull();
      expect(container!.contains(toast)).toBe(true);
    });

    it('returns the VoidToast element', () => {
      const toast = VoidToastContainer.show({ message: 'Test' });
      expect(toast).toBeInstanceOf(VoidToast);
    });

    it('toast has correct message', () => {
      const toast = VoidToastContainer.show({ message: 'Hello World' });
      expect(toast.textContent).toContain('Hello World');
    });

    it('creates container if none exists in document', () => {
      expect(document.querySelector('void-toast-container')).toBeNull();
      VoidToastContainer.show({ message: 'Test' });
      expect(document.querySelector('void-toast-container')).not.toBeNull();
    });

    it('uses existing container if one exists', () => {
      const existing = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(existing);
      VoidToastContainer.show({ message: 'Test' });
      const containers = document.querySelectorAll('void-toast-container');
      expect(containers.length).toBe(1);
      expect(containers[0]).toBe(existing);
    });

    it('sets color on toast', () => {
      const toast = VoidToastContainer.show({ message: 'Test', color: 'error' });
      expect(toast.color).toBe('error');
    });

    it('sets heading on toast when provided', () => {
      const toast = VoidToastContainer.show({ message: 'Test', heading: 'Error' });
      expect(toast.heading).toBe('Error');
    });
  });
});
