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
  });

  describe('ARIA', () => {
    it('is a plain group, not a live region, when connected', () => {
      const el = document.createElement('void-toast') as VoidToast;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('group');
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
  });

  describe('close part', () => {
    function withClose(): VoidToast {
      const el = document.createElement('void-toast') as VoidToast;
      el.innerHTML =
        '<void-toast-description>Saved</void-toast-description><void-toast-close><button type="button" aria-label="Dismiss">x</button></void-toast-close>';
      document.body.appendChild(el);
      return el;
    }

    it('writes no close control of its own: without the part there is nothing to press', async () => {
      const el = document.createElement('void-toast') as VoidToast;
      el.innerHTML = '<void-toast-description>Saved</void-toast-description>';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('button')).toBeNull();
      expect(el.children.length).toBe(1);
      el.remove();
    });

    it('keeps the author\'s nodes where they are', async () => {
      const el = withClose();
      const before = Array.from(el.querySelectorAll('*'));
      await el.updateComplete;
      expect(Array.from(el.querySelectorAll('*'))).toEqual(before);
      el.remove();
    });

    it('dispatches void-close and removes itself when the control in the close part is pressed', async () => {
      const el = withClose();
      await el.updateComplete;
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      (el.querySelector('void-toast-close button') as HTMLButtonElement).click();
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(false);
      expect((events[0] as CustomEvent).detail).toEqual({ reason: 'close-button' });
      expect(document.body.contains(el)).toBe(false);
    });

    it('does not close from a click elsewhere in the toast', async () => {
      const el = withClose();
      await el.updateComplete;
      (el.querySelector('void-toast-description') as HTMLElement).click();
      expect(document.body.contains(el)).toBe(true);
      el.remove();
    });

    it('close() closes it too', async () => {
      const el = withClose();
      await el.updateComplete;
      el.close();
      expect(document.body.contains(el)).toBe(false);
    });

    it('moves focus to the next focusable element on the page when the closed toast held it', async () => {
      const before = document.createElement('button');
      document.body.prepend(before);
      const container = document.createElement('void-toast-container');
      document.body.append(container);
      const after = document.createElement('button');
      document.body.append(after);
      const el = document.createElement('void-toast') as VoidToast;
      el.innerHTML =
        '<void-toast-description>Saved</void-toast-description><void-toast-close><button type="button" aria-label="Dismiss">x</button></void-toast-close>';
      container.append(el);
      await el.updateComplete;
      const button = el.querySelector('button') as HTMLButtonElement;
      button.focus();
      button.click();
      expect(document.activeElement).toBe(after);
      before.remove();
      container.remove();
      after.remove();
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
    it('defaults placement to "bottom-right"', () => { expect(el.placement).toBe('bottom-right'); });
  });

  describe('attribute reflection', () => {
    it('reflects placement to attribute', async () => {
      const el = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(el);
      el.placement = 'top-left';
      await el.updateComplete;
      expect(el.getAttribute('placement')).toBe('top-left');
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

    it('is not itself live, and holds a polite and an assertive announcer from connection', () => {
      const el = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(el);
      expect(el.hasAttribute('aria-live')).toBe(false);
      const polite = el.querySelector(':scope > [data-void-announcer=polite]')!;
      const assertive = el.querySelector(':scope > [data-void-announcer=assertive]')!;
      expect([polite.getAttribute('role'), polite.getAttribute('aria-live'), polite.getAttribute('aria-atomic')]).toEqual(['status', 'polite', 'true']);
      expect([assertive.getAttribute('role'), assertive.getAttribute('aria-live'), assertive.getAttribute('aria-atomic')]).toEqual(['alert', 'assertive', 'true']);
    });

    it('writes a toast into the matching announcer after a delay, title then description', async () => {
      vi.useFakeTimers();
      try {
        const el = document.createElement('void-toast-container') as VoidToastContainer;
        document.body.appendChild(el);
        const polite = el.querySelector(':scope > [data-void-announcer=polite]')!;
        const assertive = el.querySelector(':scope > [data-void-announcer=assertive]')!;
        const ok = document.createElement('void-toast') as VoidToast;
        ok.duration = 0;
        ok.innerHTML = '<void-toast-title>Saved</void-toast-title><void-toast-description>All done</void-toast-description>';
        el.appendChild(ok);
        await vi.advanceTimersByTimeAsync(0);
        expect(polite.textContent).toBe('');
        await vi.advanceTimersByTimeAsync(400);
        expect(polite.textContent).toBe('Saved. All done');
        expect(assertive.textContent).toBe('');
        const bad = document.createElement('void-toast') as VoidToast;
        bad.color = 'error';
        bad.duration = 0;
        bad.innerHTML = '<void-toast-description>Failed</void-toast-description>';
        el.appendChild(bad);
        await vi.advanceTimersByTimeAsync(400);
        expect(assertive.textContent).toBe('Failed');
      } finally {
        vi.useRealTimers();
        document.querySelectorAll('void-toast-container').forEach(c => c.remove());
      }
    });
  });

  describe('VoidToastContainer.show()', () => {
    it('creates a toast and appends it to container', () => {
      const toast = VoidToastContainer.show({ description: 'Test message' });
      const container = document.querySelector('void-toast-container');
      expect(container).not.toBeNull();
      expect(container!.contains(toast)).toBe(true);
    });

    it('returns the VoidToast element', () => {
      const toast = VoidToastContainer.show({ description: 'Test' });
      expect(toast).toBeInstanceOf(VoidToast);
    });

    it('toast has correct message', () => {
      const toast = VoidToastContainer.show({ description: 'Hello World' });
      expect(toast.querySelector(':scope > void-toast-description')!.textContent).toBe('Hello World');
    });

    it('creates container if none exists in document', () => {
      expect(document.querySelector('void-toast-container')).toBeNull();
      VoidToastContainer.show({ description: 'Test' });
      expect(document.querySelector('void-toast-container')).not.toBeNull();
    });

    it('uses existing container if one exists', () => {
      const existing = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(existing);
      VoidToastContainer.show({ description: 'Test' });
      const containers = document.querySelectorAll('void-toast-container');
      expect(containers.length).toBe(1);
      expect(containers[0]).toBe(existing);
    });

    it('sets color on toast', () => {
      const toast = VoidToastContainer.show({ description: 'Test', color: 'error' });
      expect(toast.color).toBe('error');
    });

    it('writes a title part when provided', () => {
      const toast = VoidToastContainer.show({ description: 'Test', title: 'Error' });
      expect(toast.querySelector(':scope > void-toast-title')!.textContent).toBe('Error');
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
    el.innerHTML = '<void-toast-description>x</void-toast-description><void-toast-close><button type="button" aria-label="Dismiss">x</button></void-toast-close>';
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  it.each(['error', 'warning', 'default', 'success', 'info'] as const)('color=%s is a plain group, never a live region', async (color) => {
    const el = await make(color, 0);
    expect(el.getAttribute('role')).toBe('group');
    el.color = color === 'error' ? 'success' : 'error';
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('group');
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
    const btn = el.querySelector('button') as HTMLButtonElement;
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

describe('toast() helper', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('shows a toast through the page container, creating one when missing', async () => {
    const { toast } = await import('../../src/components/toast.js');
    const t = toast({ description: 'Saved', color: 'caution', dismissable: false });
    expect(t).toBeInstanceOf(VoidToast);
    expect(t.parentElement?.tagName).toBe('VOID-TOAST-CONTAINER');
    expect(t.color).toBe('caution');
  });

  it('builds the parts an author would write, in order', async () => {
    const { toast } = await import('../../src/components/toast.js');
    const onClick = vi.fn();
    const t = toast({ title: 'Saved', description: 'Your changes were saved.', actions: [{ label: 'Undo', onClick }], duration: 0 });
    expect(Array.from(t.children).map(c => c.localName)).toEqual([
      'void-toast-title', 'void-toast-description', 'void-toast-actions', 'void-toast-close',
    ]);
    expect(t.querySelector('void-toast-title')!.textContent).toBe('Saved');
    expect(t.querySelector('void-toast-description')!.textContent).toBe('Your changes were saved.');
    const undo = t.querySelector('void-toast-actions > void-button') as HTMLElement;
    expect(undo.textContent).toBe('Undo');
    undo.click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick.mock.calls[0]![1]).toBe(t);
    expect(t.isConnected).toBe(true);
    const close = t.querySelector('void-toast-close > button') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Dismiss');
    close.click();
    expect(t.isConnected).toBe(false);
  });

  it('writes text as text, never as markup', async () => {
    const { toast } = await import('../../src/components/toast.js');
    const t = toast({ title: '<b>x</b>', description: '<img src=x onerror=alert(1)>', duration: 0 });
    expect(t.querySelector('b, img')).toBeNull();
    expect(t.querySelector('void-toast-description')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('leaves out the close part with dismissable: false and the title and actions when not given', async () => {
    const { toast } = await import('../../src/components/toast.js');
    const t = toast({ description: 'Hi', dismissable: false, duration: 0 });
    expect(Array.from(t.children).map(c => c.localName)).toEqual(['void-toast-description']);
  });

  it('accepts placement="inline" on the container', async () => {
    document.body.innerHTML = '<void-toast-container placement="inline"></void-toast-container>';
    const c = document.body.firstElementChild as VoidToastContainer;
    await c.updateComplete;
    expect(c.placement).toBe('inline');
  });
});
