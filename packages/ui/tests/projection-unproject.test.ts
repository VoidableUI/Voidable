// @vitest-environment happy-dom
// Issue #4 second review: the voidBeforeMorph() pre-morph hook, identity-tracked
// chrome (recycled-chrome morphs, removed chrome) and replaceChildren validation.
// Focus is checked in the Chromium probes. Dialog, card, tabs and the anchored
// overlays use explicit parts (#52) and project nothing; void-collapsible (chrome
// plus one projected region) stands in for them.
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { LitElement } from 'lit';
import type { VoidElement } from '../src/base.js';
import '../src/components/collapsible.js';
import '../src/components/select.js';
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
    const el = mount(`<void-collapsible heading="H">${original}</void-collapsible>`);
    await settle(el);
    expect(el.voidBeforeMorph()).toBe(true);
    expect(el.innerHTML).toBe(original);
    expect(el.querySelector('[data-void-chrome], [data-void-projection]')).toBeNull();
  });

  it('puts the projected nodes back in source order', async () => {
    const el = mount('<void-collapsible heading="H"><p id="a">a</p><p id="b">b</p></void-collapsible>');
    await settle(el);
    el.voidBeforeMorph();
    expect(Array.from(el.children).map(c => c.id)).toEqual(['a', 'b']);
  });

  it('re-projects on its own, reusing the same chrome and consumer nodes', async () => {
    const el = mount('<void-collapsible open heading="H"><p id="c">c</p></void-collapsible>');
    await settle(el);
    const trigger = el.querySelector('.void-collapsible-trigger');
    const c = el.querySelector('#c');
    el.voidBeforeMorph();
    expect(el.querySelector('.void-collapsible-trigger')).toBeNull();
    await settle(el);
    expect(el.querySelector('.void-collapsible-trigger')).toBe(trigger);
    expect(el.querySelector('.void-collapsible-inner > #c')).toBe(c);
    expect(el.open).toBe(true);
    // Lit keeps patching the same part afterwards
    el.heading = 'After';
    await settle(el);
    expect(el.querySelector('.void-collapsible-trigger')!.textContent!.trim()).toBe('After');
  });

  it('voidAfterMorph() re-projects without waiting', async () => {
    const el = mount('<void-collapsible><p id="c">c</p></void-collapsible>');
    await settle(el);
    el.voidBeforeMorph();
    el.voidAfterMorph();
    expect(el.querySelector('.void-collapsible-inner > #c')).not.toBeNull();
    await el.voidAfterMorph();
    expect(el.querySelectorAll('.void-collapsible-inner').length).toBe(1);
  });

  it('projects what a morph changed in between (added, removed, edited nodes)', async () => {
    const el = mount('<void-collapsible><p id="a">a</p><p id="b">b</p></void-collapsible>');
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
    expect(Array.from(el.querySelector('.void-collapsible-inner')!.children)).toEqual([a, c]);
    expect(a.textContent).toBe('a2');
  });

  it('keeps component state: select value', async () => {
    const sel = mount('<void-select value="y"><option value="x">x</option><option value="y">y</option><option value="z">z</option></void-select>');
    await settle(sel);
    const native = sel.querySelector('select')!;
    native.value = 'z';
    native.dispatchEvent(new Event('change'));
    sel.voidBeforeMorph();
    await settle(sel);
    expect(sel.querySelector('select')).toBe(native);
    expect(native.value).toBe('z');
    expect(sel.value).toBe('z');
  });

  it('falls back to a fresh render if the morph brought rendered chrome of its own', async () => {
    const el = mount('<void-collapsible heading="H"><p id="c">c</p></void-collapsible>');
    await settle(el);
    const serialised = el.innerHTML;
    el.voidBeforeMorph();
    el.innerHTML = serialised; // a morph against a snapshot of the rendered page
    await settle(el);
    expect(el.querySelectorAll('.void-collapsible-inner').length).toBe(1);
    expect(el.querySelectorAll('.void-collapsible-trigger').length).toBe(1);
    expect(el.querySelectorAll('#c').length).toBe(1);
  });

  it('is a safe no-op where there is nothing to unproject', async () => {
    const button = mount('<void-button>b</void-button>');
    expect(button.voidBeforeMorph()).toBe(false);
    const fresh = document.createElement('void-collapsible') as Host;
    expect(fresh.voidBeforeMorph()).toBe(false);
    const el = mount('<void-collapsible><p>c</p></void-collapsible>');
    await settle(el);
    expect(el.voidBeforeMorph()).toBe(true);
    // Re-entrant: a second call before re-projection finds it still parked.
    expect(el.voidBeforeMorph()).toBe(true);
    await settle(el);
    expect(el.querySelectorAll('.void-collapsible-inner').length).toBe(1);
  });

  it('works for nested projecting hosts unprojected outer-first, as a morph walks them', async () => {
    const el = mount('<void-collapsible open heading="O"><void-collapsible heading="C"><p id="p">p</p></void-collapsible></void-collapsible>');
    await settle(el);
    const inner = el.querySelector('void-collapsible') as Host;
    await settle(inner);
    const p = el.querySelector('#p');
    el.voidBeforeMorph();
    inner.voidBeforeMorph();
    expect(Array.from(el.children)).toEqual([inner]);
    expect(markup(inner)).toBe('<p id="p">p</p>');
    await settle(el);
    await settle(inner);
    expect(el.querySelector('.void-collapsible-inner > void-collapsible > .void-collapsible-content > .void-collapsible-inner > #p')).toBe(p);
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

  it('a recycled chrome element is replaced by a plain copy', async () => {
    const el = mount('<void-collapsible heading="H"><div id="cc">one</div></void-collapsible>');
    await settle(el);
    const header = el.querySelector('.void-collapsible-content')!;
    morphRecyclingFirstDiv(el, 'cc', 'two');
    await settle(el);
    expect(el.querySelector('#cc')).not.toBe(header);
    expect(el.querySelector('.void-collapsible-inner > #cc')!.textContent).toBe('two');
    expect(el.querySelectorAll('.void-collapsible-trigger').length).toBe(1);
  });

  it('removing a chrome element while the markers stay triggers recovery', async () => {
    const el = mount('<void-collapsible heading="H"><p id="c">c</p></void-collapsible>');
    await settle(el);
    Node.prototype.removeChild.call(el, el.querySelector(':scope > .void-collapsible-content')!);
    await settle(el);
    expect(el.querySelectorAll('.void-collapsible-inner').length).toBe(1);
    expect(el.querySelectorAll('.void-collapsible-trigger').length).toBe(1);
  });

  it('a Lit re-render that drops a top-level element is not mistaken for damage', async () => {
    const el = mount('<void-collapsible heading="H"><p id="c">c</p></void-collapsible>');
    await settle(el);
    const body = el.querySelector('.void-collapsible-inner');
    el.heading = '';
    await settle(el);
    el.heading = 'again';
    await settle(el);
    expect(el.querySelector('.void-collapsible-inner')).toBe(body);
  });
});

describe('replaceChildren validation', () => {
  it('throws HierarchyRequestError before touching content when given an ancestor', async () => {
    const outer = document.createElement('section');
    document.body.appendChild(outer);
    const el = mount('<void-collapsible><p id="c">c</p></void-collapsible>');
    outer.appendChild(el);
    await settle(el);
    expect(() => el.replaceChildren(outer)).toThrow(/HierarchyRequestError|cannot be inserted/);
    expect(el.querySelector('.void-collapsible-inner > #c')).not.toBeNull();
    expect(() => el.replaceChildren(el)).toThrow();
    expect(el.querySelector('.void-collapsible-inner > #c')).not.toBeNull();
  });

  it('accepts its own current children', async () => {
    const el = mount('<void-collapsible><p id="a">a</p><p id="b">b</p></void-collapsible>');
    await settle(el);
    const a = el.querySelector('#a')!;
    const b = el.querySelector('#b')!;
    el.replaceChildren(b, a);
    expect(Array.from(el.querySelector('.void-collapsible-inner')!.children)).toEqual([b, a]);
  });
});
