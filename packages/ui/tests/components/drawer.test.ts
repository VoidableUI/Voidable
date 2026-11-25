// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDrawer } from '../../src/components/drawer.js';
import '../../src/components/dialog.js';
import type { VoidDialog } from '../../src/components/dialog.js';
import { cleanup, flush, locks, pointerdown, press, stack } from '../helpers/overlay.js';

const TAG = 'void-drawer';

async function mount(props: Partial<VoidDrawer> = {}, content = '<button id="inside">x</button>'): Promise<VoidDrawer> {
  const el = document.createElement(TAG) as VoidDrawer;
  el.id = 'drawer';
  el.innerHTML = content;
  Object.assign(el, props);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const panel = (el: Element) => el.querySelector(':scope > dialog.void-drawer-panel') as HTMLDialogElement;

afterEach(cleanup);

describe('VoidDrawer', () => {
  describe('class', () => {
    it('extends VoidElement and is registered', () => {
      expect(Object.getPrototypeOf(VoidDrawer)).toBe(VoidElement);
      expect(customElements.get(TAG)).toBe(VoidDrawer);
    });

    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement(TAG) as VoidDrawer;
      expect(el.createRenderRoot()).toBe(el);
    });
  });

  describe('defaults and reflection', () => {
    it('open false, side right, size md, heading empty, closable true', () => {
      const el = document.createElement(TAG) as VoidDrawer;
      expect([el.open, el.side, el.size, el.heading, el.closable]).toEqual([false, 'right', 'md', '', true]);
    });

    it('reflects open, side and size, and reads them from markup', async () => {
      document.body.innerHTML = '<void-drawer id="d" side="left" size="lg"></void-drawer>';
      const el = document.getElementById('d') as VoidDrawer;
      await flush(el);
      expect([el.side, el.size]).toEqual(['left', 'lg']);
      el.open = true;
      await flush(el);
      expect(el.hasAttribute('open')).toBe(true);
    });
  });

  describe('structure and naming', () => {
    it('renders a native <dialog> panel holding the content; the host has no dialog role', async () => {
      const el = await mount({ heading: 'Filters' });
      expect(panel(el)).toBeInstanceOf(HTMLDialogElement);
      expect(panel(el).querySelector('.void-drawer-body #inside')).not.toBeNull();
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-modal')).toBe(false);
      const title = el.querySelector(`#${panel(el).getAttribute('aria-labelledby')}`);
      expect(title?.textContent).toBe('Filters');
    });

    it('hides the empty heading and names the panel from aria-label without one', async () => {
      const el = document.createElement(TAG) as VoidDrawer;
      el.setAttribute('aria-label', 'Navigation');
      document.body.appendChild(el);
      await flush(el);
      expect(el.querySelector<HTMLElement>('.void-drawer-heading')!.hidden).toBe(true);
      expect(panel(el).getAttribute('aria-label')).toBe('Navigation');
    });

    it('renders the close button only when closable', async () => {
      const el = await mount();
      expect(el.querySelector('.void-drawer-close')).not.toBeNull();
      el.closable = false;
      await flush(el);
      expect(el.querySelector('.void-drawer-close')).toBeNull();
    });
  });

  describe('opening, closing and focus', () => {
    it('opens as a modal, takes focus, and locks scrolling', async () => {
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();
      const el = await mount({ open: true });
      expect(panel(el).open).toBe(true);
      expect(document.activeElement?.id).toBe('inside');
      expect(stack()).toEqual(['drawer']);
      expect(locks()).toBe(1);
      press('Escape');
      await flush(el);
      expect(el.open).toBe(false);
      expect(panel(el).open).toBe(false);
      expect(document.activeElement).toBe(opener);
      expect(locks()).toBe(0);
    });

    it('Escape works right after opening, without focus inside first', async () => {
      const el = await mount();
      el.open = true;
      await flush(el);
      press('Escape', document.body);
      await flush(el);
      expect(el.open).toBe(false);
    });

    it('close button, backdrop press and Escape each close it with their reason', async () => {
      const el = await mount();
      const reasons: string[] = [];
      el.addEventListener('void-close', e => reasons.push((e as CustomEvent).detail.reason));
      el.open = true;
      await flush(el);
      el.querySelector<HTMLButtonElement>('.void-drawer-close')!.click();
      await flush(el);
      el.open = true;
      await flush(el);
      pointerdown(document.body);
      await flush(el);
      el.open = true;
      await flush(el);
      press('Escape');
      await flush(el);
      expect(reasons).toEqual(['close-button', 'outside', 'escape']);
      expect(el.open).toBe(false);
    });

    it('closable="false" ignores Escape and backdrop presses', async () => {
      const el = await mount({ closable: false, open: true });
      press('Escape');
      pointerdown(document.body);
      await flush(el);
      expect(el.open).toBe(true);
    });

    it('a press inside the panel does not close it', async () => {
      const el = await mount({ open: true });
      pointerdown(el.querySelector('#inside')!);
      await flush(el);
      expect(el.open).toBe(true);
    });
  });

  describe('nesting', () => {
    it('a dialog inside the drawer stacks above it: Escape closes the dialog, then the drawer', async () => {
      const el = await mount({ open: true }, '<button id="b">x</button><void-dialog id="inner"><input id="i"></void-dialog>');
      const inner = el.querySelector('#inner') as VoidDialog;
      inner.open = true;
      await flush(inner, el);
      expect(stack()).toEqual(['drawer', 'inner']);
      expect(locks()).toBe(2);
      press('Escape');
      await flush(inner, el);
      expect(inner.open).toBe(false);
      expect(el.open).toBe(true);
      expect(locks()).toBe(1);
      press('Escape');
      await flush(inner, el);
      expect(el.open).toBe(false);
      expect(locks()).toBe(0);
    });
  });
});
