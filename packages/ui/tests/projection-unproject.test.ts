// @vitest-environment happy-dom
// Issue #4 second review: the voidBeforeMorph() pre-morph hook, identity-tracked
// chrome (recycled-chrome morphs, removed chrome), replaceChildren validation and
// the dev-only missing-trigger warning. Focus is checked in the Chromium probes.
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { LitElement } from 'lit';
import type { VoidElement } from '../src/base.js';
import '../src/components/dialog.js';
import '../src/components/card.js';
import '../src/components/tabs.js';
import '../src/components/select.js';
import '../src/components/dropdown-menu.js';
import '../src/components/hover-card.js';
import '../src/components/combobox.js';
import '../src/components/alert.js';
import '../src/components/button.js';

type Host = VoidElement & Record<string, unknown>;

async function settle(el?: LitElement): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await new Promise(r => setTimeout(r, 0));
    if (el) await el.updateComplete;
  }
}

function mount(html: string): Host {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  const el = wrap.firstElementChild as Host;
  document.body.appendChild(el);
  return el;
}

/** The host's children as markup, without Lit's own comment markers. */
const markup = (el: Element) => el.innerHTML.replace(/<!--\?lit\$\d+\$-->|<!---->/g, '');

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('voidBeforeMorph()', () => {
  it('leaves the host looking like its original markup, in order', async () => {
    const original = '<p id="a">a</p>text<p id="b">b</p>';
    const el = mount(`<void-card heading="H">${original}</void-card>`);
    await settle(el);
    expect(el.voidBeforeMorph()).toBe(true);
    expect(el.innerHTML).toBe(original);
    expect(el.querySelector('[data-void-chrome], [data-void-projection]')).toBeNull();
  });

  it('puts before-region, container and after-region nodes back in source order', async () => {
    const el = mount('<void-dropdown-menu><button id="t" slot="trigger">T</button><void-dropdown-menu-item id="i">I</void-dropdown-menu-item></void-dropdown-menu>');
    await settle(el);
    el.voidBeforeMorph();
    expect(Array.from(el.children).map(c => c.id)).toEqual(['t', 'i']);
    const hc = mount('<void-hover-card><a id="ht">t</a><div id="hb">b</div></void-hover-card>');
    await settle(hc);
    hc.voidBeforeMorph();
    expect(Array.from(hc.children).map(c => c.id)).toEqual(['ht', 'hb']);
    const tabs = mount('<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel></void-tabs>');
    await settle(tabs);
    tabs.voidBeforeMorph();
    expect(Array.from(tabs.children).map(c => c.localName)).toEqual(['void-tab-panel']);
  });

  it('re-projects on its own, reusing the same chrome and consumer nodes', async () => {
    const el = mount('<void-dialog open heading="H"><p id="c">c</p></void-dialog>');
    await settle(el);
    const panel = el.querySelector('dialog.void-dialog-panel');
    const close = el.querySelector('.void-dialog-close');
    const c = el.querySelector('#c');
    el.voidBeforeMorph();
    expect(el.querySelector('dialog.void-dialog-panel')).toBeNull();
    await settle(el);
    expect(el.querySelector('dialog.void-dialog-panel')).toBe(panel);
    expect(el.querySelector('.void-dialog-close')).toBe(close);
    expect(el.querySelector('.void-dialog-body > #c')).toBe(c);
    expect(el.open).toBe(true);
    // Lit keeps patching the same part afterwards
    el.closable = false;
    await settle(el);
    expect(el.querySelector('.void-dialog-close')).toBeNull();
  });

  it('voidAfterMorph() re-projects without waiting', async () => {
    const el = mount('<void-card><p id="c">c</p></void-card>');
    await settle(el);
    el.voidBeforeMorph();
    el.voidAfterMorph();
    expect(el.querySelector('.void-card-body > #c')).not.toBeNull();
    await el.voidAfterMorph();
    expect(el.querySelectorAll('.void-card-body').length).toBe(1);
  });

  it('projects what a morph changed in between (added, removed, edited nodes)', async () => {
    const el = mount('<void-card><p id="a">a</p><p id="b">b</p></void-card>');
    await settle(el);
    const a = el.querySelector('#a')!;
    el.voidBeforeMorph();
    // what a morph does against new server markup: edit a, drop b, add c
    a.textContent = 'a2';
    Node.prototype.removeChild.call(el, el.querySelector('#b')!);
    const c = document.createElement('p');
    c.id = 'c';
    Node.prototype.appendChild.call(el, c);
    await settle(el);
    expect(Array.from(el.querySelector('.void-card-body')!.children)).toEqual([a, c]);
    expect(a.textContent).toBe('a2');
  });

  it('keeps component state: select value, active tab, trigger', async () => {
    const sel = mount('<void-select value="y"><option value="x">x</option><option value="y">y</option><option value="z">z</option></void-select>');
    const tabs = mount('<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel><void-tab-panel tab="b" label="B">b</void-tab-panel></void-tabs>');
    const dd = mount('<void-dropdown-menu><button id="t">T</button><void-dropdown-menu-item>I</void-dropdown-menu-item></void-dropdown-menu>');
    await settle(sel);
    await settle(tabs);
    await settle(dd);
    const native = sel.querySelector('select')!;
    native.value = 'z';
    native.dispatchEvent(new Event('change'));
    tabs.querySelectorAll<HTMLElement>('.void-tabs-tab')[1].click();
    await settle(tabs);
    for (const el of [sel, tabs, dd]) el.voidBeforeMorph();
    await settle(sel);
    await settle(tabs);
    await settle(dd);
    expect(sel.querySelector('select')).toBe(native);
    expect(native.value).toBe('z');
    expect(sel.value).toBe('z');
    expect(tabs.querySelector('.void-tabs-tab[aria-selected="true"]')!.textContent!.trim()).toBe('B');
    expect(dd.firstElementChild!.id).toBe('t');
    (dd.firstElementChild as HTMLElement).click();
    expect(dd.open).toBe(true);
  });

  it('falls back to a fresh render if the morph brought rendered chrome of its own', async () => {
    const el = mount('<void-card heading="H"><p id="c">c</p></void-card>');
    await settle(el);
    const serialised = el.innerHTML;
    el.voidBeforeMorph();
    el.innerHTML = serialised; // a morph against a snapshot of the rendered page
    await settle(el);
    expect(el.querySelectorAll('.void-card-body').length).toBe(1);
    expect(el.querySelectorAll('.void-card-header').length).toBe(1);
    expect(el.querySelectorAll('#c').length).toBe(1);
  });

  it('is a safe no-op where there is nothing to unproject', async () => {
    const button = mount('<void-button>b</void-button>');
    expect(button.voidBeforeMorph()).toBe(false);
    const fresh = document.createElement('void-card') as Host;
    expect(fresh.voidBeforeMorph()).toBe(false);
    const el = mount('<void-card><p>c</p></void-card>');
    await settle(el);
    expect(el.voidBeforeMorph()).toBe(true);
    // Re-entrant: a second call before re-projection finds it still parked.
    expect(el.voidBeforeMorph()).toBe(true);
    await settle(el);
    expect(el.querySelectorAll('.void-card-body').length).toBe(1);
  });

  it('works for nested projecting hosts unprojected outer-first, as a morph walks them', async () => {
    const el = mount('<void-dialog open><void-card heading="C"><p id="p">p</p></void-card></void-dialog>');
    await settle(el);
    const card = el.querySelector('void-card') as Host;
    await settle(card);
    const p = el.querySelector('#p');
    el.voidBeforeMorph();
    card.voidBeforeMorph();
    expect(Array.from(el.children)).toEqual([card]);
    expect(markup(card)).toBe('<p id="p">p</p>');
    await settle(el);
    await settle(card);
    expect(el.querySelector('.void-dialog-body > void-card > .void-card-body > #p')).toBe(p);
  });
});

