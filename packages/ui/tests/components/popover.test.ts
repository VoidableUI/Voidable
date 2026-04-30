// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidPopover } from '../../src/components/popover.js';

const TAG = 'void-popover';

function createElement(): VoidPopover {
  return document.createElement(TAG) as VoidPopover;
}

function createWithChildren(): VoidPopover {
  const el = createElement();
  const trigger = document.createElement('button');
  trigger.textContent = 'Toggle';
  const content = document.createElement('div');
  content.textContent = 'Popover content';
  el.appendChild(trigger);
  el.appendChild(content);
  return el;
}

describe('VoidPopover', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidPopover)).toBe(VoidElement);
    });

    it('is registered as void-popover', () => {
      expect(customElements.get(TAG)).toBe(VoidPopover);
    });
  });

  describe('default property values', () => {
    let el: VoidPopover;

    beforeEach(() => {
      el = createElement();
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });

    it('position defaults to "bottom"', () => {
      expect(el.position).toBe('bottom');
    });

    it('trigger defaults to "click"', () => {
      expect(el.trigger).toBe('click');
    });
  });

  describe('reflected attributes', () => {
    let el: VoidPopover;

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

    it('reflects trigger to attribute', async () => {
      el.trigger = 'manual';
      await el.updateComplete;
      expect(el.getAttribute('trigger')).toBe('manual');
    });
  });

  describe('DOM setup', () => {
    let el: VoidPopover;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('creates .void-popover-body element', () => {
      expect(el.querySelector('.void-popover-body')).not.toBeNull();
    });

    it('moves content nodes into .void-popover-body', () => {
      const body = el.querySelector('.void-popover-body');
      expect(body?.textContent).toContain('Popover content');
    });

    it('keeps trigger as direct child', () => {
      const trigger = el.children[0];
      expect(trigger?.tagName).toBe('BUTTON');
    });
  });

  describe('click trigger behavior', () => {
    let el: VoidPopover;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('toggles open when trigger is clicked', async () => {
      const trigger = el.children[0] as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('closes on second trigger click', async () => {
      const trigger = el.children[0] as HTMLElement;
      trigger.click();
      await el.updateComplete;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('dispatches void-close when toggled closed via trigger', async () => {
      const trigger = el.children[0] as HTMLElement;
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      trigger.click();
      await el.updateComplete;
      trigger.click();
      await el.updateComplete;
      expect(events).toHaveLength(1);
    });
  });

  describe('close on outside click', () => {
    let el: VoidPopover;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      el.open = true;
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('closes when clicking outside', async () => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('dispatches void-close on outside click', async () => {
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      expect(events).toHaveLength(1);
    });

    it('does not close when clicking inside', async () => {
      const body = el.querySelector('.void-popover-body') as HTMLElement;
      const inner = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(inner, 'target', { value: body });
      document.dispatchEvent(inner);
      await el.updateComplete;
      expect(el.open).toBe(true);
    });
  });

  describe('close on Escape key', () => {
    let el: VoidPopover;

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

  describe('manual trigger mode', () => {
    let el: VoidPopover;

    beforeEach(async () => {
      el = createWithChildren();
      el.trigger = 'manual';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('does not toggle open on trigger click when trigger="manual"', async () => {
      const trigger = el.children[0] as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('opens when open property is set programmatically', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.open).toBe(true);
    });
  });

  describe('void-close event', () => {
    let el: VoidPopover;

    beforeEach(async () => {
      el = createWithChildren();
      document.body.appendChild(el);
      el.open = true;
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('void-close event bubbles', async () => {
      const events: CustomEvent[] = [];
      el.addEventListener('void-close', (e) => events.push(e as CustomEvent));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(events[0].bubbles).toBe(true);
    });

    it('void-close event is composed', async () => {
      const events: CustomEvent[] = [];
      el.addEventListener('void-close', (e) => events.push(e as CustomEvent));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(events[0].composed).toBe(true);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
