// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDialog } from '../../src/components/dialog.js';
import { cleanup, flush, locks, pointerdown, press, stack } from '../helpers/overlay.js';

const TAG = 'void-dialog';

async function mount(props: Partial<VoidDialog> = {}, content = '<void-dialog-title>Title</void-dialog-title><void-dialog-body><input id="field"><button id="ok">OK</button></void-dialog-body>'): Promise<VoidDialog> {
  const el = document.createElement(TAG) as VoidDialog;
  el.id = `dlg-${Math.random().toString(36).slice(2, 6)}`;
  el.innerHTML = content;
  Object.assign(el, props);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const panel = (el: Element) => el.shadowRoot!.querySelector('dialog') as HTMLDialogElement;
const closeButton = (el: Element) => el.shadowRoot?.querySelector<HTMLButtonElement>('button') ?? null;

function opener(id = 'opener'): HTMLButtonElement {
  const b = document.createElement('button');
  b.id = id;
  document.body.appendChild(b);
  b.focus();
  return b;
}

afterEach(cleanup);

describe('VoidDialog', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidDialog.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-dialog', () => {
      expect(customElements.get(TAG)).toBe(VoidDialog);
    });

    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement(TAG) as VoidDialog;
      expect(el.createRenderRoot()).toBe(el);
    });
  });

  describe('defaults', () => {
    it('open false, heading empty, size md, hideClose false', () => {
      const el = document.createElement(TAG) as VoidDialog;
      expect([el.open, el.size, el.hideClose]).toEqual([false, 'md', false]);
      expect('heading' in el).toBe(false);
    });
  });

  describe('structure and naming (explicit parts, #52)', () => {
    it('renders a native <dialog> in its shadow root and never moves the author parts', async () => {
      const el = await mount();
      const before = [...el.childNodes];
      const d = panel(el);
      expect(d).toBeInstanceOf(HTMLDialogElement);
      expect(d.querySelector('slot')).not.toBeNull();
      expect([...el.childNodes]).toEqual(before);
      expect([...el.children].map((c) => c.localName)).toEqual(['void-dialog-title', 'void-dialog-body']);
      // The role is on the native dialog only (one dialog in every tool).
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-modal')).toBe(false);
    });

    it('makes the title part a level-2 heading and names the dialog by it', async () => {
      const el = await mount({}, '<void-dialog-title>Confirm</void-dialog-title><void-dialog-description>Sure?</void-dialog-description>');
      const title = el.querySelector('void-dialog-title')!;
      expect(title.getAttribute('role')).toBe('heading');
      expect(title.getAttribute('aria-level')).toBe('2');
      const d = panel(el) as HTMLDialogElement & { ariaLabelledByElements?: Element[]; ariaDescribedByElements?: Element[] };
      if ('ariaLabelledByElements' in d) {
        expect(d.ariaLabelledByElements).toEqual([title]);
        expect(d.ariaDescribedByElements).toEqual([el.querySelector('void-dialog-description')]);
      }
    });

    it('also writes the description as aria-description text on the dialog (#75)', async () => {
      const el = await mount({}, '<void-dialog-title>Confirm</void-dialog-title><void-dialog-description>Sure?</void-dialog-description>');
      expect(panel(el).getAttribute('aria-description')).toBe('Sure?');
    });

    it('keeps a server role on the title', async () => {
      const el = await mount({}, '<void-dialog-title role="none">Confirm</void-dialog-title>');
      expect(el.querySelector('void-dialog-title')!.getAttribute('role')).toBe('none');
    });

    it('without a title, passes the host aria-label to the dialog', async () => {
      const el = document.createElement(TAG) as VoidDialog;
      el.setAttribute('aria-label', 'Settings');
      document.body.appendChild(el);
      await flush(el);
      expect(panel(el).getAttribute('aria-label')).toBe('Settings');
      el.setAttribute('aria-label', 'Preferences');
      await flush(el);
      expect(panel(el).getAttribute('aria-label')).toBe('Preferences');
    });

    it('releases what it set on a title that is removed', async () => {
      const el = await mount();
      const title = el.querySelector('void-dialog-title')!;
      title.remove();
      await flush(el);
      expect(title.hasAttribute('role')).toBe(false);
      expect(title.hasAttribute('aria-level')).toBe(false);
    });

    it('hides the native dialog while closed, keeping the projected content', async () => {
      const el = await mount();
      expect(panel(el).open).toBe(false);
      expect(el.querySelector('#field')).not.toBeNull();
    });
  });

  describe('opening and closing', () => {
    it('opens the native dialog as a modal and reflects open', async () => {
      const el = await mount();
      el.open = true;
      await flush(el);
      expect(panel(el).open).toBe(true);
      expect(el.hasAttribute('open')).toBe(true);
      expect(stack()).toEqual([el.id]);
    });

    it('an open attribute in markup opens it on connect', async () => {
      document.body.innerHTML = '<void-dialog id="d" open><void-dialog-title>H</void-dialog-title><void-dialog-body><p>x</p></void-dialog-body></void-dialog>';
      const el = document.getElementById('d') as VoidDialog;
      await flush(el);
      expect(panel(el).open).toBe(true);
    });

    it('removing the open attribute (a server re-render) closes it', async () => {
      const el = await mount({ open: true });
      el.removeAttribute('open');
      await flush(el);
      expect(el.open).toBe(false);
      expect(panel(el).open).toBe(false);
      expect(stack()).toEqual([]);
    });

    it('stays open across many open/close cycles with the same content', async () => {
      const el = await mount();
      for (let i = 0; i < 20; i++) {
        el.open = true;
        await flush(el);
        expect(panel(el).open).toBe(true);
        el.open = false;
        await flush(el);
        expect(panel(el).open).toBe(false);
      }
      expect(el.shadowRoot!.querySelectorAll('dialog')).toHaveLength(1);
      expect(el.querySelectorAll('#field')).toHaveLength(1);
      expect(locks()).toBe(0);
    });
  });

  describe('scroll lock', () => {
    it('locks scrolling on the root element while open and restores it', async () => {
      const el = await mount({ open: true });
      expect(document.documentElement.style.overflow).toBe('hidden');
      el.open = false;
      await flush(el);
      expect(document.documentElement.style.overflow).toBe('');
    });

    it('is counted: closing one of two open dialogs keeps the page locked', async () => {
      const a = await mount({ open: true });
      const b = await mount({ open: true });
      expect(locks()).toBe(2);
      a.open = false;
      await flush(a);
      expect(document.documentElement.style.overflow).toBe('hidden');
      b.open = false;
      await flush(b);
      expect(document.documentElement.style.overflow).toBe('');
      expect(locks()).toBe(0);
    });

    it('keeps an inline overflow the page had before', async () => {
      document.documentElement.style.setProperty('overflow', 'scroll');
      const el = await mount({ open: true });
      el.open = false;
      await flush(el);
      expect(document.documentElement.style.overflow).toBe('scroll');
    });

    it('is released when an open dialog is removed from the document', async () => {
      const el = await mount({ open: true });
      el.remove();
      await flush(el);
      expect(locks()).toBe(0);
      expect(document.documentElement.style.overflow).toBe('');
      expect(stack()).toEqual([]);
    });

    it('survives a move in the DOM while open (no unlock, no close)', async () => {
      const el = await mount({ open: true });
      const box = document.createElement('div');
      document.body.appendChild(box);
      box.appendChild(el);
      await flush(el);
      expect(el.open).toBe(true);
      expect(locks()).toBe(1);
      expect(stack()).toEqual([el.id]);
    });
  });

  describe('Escape, backdrop and close button', () => {
    it('Escape closes it with a cancelable void-close (reason escape)', async () => {
      const el = await mount({ open: true });
      const events: CustomEvent[] = [];
      el.addEventListener('void-close', e => events.push(e as CustomEvent));
      const e = press('Escape');
      await flush(el);
      expect(el.open).toBe(false);
      expect(events).toHaveLength(1);
      expect(events[0].detail).toEqual({ reason: 'escape' });
      expect(events[0].cancelable).toBe(true);
      expect(e.defaultPrevented).toBe(true);
    });

    it('preventDefault() on void-close keeps it open', async () => {
      const el = await mount({ open: true });
      el.addEventListener('void-close', e => e.preventDefault());
      press('Escape');
      await flush(el);
      expect(el.open).toBe(true);
      expect(panel(el).open).toBe(true);
    });

    it('a press on the backdrop closes it (reason outside); a press on the panel does not', async () => {
      const el = await mount({ open: true });
      const reasons: string[] = [];
      el.addEventListener('void-close', e => reasons.push((e as CustomEvent).detail.reason));
      pointerdown(el.querySelector('#field')!);
      await flush(el);
      expect(el.open).toBe(true);
      pointerdown(document.body);
      await flush(el);
      expect(el.open).toBe(false);
      expect(reasons).toEqual(['outside']);
    });

    it('the close button closes it (reason close-button)', async () => {
      const el = await mount({ open: true });
      const reasons: string[] = [];
      el.addEventListener('void-close', e => reasons.push((e as CustomEvent).detail.reason));
      closeButton(el)!.click();
      await flush(el);
      expect(el.open).toBe(false);
      expect(reasons).toEqual(['close-button']);
    });

    it('closing by property dispatches a non-cancelable void-close (reason api)', async () => {
      const el = await mount({ open: true });
      const events: CustomEvent[] = [];
      el.addEventListener('void-close', e => events.push(e as CustomEvent));
      el.open = false;
      await flush(el);
      expect(events.map(e => [e.detail.reason, e.cancelable])).toEqual([['api', false]]);
    });

    it('dispatches void-open; neither event bubbles', async () => {
      const el = await mount();
      const seen: string[] = [];
      el.addEventListener('void-open', e => seen.push(`own:${(e as CustomEvent).detail.reason}`));
      document.body.addEventListener('void-open', () => seen.push('body'));
      document.body.addEventListener('void-close', () => seen.push('body'));
      el.open = true;
      await flush(el);
      el.open = false;
      await flush(el);
      expect(seen).toEqual(['own:api']);
    });
  });

  describe('hide-close', () => {
    it('has no close button and ignores Escape and backdrop presses', async () => {
      const el = await mount({ hideClose: true, open: true });
      const events: Event[] = [];
      el.addEventListener('void-close', e => events.push(e));
      expect(closeButton(el)!.hidden).toBe(true);
      const e = press('Escape');
      pointerdown(document.body);
      await flush(el);
      expect(el.open).toBe(true);
      expect(events).toHaveLength(0);
      // Swallowed: an Escape must not reach a dialog underneath either.
      expect(e.defaultPrevented).toBe(true);
    });

    it('reads hide-close from markup', async () => {
      document.body.innerHTML = '<void-dialog id="d" hide-close></void-dialog>';
      const el = document.getElementById('d') as VoidDialog;
      await flush(el);
      expect(el.hideClose).toBe(true);
    });
  });

  describe('focus', () => {
    it('moves focus to the first focusable element of the content, not the close button', async () => {
      opener();
      const el = await mount({ open: true });
      expect(document.activeElement?.id).toBe('field');
      void el;
    });

    it('respects autofocus', async () => {
      opener();
      await mount({ open: true }, '<input id="a"><input id="b" autofocus>');
      expect(document.activeElement?.id).toBe('b');
    });

    it('falls back to the close button, then the panel itself, when the content has nothing focusable', async () => {
      opener();
      const el = await mount({ open: true }, '<void-dialog-body><p>text</p></void-dialog-body>');
      expect(document.activeElement).toBe(el);
      expect(el.shadowRoot!.activeElement).toBe(closeButton(el));
      // The hide-close fallback (the panel itself) is checked in a real
      // browser (tests/browser): happy-dom's showModal() focuses the hidden
      // close button itself.
    });

    it('returns focus to the opener on close', async () => {
      const b = opener();
      const el = await mount({ open: true });
      expect(document.activeElement?.id).toBe('field');
      press('Escape');
      await flush(el);
      expect(document.activeElement).toBe(b);
    });

    it('returns focus to a re-rendered opener with the same id when the original was replaced', async () => {
      const b = opener('same');
      const el = await mount({ open: true });
      const replacement = document.createElement('button');
      replacement.id = 'same';
      b.replaceWith(replacement);
      el.open = false;
      await flush(el);
      expect(document.activeElement).toBe(replacement);
    });

    it('with the opener gone, falls back to the overlay underneath', async () => {
      const outer = await mount({ open: true }, '<void-dialog-body><button id="outer-btn">x</button></void-dialog-body>');
      const b = document.createElement('button');
      outer.querySelector('void-dialog-body')!.appendChild(b);
      b.focus();
      const inner = await mount({ open: true });
      b.remove();
      press('Escape');
      await flush(inner, outer);
      expect(outer.open).toBe(true);
      expect(outer.contains(document.activeElement)).toBe(true);
    });
  });

  describe('stacking', () => {
    it('Escape closes only the topmost of nested dialogs', async () => {
      const outer = await mount({ open: true }, '<void-dialog id="inner"><void-dialog-body><input id="in"></void-dialog-body></void-dialog>');
      const inner = outer.querySelector('#inner') as VoidDialog;
      inner.open = true;
      await flush(inner, outer);
      expect(stack()).toEqual([outer.id, 'inner']);
      press('Escape');
      await flush(inner, outer);
      expect(inner.open).toBe(false);
      expect(outer.open).toBe(true);
      press('Escape');
      await flush(inner, outer);
      expect(outer.open).toBe(false);
    });

    it('closing the outer dialog closes the one inside it (reason parent)', async () => {
      const outer = await mount({ open: true }, '<void-dialog id="inner"><void-dialog-body><input></void-dialog-body></void-dialog>');
      const inner = outer.querySelector('#inner') as VoidDialog;
      inner.open = true;
      await flush(inner, outer);
      const reasons: string[] = [];
      inner.addEventListener('void-close', e => reasons.push((e as CustomEvent).detail.reason));
      outer.open = false;
      await flush(inner, outer);
      expect(inner.open).toBe(false);
      expect(reasons).toEqual(['parent']);
      expect(stack()).toEqual([]);
      expect(locks()).toBe(0);
    });

    it('a non-closable dialog on top shields the one underneath from Escape', async () => {
      const outer = await mount({ open: true }, '<void-dialog id="inner" hide-close><void-dialog-body><input></void-dialog-body></void-dialog>');
      const inner = outer.querySelector('#inner') as VoidDialog;
      inner.open = true;
      await flush(inner, outer);
      press('Escape');
      await flush(inner, outer);
      expect(inner.open).toBe(true);
      expect(outer.open).toBe(true);
    });
  });

  describe('morph', () => {
    it('stays open, with focus and typed text, through voidBeforeMorph and re-projection', async () => {
      opener();
      const el = await mount({ open: true });
      const field = el.querySelector('#field') as HTMLInputElement;
      field.value = 'typed';
      field.focus();
      el.voidBeforeMorph();
      await el.voidAfterMorph();
      await flush(el);
      expect(el.open).toBe(true);
      expect(panel(el).open).toBe(true);
      expect(el.querySelector('#field')).toBe(field);
      expect(field.value).toBe('typed');
      expect(document.activeElement).toBe(field);
      expect(stack()).toEqual([el.id]);
    });
  });
});
