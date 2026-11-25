import { describe, it, expect, afterEach } from 'vitest';
import '@voidable/ui';
import { VoidDOM } from '../src/dom.js';

// VoidDOM connects morphdom to each element's voidBeforeMorph hook; the state
// rule (a server change wins, client state survives otherwise) lives in the
// base class. Driven the way morphdom does it: the callback, then toEl's
// attributes applied to fromEl.

afterEach(() => {
  document.body.innerHTML = '';
});

const settle = async () => {
  for (let i = 0; i < 4; i++) await new Promise(r => setTimeout(r, 0));
};

function el(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

async function mount(html: string): Promise<HTMLElement & Record<string, any>> {
  document.body.innerHTML = html;
  await settle();
  return document.body.firstElementChild as HTMLElement & Record<string, any>;
}

async function patch(from: Element, html: string): Promise<void> {
  const to = el(html);
  VoidDOM.onBeforeElUpdated(from, to);
  for (const attr of Array.from(from.attributes)) if (!to.hasAttribute(attr.name)) from.removeAttribute(attr.name);
  for (const attr of Array.from(to.attributes)) if (from.getAttribute(attr.name) !== attr.value) from.setAttribute(attr.name, attr.value);
  await settle();
}

describe('VoidDOM.onBeforeElUpdated', () => {
  it('keeps a client-opened dialog while the server still renders it closed', async () => {
    const live = await mount('<void-dialog id="d"></void-dialog>');
    live.open = true;
    await settle();
    await patch(live, '<void-dialog id="d"></void-dialog>');
    expect(live.open).toBe(true);
  });

  it('keeps a client-closed dialog while the server still renders it open', async () => {
    const live = await mount('<void-dialog id="d" open></void-dialog>');
    live.open = false;
    await settle();
    await patch(live, '<void-dialog id="d" open></void-dialog>');
    expect(live.open).toBe(false);
  });

  it('lets the server close a dialog it previously rendered open, and open one it rendered closed', async () => {
    const live = await mount('<void-dialog id="d" open></void-dialog>');
    await patch(live, '<void-dialog id="d"></void-dialog>');
    expect(live.open).toBe(false);
    await patch(live, '<void-dialog id="d" open></void-dialog>');
    expect(live.open).toBe(true);
  });

  it('keeps state outside any fixed list (a pressed toggle, a collapsed sidebar)', async () => {
    document.body.innerHTML = '<void-toggle id="t">B</void-toggle><void-sidebar id="s"></void-sidebar>';
    await settle();
    const t = document.getElementById('t') as any;
    const s = document.getElementById('s') as any;
    t.click();
    s.collapsed = true;
    await settle();
    await patch(t, '<void-toggle id="t">B</void-toggle>');
    await patch(s, '<void-sidebar id="s"></void-sidebar>');
    expect([t.pressed, s.collapsed]).toEqual([true, true]);
  });

  it('leaves an element LiveView skips (data-phx-skip placeholder) alone, and its baseline too', async () => {
    const live = await mount('<void-tab-panel tab="a" label="A">Panel A</void-tab-panel>');
    const placeholder = el('<void-tab-panel data-phx-skip data-phx-id="m1"></void-tab-panel>');
    let called = 0;
    const own = (live as any).voidBeforeMorph.bind(live);
    (live as any).voidBeforeMorph = (to: Element) => (called++, own(to));
    VoidDOM.onBeforeElUpdated(live, placeholder);
    expect(called).toBe(0);
    // The next real render with a changed label is still seen as a server change.
    await patch(live, '<void-tab-panel tab="a" label="Aa">Panel A</void-tab-panel>');
    expect(live.getAttribute('label')).toBe('Aa');
    expect(called).toBe(1);
  });

  it('ignores non-void elements', () => {
    const live = el('<div open></div>');
    const to = el('<div></div>');
    VoidDOM.onBeforeElUpdated(live, to);
    expect(to.hasAttribute('open')).toBe(false);
  });
});
