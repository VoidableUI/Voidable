// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidToggle } from '../../src/components/toggle.js';

const TAG = 'void-toggle';

async function mount(props: Partial<VoidToggle> = {}): Promise<VoidToggle> {
  const el = document.createElement(TAG) as VoidToggle;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const key = (el: Element, k: string) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  el.dispatchEvent(e);
  // Space activates on keyup, as on a native button.
  if (k === ' ') el.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true }));
  return e;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidToggle', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidToggle.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-toggle', () => {
      expect(customElements.get(TAG)).toBe(VoidToggle);
    });
  });

  describe('default property values', () => {
    let el: VoidToggle;
    beforeEach(() => {
      el = document.createElement(TAG) as VoidToggle;
    });
    it('pressed defaults to false', () => expect(el.pressed).toBe(false));
    it('disabled defaults to false', () => expect(el.disabled).toBe(false));
    it('color defaults to "default"', () => expect(el.color).toBe('default'));
    it('size defaults to "md"', () => expect(el.size).toBe('md'));
    it('variant defaults to "outline"', () => expect(el.variant).toBe('outline'));
  });

  describe('attribute reflection', () => {
    it('reflects every public property to an attribute', async () => {
      const el = await mount({ pressed: true, disabled: true, color: 'error', size: 'lg', variant: 'filled' });
      expect(el.hasAttribute('pressed')).toBe(true);
      expect(el.hasAttribute('disabled')).toBe(true);
      expect(el.getAttribute('color')).toBe('error');
      expect(el.getAttribute('size')).toBe('lg');
      expect(el.getAttribute('variant')).toBe('filled');
    });

    it('reads attributes into properties', async () => {
      const el = await mount();
      el.setAttribute('pressed', '');
      el.setAttribute('size', 'sm');
      await el.updateComplete;
      expect(el.pressed).toBe(true);
      expect(el.size).toBe('sm');
    });
  });

  describe('ARIA', () => {
    it('sets role="button" and tabindex="0"', async () => {
      const el = await mount();
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('exposes aria-pressed="false" initially', async () => {
      const el = await mount();
      expect(el.getAttribute('aria-pressed')).toBe('false');
    });

    it('exposes aria-pressed="true" when initially pressed', async () => {
      const el = await mount({ pressed: true });
      expect(el.getAttribute('aria-pressed')).toBe('true');
    });

    it('tracks aria-pressed when pressed changes programmatically', async () => {
      const el = await mount();
      el.pressed = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-pressed')).toBe('true');
      el.pressed = false;
      await el.updateComplete;
      expect(el.getAttribute('aria-pressed')).toBe('false');
    });

    it('sets aria-disabled and tabindex="-1" when disabled', async () => {
      const el = await mount({ disabled: true });
      expect(el.getAttribute('aria-disabled')).toBe('true');
      expect(el.getAttribute('tabindex')).toBe('-1');
    });

    it('restores tabindex and aria-disabled when re-enabled', async () => {
      const el = await mount({ disabled: true });
      el.disabled = false;
      await el.updateComplete;
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('click', () => {
    it('toggles pressed on and off', async () => {
      const el = await mount();
      el.click();
      expect(el.pressed).toBe(true);
      el.click();
      expect(el.pressed).toBe(false);
    });

    it('updates aria-pressed after a click', async () => {
      const el = await mount();
      el.click();
      await el.updateComplete;
      expect(el.getAttribute('aria-pressed')).toBe('true');
    });

    it('does nothing when disabled', async () => {
      const el = await mount({ disabled: true });
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.click();
      expect(el.pressed).toBe(false);
      expect(fired).toBe(false);
    });
  });

  describe('void-change event', () => {
    it('is dispatched with the new pressed state', async () => {
      const el = await mount();
      const details: unknown[] = [];
      el.addEventListener('void-change', (e) => details.push((e as CustomEvent).detail));
      el.click();
      el.click();
      expect(details).toEqual([{ pressed: true }, { pressed: false }]);
    });

    it('bubbles and is composed', async () => {
      const el = await mount();
      let ev: CustomEvent | null = null;
      document.body.addEventListener('void-change', (e) => { ev = e as CustomEvent; }, { once: true });
      el.click();
      expect(ev).not.toBeNull();
      expect(ev!.bubbles).toBe(true);
      expect(ev!.composed).toBe(true);
    });

    it('is not dispatched when pressed is set programmatically', async () => {
      const el = await mount();
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.pressed = true;
      await el.updateComplete;
      expect(fired).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('Space toggles and prevents default scrolling', async () => {
      const el = await mount();
      const e = key(el, ' ');
      expect(el.pressed).toBe(true);
      expect(e.defaultPrevented).toBe(true);
    });

    it('Enter toggles', async () => {
      const el = await mount();
      key(el, 'Enter');
      expect(el.pressed).toBe(true);
    });

    it('dispatches void-change for keyboard activation', async () => {
      const el = await mount();
      let detail: unknown;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      key(el, 'Enter');
      expect(detail).toEqual({ pressed: true });
    });

    it('ignores other keys', async () => {
      const el = await mount();
      const e = key(el, 'a');
      expect(el.pressed).toBe(false);
      expect(e.defaultPrevented).toBe(false);
    });

    it('does nothing when disabled', async () => {
      const el = await mount({ disabled: true });
      key(el, ' ');
      key(el, 'Enter');
      expect(el.pressed).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('does not respond after being disconnected', async () => {
      const el = await mount();
      el.remove();
      el.click();
      expect(el.pressed).toBe(false);
    });

    it('toggles exactly once per click after being reconnected (no duplicate listeners)', async () => {
      const el = await mount();
      el.remove();
      document.body.appendChild(el);
      await el.updateComplete;
      let count = 0;
      el.addEventListener('void-change', () => count++);
      el.click();
      expect(count).toBe(1);
      expect(el.pressed).toBe(true);
    });
  });
});
