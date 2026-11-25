// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidAlert } from '../../src/components/alert.js';

describe('VoidAlert', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidAlert)).toBe(VoidElement);
  });

  it('registers as void-alert custom element', () => {
    expect(customElements.get('void-alert')).toBe(VoidAlert);
  });

  describe('default properties', () => {
    let el: VoidAlert;

    beforeEach(() => {
      el = document.createElement('void-alert') as VoidAlert;
    });

    it('defaults color to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('defaults dismissible to false', () => {
      expect(el.dismissible).toBe(false);
    });

    it('defaults variant to "subtle"', () => {
      expect(el.variant).toBe('subtle');
    });
  });

  describe('ARIA', () => {
    it('sets role="alert" when connected', () => {
      const el = document.createElement('void-alert') as VoidAlert;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('alert');
    });
  });

  describe('dismiss', () => {
    let el: VoidAlert;

    beforeEach(async () => {
      el = document.createElement('void-alert') as VoidAlert;
      el.dismissible = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('dispatches void-dismiss event when close button is clicked', async () => {
      const events: Event[] = [];
      document.addEventListener('void-dismiss', (e) => events.push(e));

      const btn = el.shadowRoot!.querySelector('[part="close"]') as HTMLButtonElement;
      btn.click();

      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect((events[0] as CustomEvent).composed).toBe(true);
    });

    it('removes itself from the DOM when dismissed', async () => {
      expect(document.body.contains(el)).toBe(true);

      const btn = el.shadowRoot!.querySelector('[part="close"]') as HTMLButtonElement;
      btn.click();

      expect(document.body.contains(el)).toBe(false);
    });
  });

  describe('explicit parts (#52)', () => {
    it('leaves the title and description parts where they are and adds no light-DOM nodes', async () => {
      const el = document.createElement('void-alert') as VoidAlert;
      el.innerHTML = '<void-alert-title>Saved</void-alert-title><void-alert-description>All changes are stored.</void-alert-description>';
      const before = [...el.childNodes];
      el.dismissible = true;
      document.body.appendChild(el);
      await el.updateComplete;
      expect([...el.childNodes]).toEqual(before);
      expect(el.shadowRoot!.querySelector('slot')).not.toBeNull();
      el.remove();
    });

    it('has no shadow root unless it is dismissible', async () => {
      const el = document.createElement('void-alert') as VoidAlert;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot).toBeNull();
      el.remove();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-alert') as VoidAlert;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
