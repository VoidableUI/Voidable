import { describe, it, expect, afterEach, vi } from 'vitest';
import { VoidTurbo } from '../src/turbo.js';

// The pre-morph hook: VoidTurbo calls voidUnproject() on each void-* element
// Turbo is about to morph, after recording the server state for it.

let stop: (() => void) | undefined;

afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.innerHTML = '';
});

type Spied = Element & { voidUnproject: ReturnType<typeof vi.fn> };

function spied(el: Element, log: string[]): Spied {
  const s = el as Spied;
  s.voidUnproject = vi.fn(() => {
    log.push(`unproject ${el.id}`);
    return true;
  });
  return s;
}

function beforeMorph(el: Element, incoming: Element): CustomEvent {
  const event = new CustomEvent('turbo:before-morph-element', {
    bubbles: true,
    cancelable: true,
    detail: { newElement: incoming },
  });
  el.dispatchEvent(event);
  return event;
}

function beforeAttribute(el: Element, attributeName: string): boolean {
  const event = new CustomEvent('turbo:before-morph-attribute', {
    bubbles: true,
    cancelable: true,
    detail: { attributeName, mutationType: 'update' },
  });
  el.dispatchEvent(event);
  return !event.defaultPrevented;
}

function server(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

describe('VoidTurbo pre-morph hook', () => {
  it('unprojects each void-* element as Turbo reaches it, outer first', () => {
    document.body.innerHTML = '<void-card id="outer"><void-dialog id="inner"></void-dialog></void-card>';
    const log: string[] = [];
    const outer = spied(document.getElementById('outer')!, log);
    const inner = spied(document.getElementById('inner')!, log);
    stop = VoidTurbo.start();

    // Turbo (idiomorph) visits the parent before its children.
    beforeMorph(outer, server('<void-card id="outer"></void-card>'));
    beforeMorph(inner, server('<void-dialog id="inner"></void-dialog>'));

    expect(log).toEqual(['unproject outer', 'unproject inner']);
  });

  it('does not unproject non-void elements, or a morph another listener cancelled', () => {
    document.body.innerHTML = '<div id="plain"></div><void-dialog id="d"></void-dialog>';
    const log: string[] = [];
    const plain = spied(document.getElementById('plain')!, log);
    const dialog = spied(document.getElementById('d')!, log);
    // Registered before VoidTurbo on the element itself, so it runs first.
    dialog.addEventListener('turbo:before-morph-element', (e) => e.preventDefault());
    stop = VoidTurbo.start();

    beforeMorph(plain, server('<div id="plain"></div>'));
    beforeMorph(dialog, server('<void-dialog id="d"></void-dialog>'));

    expect(plain.voidUnproject).not.toHaveBeenCalled();
    expect(dialog.voidUnproject).not.toHaveBeenCalled();
  });

  it('tolerates void-* elements without the hook (not upgraded, or not projecting)', () => {
    document.body.innerHTML = '<void-badge id="b"></void-badge>';
    stop = VoidTurbo.start();
    expect(() => beforeMorph(document.getElementById('b')!, server('<void-badge id="b"></void-badge>'))).not.toThrow();
  });

  it('composes with server-wins state preservation', () => {
    document.body.innerHTML = '<void-dialog id="d" open></void-dialog>';
    const log: string[] = [];
    const dialog = spied(document.getElementById('d')!, log);
    // Unprojecting moves children only; prove the decision is made from host
    // attributes recorded before it, not affected by it.
    dialog.voidUnproject.mockImplementation(() => {
      log.push(`unproject with open=${dialog.hasAttribute('open')}`);
      return true;
    });
    stop = VoidTurbo.start();

    // Server still renders it open, client keeps it: open is not touched.
    beforeMorph(dialog, server('<void-dialog id="d" open></void-dialog>'));
    expect(beforeAttribute(dialog, 'open')).toBe(false);

    // Server closes it: server wins, and the element is still unprojected for the morph.
    beforeMorph(dialog, server('<void-dialog id="d"></void-dialog>'));
    expect(beforeAttribute(dialog, 'open')).toBe(true);
    expect(log).toEqual(['unproject with open=true', 'unproject with open=true']);
  });
});
