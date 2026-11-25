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
  const part = document.createElement('void-popover-trigger');
  const trigger = document.createElement('button');
  trigger.textContent = 'Toggle';
  part.appendChild(trigger);
  const content = document.createElement('void-popover-content');
  content.textContent = 'Popover content';
  el.appendChild(part);
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

    it('moves nothing: the trigger and content parts stay as written', () => {
      expect([...el.children].map((c) => c.localName)).toEqual(['void-popover-trigger', 'void-popover-content']);
      expect(el.children[0]!.firstElementChild!.tagName).toBe('BUTTON');
      expect(el.querySelector('void-popover-content')!.textContent).toBe('Popover content');
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
      const trigger = el.querySelector('void-popover-trigger > button') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('closes on second trigger click', async () => {
      const trigger = el.querySelector('void-popover-trigger > button') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('dispatches void-close when toggled closed via trigger', async () => {
      const trigger = el.querySelector('void-popover-trigger > button') as HTMLElement;
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
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('dispatches void-close on outside click', async () => {
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      await el.updateComplete;
      expect(events).toHaveLength(1);
      expect((events[0] as CustomEvent).detail).toEqual({ reason: 'outside' });
    });

    it('does not close when clicking inside', async () => {
      const body = el.querySelector('void-popover-content') as HTMLElement;
      body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
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
      const trigger = el.querySelector('void-popover-trigger > button') as HTMLElement;
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

    it('void-close does not bubble (a popover closing inside a dialog is not the dialog closing)', async () => {
      const events: CustomEvent[] = [];
      el.addEventListener('void-close', (e) => events.push(e as CustomEvent));
      let reachedBody = false;
      document.body.addEventListener('void-close', () => { reachedBody = true; }, { once: true });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(events[0].bubbles).toBe(false);
      expect(reachedBody).toBe(false);
    });

    it('void-close from Escape is cancelable and carries the reason', async () => {
      el.addEventListener('void-close', (e) => e.preventDefault(), { once: true });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });

  describe('align', () => {
    it('defaults to "start"', () => {
      expect(createElement().align).toBe('start');
    });

    it.each(['start', 'center', 'end'] as const)('reflects align="%s"', async (value) => {
      const el = createWithChildren();
      document.body.appendChild(el);
      el.align = value;
      await el.updateComplete;
      expect(el.getAttribute('align')).toBe(value);
      el.remove();
    });

    it('reads the align attribute', async () => {
      const el = createWithChildren();
      el.setAttribute('align', 'end');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.align).toBe('end');
      el.remove();
    });
  });

  describe('overlay model', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    async function mounted(): Promise<VoidPopover> {
      document.body.innerHTML = '<void-popover id="p"><void-popover-trigger><button id="t">Open</button></void-popover-trigger><void-popover-content><p>text</p><button id="inner">x</button></void-popover-content></void-popover>';
      const el = document.getElementById('p') as VoidPopover;
      await el.updateComplete;
      return el;
    }

    it('renders the body as a manual popover named by its trigger, with trigger ARIA', async () => {
      const el = await mounted();
      const body = el.querySelector('void-popover-content')!;
      const t = el.querySelector('#t')!;
      // happy-dom has no Popover API: the controller falls back to [hidden] (browsers keep popover="manual").
      if (typeof HTMLElement.prototype.showPopover === 'function') expect(body.getAttribute('popover')).toBe('manual');
      else expect((body as HTMLElement).hidden).toBe(true);
      expect(body.getAttribute('role')).toBe('dialog');
      expect(body.getAttribute('aria-labelledby')).toBe('t');
      expect(t.getAttribute('aria-haspopup')).toBe('dialog');
      expect(t.getAttribute('aria-expanded')).toBe('false');
      expect(t.getAttribute('aria-controls')).toBe(body.id);
      (t as HTMLElement).click();
      await el.updateComplete;
      expect(t.getAttribute('aria-expanded')).toBe('true');
    });

    it('opening from the trigger moves focus in; Escape returns it to the trigger', async () => {
      const el = await mounted();
      const t = el.querySelector<HTMLElement>('#t')!;
      t.focus();
      t.click();
      await el.updateComplete;
      expect(document.activeElement?.id).toBe('inner');
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await el.updateComplete;
      await el.updateComplete;
      expect(el.open).toBe(false);
      expect(document.activeElement).toBe(t);
    });

    it('opening programmatically leaves focus alone', async () => {
      const el = await mounted();
      const other = document.createElement('input');
      document.body.appendChild(other);
      other.focus();
      el.open = true;
      await el.updateComplete;
      expect(document.activeElement).toBe(other);
    });

    it('focus moving elsewhere closes it (reason blur)', async () => {
      const el = await mounted();
      const other = document.createElement('input');
      document.body.appendChild(other);
      el.querySelector<HTMLElement>('#t')!.click();
      await el.updateComplete;
      const reasons: string[] = [];
      el.addEventListener('void-close', e => reasons.push((e as CustomEvent).detail.reason));
      other.focus();
      await el.updateComplete;
      expect(el.open).toBe(false);
      expect(reasons).toEqual(['blur']);
      expect(document.activeElement).toBe(other);
    });

    it('writes the requested placement on the surface', async () => {
      const el = await mounted();
      el.position = 'top';
      el.align = 'end';
      el.open = true;
      await el.updateComplete;
      const body = el.querySelector('void-popover-content')!;
      expect(body.getAttribute('data-void-side')).toBe('top');
      expect(body.getAttribute('data-void-align')).toBe('end');
      expect(body.hasAttribute('data-void-position')).toBe(true);
    });
  });
});
