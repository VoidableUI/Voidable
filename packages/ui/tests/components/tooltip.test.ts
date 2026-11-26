// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTooltip } from '../../src/components/tooltip.js';

const TAG = 'void-tooltip';

function createElement(): VoidTooltip {
  return document.createElement(TAG) as VoidTooltip;
}

/** A tooltip in the explicit-parts form (#52): a trigger wrapping one button, and the hint content. */
async function mount(hint = 'Copy to clipboard'): Promise<{ el: VoidTooltip; button: HTMLButtonElement; content: HTMLElement }> {
  const el = createElement();
  el.innerHTML = `<void-tooltip-trigger><button>Copy</button></void-tooltip-trigger><void-tooltip-content>${hint}</void-tooltip-content>`;
  document.body.appendChild(el);
  await el.updateComplete;
  return { el, button: el.querySelector('button')!, content: el.querySelector('void-tooltip-content')! };
}

const over = (target: Element, related: Element | null = null) =>
  target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: related }));
const out = (target: Element, related: Element | null = null) =>
  target.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: related }));

describe('VoidTooltip', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidTooltip)).toBe(VoidElement);
    });

    it('is registered as void-tooltip', () => {
      expect(customElements.get(TAG)).toBe(VoidTooltip);
    });

    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });

  describe('default property values', () => {
    let el: VoidTooltip;

    beforeEach(() => {
      el = createElement();
    });

    it('has no text property (the hint is the content part)', () => {
      expect('text' in el).toBe(false);
    });

    it('align defaults to center and open to false', () => {
      expect(el.align).toBe('center');
      expect(el.open).toBe(false);
    });

    it('side defaults to top and delay to 200', () => {
      expect(el.side).toBe('top');
      expect(el.delay).toBe(200);
    });
  });

  describe('attribute reflection', () => {
    it('reflects side to attribute', async () => {
      const { el } = await mount();
      el.side = 'bottom';
      await el.updateComplete;
      expect(el.getAttribute('side')).toBe('bottom');
    });
  });

  describe('explicit parts (#52)', () => {
    it('moves and renders nothing: the parts stay as written', async () => {
      const el = createElement();
      el.innerHTML = '<void-tooltip-trigger><button>Copy</button></void-tooltip-trigger><void-tooltip-content>Hint</void-tooltip-content>';
      const before = [...el.querySelectorAll('*')];
      document.body.appendChild(el);
      await el.updateComplete;
      expect([...el.querySelectorAll('*')]).toEqual(before);
    });

    it('makes the content a role="tooltip" with an id, and describes the control by it', async () => {
      const { button, content } = await mount();
      expect(content.getAttribute('role')).toBe('tooltip');
      expect(content.id).not.toBe('');
      expect(button.getAttribute('aria-describedby')).toBe(content.id);
      expect(content.hasAttribute('aria-label')).toBe(false);
    });

    it('keeps a server id on the content and adds to an existing aria-describedby', async () => {
      const el = createElement();
      el.innerHTML = '<void-tooltip-trigger><button aria-describedby="help">Copy</button></void-tooltip-trigger><void-tooltip-content id="srv">Hint</void-tooltip-content>';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('void-tooltip-content')!.id).toBe('srv');
      expect(el.querySelector('button')!.getAttribute('aria-describedby')).toBe('help srv');
    });

    it('takes its token back when the content part is removed', async () => {
      const { el, button, content } = await mount();
      content.remove();
      await new Promise((r) => setTimeout(r, 0));
      await el.updateComplete;
      expect(button.hasAttribute('aria-describedby')).toBe(false);
      expect(content.hasAttribute('role')).toBe(false);
    });

    it('updates the hint text in place', async () => {
      const { el, content } = await mount('Copy');
      content.textContent = 'Copied';
      await el.updateComplete;
      expect(el.querySelector('void-tooltip-content')).toBe(content);
      expect(content.textContent).toBe('Copied');
    });
  });

  describe('visibility', () => {
    it('is closed by default', async () => {
      const { el } = await mount();
      expect(el.hasAttribute('open')).toBe(false);
    });

    it('the pointer entering the trigger opens it after the delay', async () => {
      const { el, button } = await mount();
      vi.useFakeTimers();
      over(button);
      expect(el.open).toBe(false);
      vi.runAllTimers();
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('the pointer leaving the trigger closes it', async () => {
      const { el, button } = await mount();
      vi.useFakeTimers();
      over(button);
      vi.runAllTimers();
      await el.updateComplete;
      vi.useRealTimers();
      out(button, document.body);
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(false);
    });

    it('moving between elements inside the trigger does not close it', async () => {
      const el = createElement();
      el.innerHTML = '<void-tooltip-trigger><button><span id="icon">i</span> Copy</button></void-tooltip-trigger><void-tooltip-content>Hint</void-tooltip-content>';
      document.body.appendChild(el);
      await el.updateComplete;
      const button = el.querySelector('button')!;
      const icon = el.querySelector('#icon')!;
      vi.useFakeTimers();
      over(button);
      vi.runAllTimers();
      await el.updateComplete;
      out(button, icon);
      over(icon, button);
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('hovering the content alone does not open it', async () => {
      const { el, content } = await mount();
      vi.useFakeTimers();
      over(content);
      vi.runAllTimers();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('focus moving away hides it', async () => {
      const { el, button } = await mount();
      el.open = true;
      await el.updateComplete;
      button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(false);
    });

    it('Escape dismisses an open tooltip', async () => {
      const { el } = await mount();
      el.open = true;
      await el.updateComplete;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await el.updateComplete;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(false);
    });

    it('other keys do not dismiss it', async () => {
      const { el, button } = await mount();
      el.open = true;
      await el.updateComplete;
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('the description stays on the control while the tooltip is closed', async () => {
      const { el, button, content } = await mount();
      el.open = true;
      await el.updateComplete;
      el.open = false;
      await el.updateComplete;
      expect(button.getAttribute('aria-describedby')).toBe(content.id);
    });
  });
});
