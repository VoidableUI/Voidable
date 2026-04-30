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

    it('defaults dismissable to false', () => {
      expect(el.dismissable).toBe(false);
    });

    it('defaults variant to "subtle"', () => {
      expect(el.variant).toBe('subtle');
    });
  });

  describe('ARIA', () => {
    it('sets role="banner" when connected', () => {
      const el = document.createElement('void-banner') as VoidBanner;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('banner');
      el.remove();
    });
  });

  describe('close', () => {
    let el: VoidBanner;

    beforeEach(async () => {
      el = document.createElement('void-banner') as VoidBanner;
      el.dismissable = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('dispatches void-close event when close button is clicked', async () => {
      const events: Event[] = [];
      document.addEventListener('void-close', (e) => events.push(e));

      const btn = el.querySelector('.void-banner-close') as HTMLButtonElement;
      btn.click();

      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect((events[0] as CustomEvent).composed).toBe(true);
    });

    it('removes itself from the DOM when closed', async () => {
      expect(document.body.contains(el)).toBe(true);

      const btn = el.querySelector('.void-banner-close') as HTMLButtonElement;
      btn.click();

      expect(document.body.contains(el)).toBe(false);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-banner') as VoidBanner;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
