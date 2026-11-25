import { describe, it, expect, afterEach } from 'vitest';
import { VoidTurbo } from '../src/turbo.js';

let stop: (() => void) | undefined;

afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.innerHTML = '';
});

function mount(html: string): Element {
  document.body.innerHTML = html;
  return document.body.firstElementChild as Element;
}

/**
 * Simulates what Turbo's morph does for one element: fire before-morph-element
 * with the incoming element, then ask before-morph-attribute for every
 * attribute that differs. Returns the attributes Turbo is allowed to apply.
 */
function morph(el: Element, incoming: Element, attrs: string[]): string[] {
  el.dispatchEvent(
    new CustomEvent('turbo:before-morph-element', {
      bubbles: true,
      cancelable: true,
      detail: { newElement: incoming },
    }),
  );

  const applied: string[] = [];
  for (const attributeName of attrs) {
    const event = new CustomEvent('turbo:before-morph-attribute', {
      bubbles: true,
      cancelable: true,
      detail: { attributeName, mutationType: 'update' },
    });
    el.dispatchEvent(event);
    if (!event.defaultPrevented) applied.push(attributeName);
  }
  return applied;
}

function el(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

describe('VoidTurbo.start', () => {
  it('returns a stop function that detaches the listeners', () => {
    const dialog = mount('<void-dialog></void-dialog>');
    stop = VoidTurbo.start();
    stop();
    stop = undefined;

    expect(morph(dialog, el('<void-dialog open></void-dialog>'), ['open'])).toEqual(['open']);
  });

  it('keeps the client value when the server value is unchanged', () => {
    const dialog = mount('<void-dialog></void-dialog>');
    stop = VoidTurbo.start();

    // Client opens the dialog; the server still renders it closed.
    dialog.setAttribute('open', '');
    expect(morph(dialog, el('<void-dialog></void-dialog>'), ['open'])).toEqual([]);
  });

  it('lets the server win when the server value changed', () => {
    const dialog = mount('<void-dialog open></void-dialog>');
    stop = VoidTurbo.start();

    // Server now renders it closed (attribute removed).
    expect(morph(dialog, el('<void-dialog></void-dialog>'), ['open'])).toEqual(['open']);
  });

  it('lets the server open an element it previously rendered closed', () => {
    const dialog = mount('<void-dialog></void-dialog>');
    stop = VoidTurbo.start();

    expect(morph(dialog, el('<void-dialog open></void-dialog>'), ['open'])).toEqual(['open']);
  });

  it('tracks the last server value across successive morphs', () => {
    const dialog = mount('<void-dialog></void-dialog>');
    stop = VoidTurbo.start();

    // Server opens it, then (client unchanged) renders the same value again.
    expect(morph(dialog, el('<void-dialog open></void-dialog>'), ['open'])).toEqual(['open']);
    dialog.removeAttribute('open'); // client closes it
    expect(morph(dialog, el('<void-dialog open></void-dialog>'), ['open'])).toEqual([]);
    // Server closes it: server wins again.
    expect(morph(dialog, el('<void-dialog></void-dialog>'), ['open'])).toEqual(['open']);
  });

  it('only decides per attribute', () => {
    const c = mount('<void-checkbox></void-checkbox>');
    stop = VoidTurbo.start();

    c.setAttribute('checked', '');
    const applied = morph(c, el('<void-checkbox selected></void-checkbox>'), ['checked', 'selected']);
    expect(applied).toEqual(['selected']);
  });

  it('does not touch non-preserved attributes or non-void elements', () => {
    const btn = mount('<void-button></void-button>');
    const div = document.createElement('div');
    document.body.appendChild(div);
    stop = VoidTurbo.start();

    expect(morph(btn, el('<void-button variant="x"></void-button>'), ['variant'])).toEqual(['variant']);
    expect(morph(div, el('<div open></div>'), ['open'])).toEqual(['open']);
  });
});
