// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidBanner } from '../../src/components/banner.js';

describe('VoidBanner', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidBanner)).toBe(VoidElement);
  });

  it('registers as void-banner custom element', () => {
    expect(customElements.get('void-banner')).toBe(VoidBanner);
  });

  describe('default properties', () => {
    let el: VoidBanner;

    beforeEach(() => {
      el = document.createElement('void-banner') as VoidBanner;
    });

    it('defaults color to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('defaults variant to "subtle"', () => {
      expect(el.variant).toBe('subtle');
    });
  });

  describe('ARIA', () => {
    it('has no role (banner is the page header landmark) and keeps one the author wrote', () => {
      const el = document.createElement('void-banner') as VoidBanner;
      document.body.appendChild(el);
      expect(el.hasAttribute('role')).toBe(false);
      el.remove();
      const own = document.createElement('void-banner') as VoidBanner;
      own.setAttribute('role', 'status');
      document.body.appendChild(own);
      expect(own.getAttribute('role')).toBe('status');
      own.remove();
    });
  });

  describe('close part', () => {
    let el: VoidBanner;

    beforeEach(async () => {
      el = document.createElement('void-banner') as VoidBanner;
      el.innerHTML =
        '<void-banner-description>Maintenance</void-banner-description><void-banner-close><button type="button" aria-label="Dismiss">x</button></void-banner-close>';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('writes nothing of its own; the author\'s two parts are the only children', () => {
      expect(Array.from(el.children).map(c => c.localName)).toEqual(['void-banner-description', 'void-banner-close']);
      expect(el.querySelectorAll('button').length).toBe(1);
    });

    it('dispatches void-close when the control in the close part is pressed', async () => {
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      (el.querySelector('void-banner-close button') as HTMLButtonElement).click();
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(false);
      expect((events[0] as CustomEvent).detail).toEqual({ reason: 'close-button' });
    });

    it('stays when a listener cancels void-close', async () => {
      el.addEventListener('void-close', (e) => e.preventDefault(), { once: true });
      (el.querySelector('void-banner-close button') as HTMLButtonElement).click();
      expect(el.isConnected).toBe(true);
    });

    it('removes itself from the DOM when closed', async () => {
      (el.querySelector('void-banner-close button') as HTMLButtonElement).click();
      expect(document.body.contains(el)).toBe(false);
    });

    it('moves focus to the next focusable element when the closed banner held it', () => {
      const after = document.createElement('button');
      document.body.append(after);
      const button = el.querySelector('button') as HTMLButtonElement;
      button.focus();
      button.click();
      expect(document.activeElement).toBe(after);
      after.remove();
    });

    it('is not dismissed by a click elsewhere', () => {
      (el.querySelector('void-banner-description') as HTMLElement).click();
      expect(document.body.contains(el)).toBe(true);
    });

    it('has no way to dismiss it without a close part', async () => {
      const plain = document.createElement('void-banner') as VoidBanner;
      plain.innerHTML = '<void-banner-description>Hi</void-banner-description>';
      document.body.appendChild(plain);
      await plain.updateComplete;
      expect(plain.querySelector('button')).toBeNull();
      plain.click();
      expect(document.body.contains(plain)).toBe(true);
      plain.remove();
    });

    it('a close part added later works', async () => {
      const late = document.createElement('void-banner') as VoidBanner;
      late.innerHTML = '<void-banner-description>Hi</void-banner-description>';
      document.body.appendChild(late);
      await late.updateComplete;
      late.insertAdjacentHTML('beforeend', '<void-banner-close><button type="button" aria-label="Dismiss">x</button></void-banner-close>');
      (late.querySelector('button') as HTMLButtonElement).click();
      expect(late.isConnected).toBe(false);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-banner') as VoidBanner;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
