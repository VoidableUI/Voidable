// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDialog } from '../../src/components/dialog.js';

const TAG = 'void-dialog';

function createElement(): VoidDialog {
  return document.createElement(TAG) as VoidDialog;
}

describe('VoidDialog', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidDialog)).toBe(VoidElement);
    });

    it('is registered as void-dialog', () => {
      expect(customElements.get(TAG)).toBe(VoidDialog);
    });
  });

  describe('default property values', () => {
    let el: VoidDialog;

    beforeEach(() => {
      el = createElement();
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });

    it('heading defaults to empty string', () => {
      expect(el.heading).toBe('');
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('closable defaults to true', () => {
      expect(el.closable).toBe(true);
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidDialog;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
      document.body.style.overflow = '';
    });

    it('sets role="dialog" on connect', () => {
      expect(el.getAttribute('role')).toBe('dialog');
    });

    it('sets aria-modal="true" on connect', () => {
      expect(el.getAttribute('aria-modal')).toBe('true');
    });

    it('sets aria-label from heading on connect', () => {
      const el2 = createElement();
      el2.heading = 'Confirm';
      document.body.appendChild(el2);
      expect(el2.getAttribute('aria-label')).toBe('Confirm');
      el2.remove();
    });

    it('updates aria-label when heading changes', async () => {
      el.heading = 'New Heading';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('New Heading');
    });

    it('removes aria-label when heading is cleared', async () => {
      el.heading = 'Title';
      await el.updateComplete;
      el.heading = '';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBeNull();
    });
  });

  describe('open/close behavior', () => {
    let el: VoidDialog;

    beforeEach(async () => {
      el = createElement();
      el.heading = 'Test Dialog';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
      document.body.style.overflow = '';
    });

    it('renders backdrop when open is true', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.querySelector('.void-dialog-backdrop')).not.toBeNull();
    });

    it('does not render backdrop when open is false', async () => {
      expect(el.querySelector('.void-dialog-backdrop')).toBeNull();
    });

    it('reflects open to attribute', async () => {
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('sets body overflow:hidden when opened', async () => {
      el.open = true;
      await el.updateComplete;
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body overflow when closed', async () => {
      el.open = true;
      await el.updateComplete;
      el.open = false;
      await el.updateComplete;
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('close via Escape key', () => {
    let el: VoidDialog;

    beforeEach(async () => {
      el = createElement();
      el.heading = 'Test';
      document.body.appendChild(el);
      el.open = true;
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
      document.body.style.overflow = '';
    });

    it('closes dialog on Escape key when closable', async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('dispatches void-close event on Escape', async () => {
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(events).toHaveLength(1);
    });
  });

  describe('void-close event', () => {
    let el: VoidDialog;

    beforeEach(async () => {
      el = createElement();
      el.heading = 'Test';
      document.body.appendChild(el);
      el.open = true;
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
      document.body.style.overflow = '';
    });

    it('dispatches void-close when close button is clicked', async () => {
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      const btn = el.querySelector('.void-dialog-close') as HTMLButtonElement;
      btn.click();
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect((events[0] as CustomEvent).composed).toBe(true);
    });

    it('dispatches void-close when backdrop is clicked', async () => {
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      const backdrop = el.querySelector('.void-dialog-backdrop') as HTMLElement;
      backdrop.click();
      expect(events).toHaveLength(1);
    });
  });

  describe('closable=false behavior', () => {
    let el: VoidDialog;

    beforeEach(async () => {
      el = createElement();
      el.heading = 'Required';
      el.closable = false;
      document.body.appendChild(el);
      el.open = true;
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
      document.body.style.overflow = '';
    });

    it('does not render close button when closable is false', () => {
      expect(el.querySelector('.void-dialog-close')).toBeNull();
    });

    it('does not close on Escape when closable is false', async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('does not dispatch void-close on Escape when closable is false', async () => {
      const events: Event[] = [];
      el.addEventListener('void-close', (e) => events.push(e));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(events).toHaveLength(0);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
