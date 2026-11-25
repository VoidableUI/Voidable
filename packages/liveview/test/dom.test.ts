import { describe, it, expect } from 'vitest';
import { VoidDOM } from '../src/dom.js';

function el(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

/** Mimics morphdom: callback runs, then toEl's attributes are applied to fromEl. */
function patch(from: Element, to: Element): void {
  VoidDOM.onBeforeElUpdated(from, to);
  for (const attr of Array.from(from.attributes)) {
    if (!to.hasAttribute(attr.name)) from.removeAttribute(attr.name);
  }
  for (const attr of Array.from(to.attributes)) from.setAttribute(attr.name, attr.value);
}

describe('VoidDOM.onBeforeElUpdated', () => {
  it('keeps a client-opened dialog while the server still renders it closed', () => {
    const live = el('<void-dialog id="d"></void-dialog>');
    VoidDOM.onNodeAdded(live);

    live.setAttribute('open', '');
    patch(live, el('<void-dialog id="d"></void-dialog>'));

    expect(live.hasAttribute('open')).toBe(true);
  });

  it('keeps a client-closed dialog while the server still renders it open', () => {
    const live = el('<void-dialog id="d" open></void-dialog>');
    VoidDOM.onNodeAdded(live);

    live.removeAttribute('open');
    patch(live, el('<void-dialog id="d" open></void-dialog>'));

    expect(live.hasAttribute('open')).toBe(false);
  });

  it('lets the server close a dialog it previously rendered open', () => {
    const live = el('<void-dialog id="d" open></void-dialog>');
    VoidDOM.onNodeAdded(live);

    patch(live, el('<void-dialog id="d"></void-dialog>'));

    expect(live.hasAttribute('open')).toBe(false);
  });

  it('lets the server open a dialog it previously rendered closed', () => {
    const live = el('<void-dialog id="d"></void-dialog>');
    VoidDOM.onNodeAdded(live);

    patch(live, el('<void-dialog id="d" open></void-dialog>'));

    expect(live.hasAttribute('open')).toBe(true);
  });

  it('tracks the last server value across successive patches', () => {
    const live = el('<void-dialog id="d"></void-dialog>');
    VoidDOM.onNodeAdded(live);

    patch(live, el('<void-dialog id="d" open></void-dialog>')); // server opens
    live.removeAttribute('open'); // client closes
    patch(live, el('<void-dialog id="d" open></void-dialog>')); // server unchanged
    expect(live.hasAttribute('open')).toBe(false);

    patch(live, el('<void-dialog id="d"></void-dialog>')); // server closes
    expect(live.hasAttribute('open')).toBe(false);
    patch(live, el('<void-dialog id="d" open></void-dialog>')); // server reopens
    expect(live.hasAttribute('open')).toBe(true);
  });

  it('without a baseline keeps client-set attributes the server omits', () => {
    const live = el('<void-dialog id="d"></void-dialog>'); // no onNodeAdded
    live.setAttribute('open', '');

    patch(live, el('<void-dialog id="d"></void-dialog>'));

    expect(live.hasAttribute('open')).toBe(true);
  });

  it('ignores non-void elements and non-preserved attributes', () => {
    const div = el('<div open></div>');
    patch(div, el('<div></div>'));
    expect(div.hasAttribute('open')).toBe(false);

    const btn = el('<void-button variant="a"></void-button>');
    VoidDOM.onNodeAdded(btn);
    patch(btn, el('<void-button variant="b"></void-button>'));
    expect(btn.getAttribute('variant')).toBe('b');
  });
});
