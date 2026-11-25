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

describe('VoidToast roles and timer pausing', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('void-toast').forEach(t => t.remove());
  });

  async function make(color: VoidToast['color'] = 'default', duration = 1000) {
    const el = document.createElement('void-toast') as VoidToast;
    el.color = color;
    el.duration = duration;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  it.each([
    ['error', 'alert'],
    ['warning', 'alert'],
    ['default', 'status'],
    ['success', 'status'],
    ['info', 'status'],
  ] as const)('color=%s uses role=%s', async (color, role) => {
    const el = await make(color, 0);
    expect(el.getAttribute('role')).toBe(role);
  });

  it('updates role when color changes', async () => {
    const el = await make('default', 0);
    el.color = 'error';
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('alert');
    el.color = 'success';
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('status');
  });

  it('pauses the dismiss timer on hover and resumes with the remaining time on leave', async () => {
    vi.useFakeTimers();
    const el = await make();
    vi.advanceTimersByTime(600);
    el.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(10000);
    expect(el.isConnected).toBe(true);
    el.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(399);
    expect(el.isConnected).toBe(true);
    vi.advanceTimersByTime(1);
    expect(el.isConnected).toBe(false);
  });

  it('pauses on focus within and resumes on focus leaving', async () => {
    vi.useFakeTimers();
    const el = await make();
    const btn = el.querySelector('.void-toast-close') as HTMLButtonElement;
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(10000);
    expect(el.isConnected).toBe(true);
    btn.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    vi.advanceTimersByTime(1000);
    expect(el.isConnected).toBe(false);
  });

  it('stays paused while still hovered after focus leaves', async () => {
    vi.useFakeTimers();
    const el = await make();
    el.dispatchEvent(new MouseEvent('mouseenter'));
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    vi.advanceTimersByTime(10000);
    expect(el.isConnected).toBe(true);
  });

  it('does not start a timer on hover leave when duration is 0', async () => {
    vi.useFakeTimers();
    const el = await make('default', 0);
    el.dispatchEvent(new MouseEvent('mouseenter'));
    el.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(100000);
    expect(el.isConnected).toBe(true);
  });
});
