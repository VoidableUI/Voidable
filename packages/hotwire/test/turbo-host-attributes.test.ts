import { describe, it, expect, afterEach } from 'vitest';
import '@voidable/ui';
import { VoidTurbo } from '../src/turbo.js';

// Host attributes through VoidTurbo with real components (issue #61): the
// component's own attributes are carried onto Turbo's newElement, server-set
// attributes follow the server, and client state keeps the server-wins rule.

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

/** Fires Turbo's event; returns true when the adapter skipped the element (identical server markup). */
function beforeMorph(el: Element, newElement: Element): boolean {
  const event = new CustomEvent('turbo:before-morph-element', { bubbles: true, cancelable: true, detail: { newElement } });
  el.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('VoidTurbo and host attributes', () => {
  it('carries role, tabindex, aria-* and reflected defaults onto newElement', async () => {
    document.body.innerHTML = '<void-switch id="s" name="n">N</void-switch>';
    await settle();
    stop = VoidTurbo.start();
    const sw = document.getElementById('s')!;
    const next = server('<void-switch id="s" name="n">N</void-switch>');
    beforeMorph(sw, next);
    expect(next.getAttribute('role')).toBe('switch');
    expect(next.getAttribute('tabindex')).toBe('0');
    expect(next.getAttribute('aria-checked')).toBe('false');
    expect(next.getAttribute('size')).toBe('md');
  });

  it('carries client state the server did not change, and lets a server change win', async () => {
    document.body.innerHTML = '<void-switch id="s">N</void-switch>';
    await settle();
    stop = VoidTurbo.start();
    const sw = document.getElementById('s')!;
    sw.click();
    await settle();
    // The server keeps rendering it unchecked: the user's checked is carried onto newElement.
    const same = server('<void-switch id="s">N</void-switch>');
    beforeMorph(sw, same);
    expect(same.hasAttribute('checked')).toBe(true);
    // The server renders it unchecked after rendering it checked: that is a change, it wins.
    beforeMorph(sw, server('<void-switch id="s" checked>N</void-switch>'));
    const off = server('<void-switch id="s">N</void-switch>');
    beforeMorph(sw, off);
    expect(off.hasAttribute('checked')).toBe(false);
  });

  it('keeps a reflected value the user changed while the server value is unchanged', async () => {
    document.body.innerHTML = '<void-number-input id="n" value="3"></void-number-input>';
    await settle();
    stop = VoidTurbo.start();
    const el = document.getElementById('n') as HTMLElement & { value: number };
    el.value = 7;
    await settle();
    // Identical server markup: the element is skipped and keeps 7.
    expect(beforeMorph(el, server('<void-number-input id="n" value="3"></void-number-input>'))).toBe(true);
    expect(el.value).toBe(7);
    // Other markup with the same value: the morph runs and keeps the client's 7.
    const same = server('<void-number-input id="n" value="3" step="1"></void-number-input>');
    expect(beforeMorph(el, same)).toBe(false);
    expect(same.getAttribute('value')).toBe('7');
    const changed = server('<void-number-input id="n" value="5"></void-number-input>');
    beforeMorph(el, changed);
    expect(changed.getAttribute('value')).toBe('5');
  });
});
