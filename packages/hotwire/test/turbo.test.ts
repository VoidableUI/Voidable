import { describe, it, expect, afterEach } from 'vitest';
import '@voidable/ui';
import { VoidTurbo } from '../src/turbo.js';

// VoidTurbo connects Turbo's morph to each element's voidBeforeMorph hook; the
// state rule itself (server changes win, client state survives otherwise)
// lives in the base class. These tests drive it the way Turbo does: fire
// turbo:before-morph-element with the incoming element, then make the live
// element's attributes equal to the incoming element's.

let stop: (() => void) | undefined;

afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.innerHTML = '';
});

const settle = async () => {
  for (let i = 0; i < 4; i++) await new Promise(r => setTimeout(r, 0));
};

function server(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

/** One element's morph as Turbo does it: the event, then the attribute sync (unless cancelled). */
async function morph(el: Element, html: string): Promise<Element> {
  const next = server(html);
  const event = new CustomEvent('turbo:before-morph-element', { bubbles: true, cancelable: true, detail: { newElement: next } });
  el.dispatchEvent(event);
  if (!event.defaultPrevented) {
    for (const a of Array.from(el.attributes)) if (!next.hasAttribute(a.name)) el.removeAttribute(a.name);
    for (const a of Array.from(next.attributes)) if (el.getAttribute(a.name) !== a.value) el.setAttribute(a.name, a.value);
  }
  await settle();
  return next;
}

async function mount<T extends Element = HTMLElement & Record<string, any>>(html: string): Promise<T> {
  document.body.innerHTML = html;
  await settle();
  return document.body.firstElementChild as T;
}

describe('VoidTurbo.start', () => {
  it('calls voidBeforeMorph with Turbo\'s newElement for void-* elements only', () => {
    document.body.innerHTML = '<void-x></void-x><div></div>';
    const calls: Array<[string, Element | null | undefined]> = [];
    for (const el of Array.from(document.body.children)) {
      (el as any).voidBeforeMorph = (incoming?: Element | null) => {
        calls.push([el.localName, incoming]);
        return false;
      };
    }
    stop = VoidTurbo.start();
    const next = server('<void-x></void-x>');
    for (const el of Array.from(document.body.children)) {
      el.dispatchEvent(new CustomEvent('turbo:before-morph-element', { bubbles: true, cancelable: true, detail: { newElement: next } }));
    }
    expect(calls).toEqual([['void-x', next]]);
  });

  it('leaves an element alone when another listener cancelled its morph', () => {
    document.body.innerHTML = '<void-x></void-x>';
    const el = document.body.firstElementChild as any;
    let called = 0;
    el.voidBeforeMorph = () => (called++, false);
    document.addEventListener('turbo:before-morph-element', e => e.preventDefault(), { capture: true, once: true });
    stop = VoidTurbo.start();
    el.dispatchEvent(new CustomEvent('turbo:before-morph-element', { bubbles: true, cancelable: true, detail: { newElement: server('<void-x></void-x>') } }));
    expect(called).toBe(0);
  });

  it('returns a stop function that detaches the listener', async () => {
    const dialog = await mount('<void-dialog></void-dialog>');
    stop = VoidTurbo.start();
    stop();
    stop = undefined;
    dialog.open = true;
    await settle();
    await morph(dialog, '<void-dialog></void-dialog>');
    expect(dialog.open).toBe(false);
  });

  it('skips an element whose server markup is identical to the previous render', async () => {
    const c = await mount('<void-checkbox name="a">Agree</void-checkbox>');
    stop = VoidTurbo.start();
    const cancelled = (html: string) => {
      const event = new CustomEvent('turbo:before-morph-element', { bubbles: true, cancelable: true, detail: { newElement: server(html) } });
      c.dispatchEvent(event);
      return event.defaultPrevented;
    };
    // (An element connected while its children were still being parsed records
    // its markup at the first morph instead.)
    await morph(c, '<void-checkbox name="a">Agree</void-checkbox>');
    c.checked = true;
    await settle();
    expect(cancelled('<void-checkbox name="a">Agree</void-checkbox>')).toBe(true);
    expect(c.checked).toBe(true);
    // Changed content goes through the morph and becomes the new server markup.
    await morph(c, '<void-checkbox name="a">Agree!</void-checkbox>');
    expect(cancelled('<void-checkbox name="a">Agree!</void-checkbox>')).toBe(true);
    expect(cancelled('<void-checkbox name="a">Agree</void-checkbox>')).toBe(false);
  });

  it('keeps the client value when the server value is unchanged', async () => {
    const dialog = await mount('<void-dialog></void-dialog>');
    stop = VoidTurbo.start();
    dialog.open = true;
    await settle();
    await morph(dialog, '<void-dialog></void-dialog>');
    expect(dialog.open).toBe(true);
  });

  it('lets the server win when the server value changed, and tracks it across morphs', async () => {
    const dialog = await mount('<void-dialog></void-dialog>');
    stop = VoidTurbo.start();
    await morph(dialog, '<void-dialog open></void-dialog>');
    expect(dialog.open).toBe(true);
    dialog.open = false; // the user closes it
    await settle();
    await morph(dialog, '<void-dialog open></void-dialog>');
    expect(dialog.open).toBe(false);
    await morph(dialog, '<void-dialog></void-dialog>');
    dialog.open = true;
    await settle();
    await morph(dialog, '<void-dialog></void-dialog>');
    expect(dialog.open).toBe(true);
  });

  it('decides per attribute', async () => {
    const c = await mount('<void-checkbox>c</void-checkbox>');
    stop = VoidTurbo.start();
    c.checked = true;
    await settle();
    await morph(c, '<void-checkbox indeterminate>c</void-checkbox>');
    expect(c.checked).toBe(true);
    expect(c.indeterminate).toBe(true);
  });

  it('keeps state outside any fixed list: a pressed toggle, a collapsed sidebar, a carousel slide', async () => {
    document.body.innerHTML = '<void-toggle id="t">B</void-toggle><void-sidebar id="s"></void-sidebar><void-carousel id="c"><void-carousel-slide>1</void-carousel-slide><void-carousel-slide>2</void-carousel-slide></void-carousel>';
    await settle();
    stop = VoidTurbo.start();
    const [t, s, c] = ['t', 's', 'c'].map(id => document.getElementById(id) as any);
    t.click();
    s.collapsed = true;
    c.active = 1;
    await settle();
    await morph(t, '<void-toggle id="t">B</void-toggle>');
    await morph(s, '<void-sidebar id="s"></void-sidebar>');
    await morph(c, '<void-carousel id="c"></void-carousel>');
    expect([t.pressed, s.collapsed, c.active]).toEqual([true, true, 1]);
  });

  it('does not touch an attribute the server changed on a non-state property', async () => {
    const btn = await mount('<void-button>Go</void-button>');
    stop = VoidTurbo.start();
    await morph(btn, '<void-button variant="filled">Go</void-button>');
    expect(btn.variant).toBe('filled');
  });
});
