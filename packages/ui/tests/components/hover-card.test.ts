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
  const part = document.createElement('void-hover-card-trigger');
  const trigger = document.createElement('button');
  trigger.textContent = 'Hover me';
  part.appendChild(trigger);
  const content = document.createElement('void-hover-card-content');
  content.textContent = 'Card content';
  el.appendChild(part);
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

    it('moves nothing: the trigger and content parts stay as written', () => {
      expect([...el.children].map((c) => c.localName)).toEqual(['void-hover-card-trigger', 'void-hover-card-content']);
      expect(el.querySelector('void-hover-card-trigger > button')).not.toBeNull();
      expect(el.querySelector('void-hover-card-content')!.textContent).toBe('Card content');
    });

    it('gives the content an id and keeps a server id', async () => {
      expect(el.querySelector('void-hover-card-content')!.id).not.toBe('');
      const other = createElement();
      other.innerHTML = '<void-hover-card-trigger><a href="#">x</a></void-hover-card-trigger><void-hover-card-content id="srv">y</void-hover-card-content>';
      document.body.appendChild(other);
      await other.updateComplete;
      expect(other.querySelector('void-hover-card-content')!.id).toBe('srv');
      other.remove();
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
      const trigger = el.querySelector('void-hover-card-trigger > button') as HTMLElement;
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.runAllTimers();
      await el.updateComplete;
      expect(events).toHaveLength(1);
      expect(events[0].detail).toEqual({ reason: 'hover' });
      expect(events[0].bubbles).toBe(false);
    });

    it('dispatches void-close when closed via trigger mouseleave', async () => {
      vi.useFakeTimers();
      const events: CustomEvent[] = [];
      el.addEventListener('void-close', (e) => events.push(e as CustomEvent));
      const trigger = el.querySelector('void-hover-card-trigger > button') as HTMLElement;
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.runAllTimers();
      await el.updateComplete;
      trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
      vi.runAllTimers();
      await el.updateComplete;
      expect(events).toHaveLength(1);
      expect(events[0].detail).toEqual({ reason: 'hover' });
      expect(events[0].bubbles).toBe(false);
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

    it('puts no popup ARIA on the trigger: the card is supplementary, not a dialog', () => {
      const control = el.querySelector('void-hover-card-trigger > button')!;
      expect(control.hasAttribute('aria-haspopup')).toBe(false);
      expect(control.hasAttribute('aria-expanded')).toBe(false);
      expect(el.querySelector('void-hover-card-content')!.hasAttribute('role')).toBe(false);
    });

    it('the closed card is hidden, so links inside it cannot take focus', async () => {
      const body = el.querySelector<HTMLElement>('void-hover-card-content')!;
      if (typeof body.showPopover === 'function') expect(body.getAttribute('popover')).toBe('manual');
      else expect(body.hidden).toBe(true);
      el.open = true;
      await el.updateComplete;
      expect(body.hidden).toBe(false);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
