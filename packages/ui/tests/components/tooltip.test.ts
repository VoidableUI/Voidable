// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTooltip } from '../../src/components/tooltip.js';

const TAG = 'void-tooltip';

function createElement(): VoidTooltip {
  return document.createElement(TAG) as VoidTooltip;
}

describe('VoidTooltip', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidTooltip)).toBe(VoidElement);
    });

    it('is registered as void-tooltip', () => {
      expect(customElements.get(TAG)).toBe(VoidTooltip);
    });
  });

  describe('default property values', () => {
    let el: VoidTooltip;

    beforeEach(() => {
      el = createElement();
    });

    it('text defaults to empty string', () => {
      expect(el.text).toBe('');
    });

    it('position defaults to top', () => {
      expect(el.position).toBe('top');
    });

    it('delay defaults to 200', () => {
      expect(el.delay).toBe(200);
    });
  });

  describe('attribute reflection', () => {
    let el: VoidTooltip;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    it('reflects position to attribute', async () => {
      el.position = 'bottom';
      await el.updateComplete;
      expect(el.getAttribute('position')).toBe('bottom');
    });
  });

  describe('tooltip bubble', () => {
    let el: VoidTooltip;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('renders .void-tooltip-bubble span', () => {
      expect(el.querySelector('.void-tooltip-bubble')).not.toBeNull();
    });

    it('bubble has role="tooltip"', () => {
      const bubble = el.querySelector('.void-tooltip-bubble');
      expect(bubble?.getAttribute('role')).toBe('tooltip');
    });

    it('bubble id matches _tooltipId', () => {
      const bubble = el.querySelector('.void-tooltip-bubble');
      expect(bubble?.id).toBe((el as unknown as { _tooltipId: string })._tooltipId);
    });

    it('bubble contains text property value', async () => {
      el.text = 'Hello';
      await el.updateComplete;
      const bubble = el.querySelector('.void-tooltip-bubble');
      expect(bubble?.textContent).toBe('Hello');
    });
  });

  describe('visibility', () => {
    let el: VoidTooltip;

    beforeEach(async () => {
      el = createElement();
      el.delay = 200;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
      vi.useRealTimers();
    });

    it('hidden by default', () => {
      expect(el.hasAttribute('visible')).toBe(false);
    });

    it('mouseenter after delay sets visible attribute', async () => {
      vi.useFakeTimers();
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      vi.runAllTimers();
      await el.updateComplete;
      expect(el.hasAttribute('visible')).toBe(true);
    });

    it('mouseleave removes visible attribute', async () => {
      vi.useFakeTimers();
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      vi.runAllTimers();
      await el.updateComplete;
      vi.useRealTimers();
      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('visible')).toBe(false);
    });

    it('focusin shows immediately', async () => {
      el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('visible')).toBe(true);
    });

    it('focusout hides tooltip', async () => {
      el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await el.updateComplete;
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('visible')).toBe(false);
    });
  });

  describe('aria-describedby', () => {
    let el: VoidTooltip;
    let trigger: HTMLButtonElement;

    beforeEach(async () => {
      el = createElement();
      trigger = document.createElement('button');
      el.appendChild(trigger);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('trigger gets aria-describedby when visible', async () => {
      el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await el.updateComplete;
      const tooltipId = (el as unknown as { _tooltipId: string })._tooltipId;
      expect(trigger.getAttribute('aria-describedby')).toBe(tooltipId);
    });

    it('aria-describedby removed when hidden', async () => {
      el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await el.updateComplete;
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await el.updateComplete;
      expect(trigger.getAttribute('aria-describedby')).toBeNull();
    });
  });

  describe('user content preserved', () => {
    it('slotted children are preserved after render', async () => {
      const el = createElement();
      const btn = document.createElement('button');
      el.appendChild(btn);
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('button')).not.toBeNull();
      el.remove();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
