import { describe, it, expect } from 'vitest';
import { VoidDOM } from '../src/dom.js';

// The pre-morph hook: VoidDOM.onBeforeElUpdated calls voidBeforeMorph() on each
// void-* element morphdom is about to patch, after the client attributes have
// been carried over to the server element.

type Hooked = Element & { voidBeforeMorph?: () => boolean };

function el(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

function hook(target: Element, log: string[]): Hooked {
  const h = target as Hooked;
  h.voidBeforeMorph = () => {
    log.push(`unproject ${target.id} open=${target.hasAttribute('open')}`);
    return true;
  };
  return h;
}

describe('VoidDOM pre-morph hook', () => {
  it('unprojects void-* elements in patch order (parents first), not other elements', () => {
    const log: string[] = [];
    const outer = hook(el('<void-card id="outer"><void-card-body></void-card-body></void-card>'), log);
    const inner = hook(el('<void-dialog id="inner"></void-dialog>'), log);
    const plain = hook(el('<div id="plain"></div>'), log);
    VoidDOM.onBeforeElUpdated(outer, el('<void-card id="outer"><void-card-body></void-card-body></void-card>'));
    VoidDOM.onBeforeElUpdated(plain, el('<div id="plain"></div>'));
    VoidDOM.onBeforeElUpdated(inner, el('<void-dialog id="inner"></void-dialog>'));
    expect(log).toEqual(['unproject outer open=false', 'unproject inner open=false']);
  });

  it('tolerates void-* elements without the hook', () => {
    expect(() => VoidDOM.onBeforeElUpdated(el('<void-badge></void-badge>'), el('<void-badge></void-badge>'))).not.toThrow();
  });
});
