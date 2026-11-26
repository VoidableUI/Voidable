// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDrawer } from '../../src/components/drawer.js';
import '../../src/components/dialog.js';
import type { VoidDialog } from '../../src/components/dialog.js';
import { cleanup, flush, locks, pointerdown, press, stack } from '../helpers/overlay.js';

const TAG = 'void-drawer';

async function mount(props: Partial<VoidDrawer> = {}, content = '<void-drawer-title>Filters</void-drawer-title><void-drawer-body><button id="inside">x</button></void-drawer-body>'): Promise<VoidDrawer> {
  const el = document.createElement(TAG) as VoidDrawer;
  el.id = 'drawer';
  el.innerHTML = content;
  Object.assign(el, props);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const panel = (el: Element) => el.shadowRoot!.querySelector('dialog') as HTMLDialogElement;
const closeButton = (el: Element) => el.shadowRoot?.querySelector<HTMLButtonElement>('button') ?? null;

afterEach(cleanup);

describe('VoidDrawer', () => {
  describe('class', () => {
    it('extends VoidElement and is registered', () => {
      expect(VoidDrawer.prototype).toBeInstanceOf(VoidElement);
      expect(customElements.get(TAG)).toBe(VoidDrawer);
    });

    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement(TAG) as VoidDrawer;
      expect(el.createRenderRoot()).toBe(el);
    });
  });

  describe('defaults and reflection', () => {
    it('open false, side right, size md, heading empty, hideClose false', () => {
      const el = document.createElement(TAG) as VoidDrawer;
      expect([el.open, el.side, el.size, el.hideClose]).toEqual([false, 'right', 'md', false]);
      expect('heading' in el).toBe(false);
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

  describe('structure and naming (explicit parts, #52)', () => {
    it('renders a native <dialog> in its shadow root and leaves the parts in place', async () => {
      const el = await mount();
      expect(panel(el)).toBeInstanceOf(HTMLDialogElement);
      expect([...el.children].map((c) => c.localName)).toEqual(['void-drawer-title', 'void-drawer-body']);
      // The role is on the native dialog only (one dialog in every tool).
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-modal')).toBe(false);
      const title = el.querySelector('void-drawer-title')!;
      expect(title.getAttribute('role')).toBe('heading');
      const d = panel(el) as HTMLDialogElement & { ariaLabelledByElements?: Element[] };
      if ('ariaLabelledByElements' in d) expect(d.ariaLabelledByElements).toEqual([title]);
    });

    it('names the panel from aria-label without a title', async () => {
      const el = document.createElement(TAG) as VoidDrawer;
      el.setAttribute('aria-label', 'Navigation');
      document.body.appendChild(el);
      await flush(el);
      expect(panel(el).getAttribute('aria-label')).toBe('Navigation');
    });

    it('shows the close button unless hide-close', async () => {
      const el = await mount();
      expect(closeButton(el)!.hidden).toBe(false);
      el.hideClose = true;
      await flush(el);
      expect(closeButton(el)!.hidden).toBe(true);
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
      closeButton(el)!.click();
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

    it('hide-close ignores Escape and backdrop presses', async () => {
      const el = await mount({ hideClose: true, open: true });
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
      const el = await mount({ open: true }, '<button id="b">x</button><void-dialog id="inner"><void-dialog-body><input id="i"></void-dialog-body></void-dialog>');
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