describe('identity-tracked chrome (morphs without the hook)', () => {
  /**
   * What idiomorph does with `<void-dialog><div id="dcontent">…</div></void-dialog>`:
   * it matches the server's first <div> to the rendered backdrop by tag, rewrites
   * its attributes and children in place, and drops every other child.
   */
  function morphRecyclingFirstDiv(el: Element, id: string, text: string): Element {
    const recycled = el.querySelector(':scope > div')!;
    for (const attr of Array.from(recycled.attributes)) recycled.removeAttribute(attr.name);
    recycled.id = id;
    while (recycled.firstChild) recycled.removeChild(recycled.firstChild);
    recycled.textContent = text;
    for (const n of Array.from(el.childNodes)) if (n !== recycled) Node.prototype.removeChild.call(el, n);
    return recycled;
  }

  it('dialog: a morph that drops the rendered panel rebuilds it, still open, around the server content', async () => {
    const el = mount('<void-dialog open heading="H"><div id="dcontent">one</div></void-dialog>');
    await settle(el);
    const panel = el.querySelector('dialog.void-dialog-panel')!;
    // The rendered panel is a <dialog>, so a morph cannot recycle it as a content <div>;
    // without the hook it is removed together with the markers.
    for (const n of Array.from(el.childNodes)) Node.prototype.removeChild.call(el, n);
    const server = document.createElement('div');
    server.id = 'dcontent';
    server.textContent = 'two';
    Node.prototype.appendChild.call(el, server);
    await settle(el);
    await settle(el);
    const fresh = el.querySelector<HTMLDialogElement>('dialog.void-dialog-panel')!;
    expect(fresh).not.toBe(panel);
    expect(fresh.open).toBe(true);
    const content = el.querySelector('#dcontent')!;
    expect(content.textContent).toBe('two');
    expect(content.parentElement!.classList.contains('void-dialog-body')).toBe(true);
    (content as HTMLElement).click();
    await settle(el);
    expect(el.open).toBe(true);
  });

  it('card: a recycled header is replaced by a plain copy', async () => {
    const el = mount('<void-card heading="H"><div id="cc">one</div></void-card>');
    await settle(el);
    const header = el.querySelector('.void-card-header')!;
    morphRecyclingFirstDiv(el, 'cc', 'two');
    await settle(el);
    expect(el.querySelector('#cc')).not.toBe(header);
    expect(el.querySelector('.void-card-body > #cc')!.textContent).toBe('two');
    expect(el.querySelectorAll('.void-card-header').length).toBe(1);
  });

  it('hover-card: a recycled trigger wrapper loses its mouseenter listener', async () => {
    const el = mount('<void-hover-card open-delay="0"><a id="t">t</a><div id="b">b</div></void-hover-card>');
    await settle(el);
    const wrapper = el.querySelector('.void-hover-card-trigger')!;
    morphRecyclingFirstDiv(el, 'b', 'body');
    await settle(el);
    const b = el.querySelector('#b')!;
    expect(b).not.toBe(wrapper);
    b.dispatchEvent(new MouseEvent('mouseenter'));
    await new Promise(r => setTimeout(r, 10));
    expect(el.open).toBe(false);
  });

  it('removing a chrome element while the markers stay triggers recovery', async () => {
    const el = mount('<void-card heading="H"><p id="c">c</p></void-card>');
    await settle(el);
    Node.prototype.removeChild.call(el, el.querySelector('.void-card-body')!);
    await settle(el);
    expect(el.querySelectorAll('.void-card-body').length).toBe(1);
    expect(el.querySelectorAll('.void-card-header').length).toBe(1);
  });

  it('a Lit re-render that drops a top-level element is not mistaken for damage', async () => {
    const el = mount('<void-card heading="H"><p id="c">c</p></void-card>');
    await settle(el);
    const body = el.querySelector('.void-card-body');
    el.heading = '';
    await settle(el);
    el.heading = 'again';
    await settle(el);
    expect(el.querySelector('.void-card-body')).toBe(body);
  });
});

