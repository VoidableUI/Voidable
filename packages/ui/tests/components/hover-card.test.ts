// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidHoverCard } from '../../src/components/hover-card.js';

const TAG = 'void-hover-card';

function createElement(): VoidHoverCard {
  return document.createElement(TAG) as VoidHoverCard;
}

function createWithChildren(): VoidHoverCard {
  const el = createElement();
  const trigger = document.createElement('button');
  trigger.textContent = 'Hover me';
  const content = document.createElement('div');
  content.textContent = 'Card content';
  el.appendChild(trigger);
  el.appendChild(content);
  return el;
}

describe('VoidHoverCard', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidHoverCard)).toBe(VoidElement);
    });

    it('is registered as void-hover-card', () => {
      expect(customElements.get(TAG)).toBe(VoidHoverCard);
    });
  });

  describe('default property values', () => {
    let el: VoidHoverCard;

    beforeEach(() => {
      el = createElement();
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });

    it('position defaults to "bottom"', () => {
      expect(el.position).toBe('bottom');
    });

    it('openDelay defaults to 300', () => {
      expect(el.openDelay).toBe(300);
    });

    it('closeDelay defaults to 300', () => {
      expect(el.closeDelay).toBe(300);
    });
  });

  describe('reflected attributes', () => {
    let el: VoidHoverCard;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('reflects open to attribute', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('reflects position to attribute', async () => {
      el.position = 'top';
      await el.updateComplete;
      expect(el.getAttribute('position')).toBe('top');
    });
  });

  describe('DOM setup', () => {
    let el: VoidHoverCard;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('creates .void-hover-card-trigger wrapper', () => {
      expect(el.querySelector('.void-hover-card-trigger')).not.toBeNull();
    });

    it('creates .void-hover-card-body element', () => {
      expect(el.querySelector('.void-hover-card-body')).not.toBeNull();
    });

    it('moves content nodes into .void-hover-card-body', () => {
      const body = el.querySelector('.void-hover-card-body');
      expect(body?.textContent).toContain('Card content');
    });

    it('keeps trigger inside .void-hover-card-trigger wrapper', () => {
      const wrapper = el.querySelector('.void-hover-card-trigger');
      expect(wrapper?.querySelector('button')).not.toBeNull();
    });
  });

  describe('programmatic open', () => {
    let el: VoidHoverCard;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('opens when open property is set to true', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.open).toBe(true);
      expect(el.hasAttribute('open')).toBe(true);
    });
  });

  describe('events', () => {
    let el: VoidHoverCard;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
      vi.useRealTimers();
    });

    it('dispatches void-open when opened via trigger mouseenter', async () => {
      vi.useFakeTimers();
      const events: CustomEvent[] = [];
      el.addEventListener('void-open', (e) => events.push(e as CustomEvent));
      const trigger = el.querySelector('.void-hover-card-trigger') as HTMLElement;
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      vi.runAllTimers();
      await el.updateComplete;
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect(events[0].composed).toBe(true);
    });

    it('dispatches void-close when closed via trigger mouseleave', async () => {
      vi.useFakeTimers();
      const events: CustomEvent[] = [];
      el.addEventListener('void-close', (e) => events.push(e as CustomEvent));
      const trigger = el.querySelector('.void-hover-card-trigger') as HTMLElement;
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      vi.runAllTimers();
      await el.updateComplete;
      trigger.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      vi.runAllTimers();
      await el.updateComplete;
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect(events[0].composed).toBe(true);
    });
  });

  describe('close on Escape key', () => {
    let el: VoidHoverCard;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      el.open = true;
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('closes on Escape key', async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('dispatches void-close on Escape', async () => {
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(events).toHaveLength(1);
    });

    it('does not close on other keys', async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidHoverCard;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('trigger has aria-haspopup="dialog"', () => {
      const wrapper = el.querySelector('.void-hover-card-trigger');
      expect(wrapper?.getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('trigger has aria-expanded matching open state', async () => {
      const wrapper = el.querySelector('.void-hover-card-trigger');
      expect(wrapper?.getAttribute('aria-expanded')).toBe('false');
      el.open = true;
      await el.updateComplete;
      expect(wrapper?.getAttribute('aria-expanded')).toBe('true');
    });

    it('body has role="dialog"', () => {
      const body = el.querySelector('.void-hover-card-body');
      expect(body?.getAttribute('role')).toBe('dialog');
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