describe('replaceChildren validation', () => {
  it('throws HierarchyRequestError before touching content when given an ancestor', async () => {
    const outer = document.createElement('section');
    document.body.appendChild(outer);
    const el = mount('<void-card><p id="c">c</p></void-card>');
    outer.appendChild(el);
    await settle(el);
    expect(() => el.replaceChildren(outer)).toThrow(/HierarchyRequestError|cannot be inserted/);
    expect(el.querySelector('.void-card-body > #c')).not.toBeNull();
    expect(() => el.replaceChildren(el)).toThrow();
    expect(el.querySelector('.void-card-body > #c')).not.toBeNull();
  });

  it('accepts its own current children', async () => {
    const el = mount('<void-card><p id="a">a</p><p id="b">b</p></void-card>');
    await settle(el);
    const a = el.querySelector('#a')!;
    const b = el.querySelector('#b')!;
    el.replaceChildren(b, a);
    expect(Array.from(el.querySelector('.void-card-body')!.children)).toEqual([b, a]);
  });
});

describe('missing-trigger warning (development builds only)', () => {
  it('warns once, naming slot="trigger", when items are projected without a trigger', async () => {
    const dev = (customElements.get('void-dropdown-menu') as unknown as { enabledWarnings?: unknown }).enabledWarnings !== undefined;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // React re-keying an unslotted trigger: remove it, insert the new one next to an item.
      const el = mount('<void-dropdown-menu><button id="t1">T</button><void-dropdown-menu-item id="i">I</void-dropdown-menu-item></void-dropdown-menu>');
      await settle(el);
      el.removeChild(el.querySelector('#t1')!);
      const t2 = document.createElement('button');
      el.insertBefore(t2, el.querySelector('#i'));
      await settle(el);
      el.appendChild(document.createElement('void-dropdown-menu-item'));
      await settle(el);
      const ours = warn.mock.calls.filter(c => String(c[0]).includes('slot="trigger"'));
      expect(ours.length).toBe(dev ? 1 : 0);
      warn.mockClear();
      const ok = mount('<void-dropdown-menu><button slot="trigger">T</button><void-dropdown-menu-item>I</void-dropdown-menu-item></void-dropdown-menu>');
      await settle(ok);
      ok.removeChild(ok.querySelector('button')!); // deliberately hidden slotted trigger
      await settle(ok);
      expect(warn.mock.calls.filter(c => String(c[0]).includes('slot="trigger"')).length).toBe(0);
    } finally {
      warn.mockRestore();
    }
  });
});
