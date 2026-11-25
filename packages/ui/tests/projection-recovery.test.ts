// @vitest-environment happy-dom
// Issue #4 review follow-up: recovery from morphs, clones and wholesale child
// replacement; insertion order. Visibility is checked in the
// Chromium probes, not here (happy-dom has no layout).
import { describe, it, expect, afterEach } from 'vitest';
import type { LitElement } from 'lit';
// Dialog, card, tabs and the anchored overlays use explicit parts (#52) and no
// projection; a fixture (chrome plus one projected region) stands in.
import './helpers/projection-fixture.js';
import '../src/components/select.js';
import '../src/components/menu.js';
import '../src/components/tag.js';
import '../src/components/checkbox.js';

type Host = LitElement & Record<string, unknown>;

async function settle(el?: LitElement): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await new Promise(r => setTimeout(r, 0));
    if (el) await el.updateComplete;
  }
}

function mount<T extends LitElement = Host>(html: string, parent: Element = document.body): T {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  const el = wrap.firstElementChild as T;
  parent.appendChild(el);
  return el;
}

/**
 * What a server-side morph (idiomorph `innerHTML` style) leaves behind: the host
 * element survives, but its children are reconciled to the server markup, which
 * has no markers and no rendered chrome. Uses the native DOM so VoidElement's
 * overrides are bypassed, as a morph library's node-level calls effectively are.
 */
function morphChildren(el: Element, serverHtml: string): void {
  while (el.firstChild) Node.prototype.removeChild.call(el, el.firstChild);
  const tpl = document.createElement('template');
  tpl.innerHTML = serverHtml;
  Node.prototype.appendChild.call(el, tpl.content);
}

const markers = (el: Element) =>
  Array.from(el.childNodes).filter(n => n.nodeType === Node.COMMENT_NODE && /^\/?void-projection$/.test((n as Comment).data));

const ids = (el: Element | null) => Array.from(el?.children ?? []).map(c => c.id);

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('recovery after the markers are removed (morph)', () => {
  it('rebuilds its chrome and projects the morphed content', async () => {
    const el = mount('<void-projection-fixture heading="Hi"><p id="dc">one</p></void-projection-fixture>');
    await settle(el);
    morphChildren(el, '<p id="dc">two</p><button id="db">ok</button>');
    await settle(el);
    expect(markers(el).length).toBe(2);
    expect(el.querySelectorAll('.void-projection-fixture-trigger').length).toBe(1);
    expect(ids(el.querySelector('.void-projection-fixture-inner'))).toEqual(['dc', 'db']);
    expect(el.querySelector('#dc')!.textContent).toBe('two');
    el.open = true;
    await settle(el);
    expect(el.querySelector('.void-projection-fixture-trigger')!.getAttribute('aria-expanded')).toBe('true');
    el.heading = 'After';
    await settle(el);
    expect(el.querySelector('.void-projection-fixture-trigger')!.textContent!.trim()).toBe('After');
  });

  it('survives repeated morphs', async () => {
    const el = mount('<void-projection-fixture heading="H"><p>1</p></void-projection-fixture>');
    await settle(el);
    for (let i = 2; i < 6; i++) {
      morphChildren(el, `<p id="p${i}">${i}</p>`);
      await settle(el);
      expect(ids(el.querySelector('.void-projection-fixture-inner'))).toEqual([`p${i}`]);
      expect(el.querySelectorAll('.void-projection-fixture-trigger').length).toBe(1);
    }
    el.heading = '';
    await settle(el);
    expect(el.querySelector('.void-projection-fixture-trigger')!.textContent!.trim()).toBe('');
    el.heading = 'Back';
    await settle(el);
    expect(el.querySelector('.void-projection-fixture-trigger')!.textContent!.trim()).toBe('Back');
  });

  it('select gets a fresh native select with the right value', async () => {
    const el = mount('<void-select value="y"><option value="x">x</option><option value="y">y</option></void-select>');
    await settle(el);
    morphChildren(el, '<option value="x">x</option><option value="y">y2</option>');
    await settle(el);
    const selects = el.querySelectorAll('select');
    expect(selects.length).toBe(1);
    expect(selects[0].options.length).toBe(2);
    expect(selects[0].value).toBe('y');
  });

  it('recovers when only one marker is removed, without duplicating chrome or content', async () => {
    const el = mount('<void-projection-fixture><p id="c">c</p></void-projection-fixture>');
    await settle(el);
    const start = markers(el)[0];
    Node.prototype.removeChild.call(el, start);
    await settle(el);
    expect(markers(el).length).toBe(2);
    expect(el.querySelectorAll('.void-projection-fixture-trigger').length).toBe(1);
    expect(el.querySelectorAll('#c').length).toBe(1);
    expect(el.querySelector('.void-projection-fixture-inner #c')).not.toBeNull();
  });

  it('recovers when markers vanish while disconnected', async () => {
    const el = mount('<void-projection-fixture><p id="c">c</p></void-projection-fixture>');
    await settle(el);
    el.remove();
    morphChildren(el, '<p id="d">d</p>');
    document.body.appendChild(el);
    await settle(el);
    expect(ids(el.querySelector('.void-projection-fixture-inner'))).toEqual(['d']);
  });

  it('recovers when a property change lands in the same tick as the morph', async () => {
    const el = mount('<void-projection-fixture heading="H"><p>1</p></void-projection-fixture>');
    await settle(el);
    el.heading = '';
    morphChildren(el, '<p id="m">m</p>');
    await settle(el);
    expect(el.querySelector('.void-projection-fixture-trigger')!.textContent!.trim()).toBe('');
    expect(ids(el.querySelector('.void-projection-fixture-inner'))).toEqual(['m']);
  });

  it('settles after recovery instead of looping', async () => {
    const el = mount('<void-projection-fixture><p>1</p></void-projection-fixture>');
    await settle(el);
    let updates = 0;
    const original = (el as unknown as { updated: (c: Map<string, unknown>) => void }).updated;
    (el as unknown as { updated: (c: Map<string, unknown>) => void }).updated = function (this: LitElement, c) {
      updates++;
      return original.call(this, c);
    };
    morphChildren(el, '<p>2</p>');
    await settle(el);
    const after = updates;
    await settle(el);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThanOrEqual(2);
    expect(updates).toBe(after);
  });

  it('host.innerHTML on a rendered host is treated as new content', async () => {
    const el = mount('<void-projection-fixture heading="H"><p>old</p></void-projection-fixture>');
    await settle(el);
    el.innerHTML = '<p id="n">new</p>';
    await settle(el);
    expect(ids(el.querySelector('.void-projection-fixture-inner'))).toEqual(['n']);
    el.heading = 'H2';
    await settle(el);
    expect(el.querySelector('.void-projection-fixture-trigger')!.textContent!.trim()).toBe('H2');
  });
});

describe('cloneNode / outerHTML of a rendered host', () => {
  it('a deep clone renders one set of chrome around the original content', async () => {
    const el = mount('<void-projection-fixture heading="Hi"><p id="c">content</p></void-projection-fixture>');
    await settle(el);
    const clone = el.cloneNode(true) as Host;
    clone.id = 'clone';
    document.body.appendChild(clone);
    await settle(clone);
    expect(clone.querySelectorAll('.void-projection-fixture-trigger').length).toBe(1);
    expect(markers(clone).length).toBe(2);
    const body = clone.querySelector('.void-projection-fixture-inner')!;
    expect(body.children.length).toBe(1);
    expect(body.firstElementChild!.id).toBe('c');
  });

  it('a clone of a select has one native select with the value applied', async () => {
    const el = mount('<void-select value="y"><option value="x">x</option><option value="y">y</option></void-select>');
    await settle(el);
    const clone = el.cloneNode(true) as Host;
    document.body.appendChild(clone);
    await settle(clone);
    expect(clone.querySelectorAll('select').length).toBe(1);
    expect(clone.querySelector('select')!.options.length).toBe(2);
    expect(clone.querySelector('select')!.value).toBe('y');
  });

  it('nested projecting hosts inside a cloned host are each cleaned up once', async () => {
    const el = mount('<void-projection-fixture><void-projection-fixture heading="C"><p id="inner">x</p></void-projection-fixture></void-projection-fixture>');
    await settle(el);
    const clone = el.cloneNode(true) as Host;
    document.body.appendChild(clone);
    await settle(clone);
    await settle(clone.querySelector('void-projection-fixture void-projection-fixture') as LitElement);
    expect(clone.querySelectorAll('.void-projection-fixture-trigger').length).toBe(2);
    expect(clone.querySelectorAll('void-projection-fixture void-projection-fixture').length).toBe(1);
    expect(clone.querySelectorAll('#inner').length).toBe(1);
    expect(clone.querySelector('.void-projection-fixture-inner > void-projection-fixture > .void-projection-fixture-content > .void-projection-fixture-inner > #inner')).not.toBeNull();
  });

  it('an outerHTML round-trip (cache snapshot / restore) renders once', async () => {
    const el = mount('<void-projection-fixture heading="H"><p id="c">body</p></void-projection-fixture>');
    await settle(el);
    const box = document.createElement('div');
    document.body.appendChild(box);
    box.innerHTML = el.outerHTML;
    const restored = box.firstElementChild as Host;
    await settle(restored);
    expect(restored.querySelectorAll('.void-projection-fixture-trigger').length).toBe(1);
    expect(restored.querySelectorAll('.void-projection-fixture-inner').length).toBe(1);
    expect(ids(restored.querySelector('.void-projection-fixture-inner'))).toEqual(['c']);
  });
});

describe('textContent and replaceChildren on a rendered host', () => {
  it('textContent replaces only the projected content, keeping the chrome', async () => {
    const el = mount('<void-projection-fixture open heading="D">hello</void-projection-fixture>');
    await settle(el);
    const panel = el.querySelector('.void-projection-fixture-trigger');
    for (const text of ['world', 'again', 'third']) {
      el.textContent = text;
      await settle(el);
      expect(el.querySelector('.void-projection-fixture-trigger')).toBe(panel);
      expect(el.querySelector('.void-projection-fixture-inner')!.textContent).toBe(text);
    }
    el.textContent = '';
    await settle(el);
    expect(el.querySelector('.void-projection-fixture-inner')!.childNodes.length).toBe(0);
    expect(el.querySelector('.void-projection-fixture-trigger')).toBe(panel);
  });

  it('textContent on menu-item, tag and checkbox keeps their rendered parts', async () => {
    const item = mount('<void-menu-item icon="*" shortcut="K">Old</void-menu-item>');
    const tag = mount('<void-tag removable>Old</void-tag>');
    const box = mount('<void-checkbox>Old</void-checkbox>');
    await settle(item);
    await settle(tag);
    await settle(box);
    item.textContent = 'New';
    tag.textContent = 'New';
    box.textContent = 'New';
    await settle(item);
    expect(item.querySelector('.void-menu-item-label')!.textContent).toBe('New');
    expect(item.querySelector('.void-menu-item-icon')).not.toBeNull();
    expect(item.querySelector('.void-menu-item-shortcut')).not.toBeNull();
    expect(tag.querySelector('.void-tag-close')).not.toBeNull();
    expect(tag.textContent).toContain('New');
    expect(tag.textContent).not.toContain('Old');
    expect(box.querySelectorAll('input').length).toBe(1);
    expect(box.lastChild!.textContent).toBe('New');
  });

  it('reading textContent is unchanged', async () => {
    const el = mount('<void-projection-fixture heading="H"><p>body</p></void-projection-fixture>');
    await settle(el);
    expect(el.textContent).toContain('H');
    expect(el.textContent).toContain('body');
  });

  it('replaceChildren replaces consumer content with nodes and strings', async () => {
    const el = mount('<void-projection-fixture open><p>old</p></void-projection-fixture>');
    await settle(el);
    const panel = el.querySelector('.void-projection-fixture-trigger');
    const p = document.createElement('p');
    p.id = 'n';
    el.replaceChildren(p, 'tail');
    await settle(el);
    expect(el.querySelector('.void-projection-fixture-trigger')).toBe(panel);
    const body = el.querySelector('.void-projection-fixture-inner')!;
    expect(body.firstChild).toBe(p);
    expect(body.textContent).toBe('tail');
    el.replaceChildren();
    await settle(el);
    expect(body.childNodes.length).toBe(0);
  });

  it('textContent = "" then append (Solid-style clear) keeps working', async () => {
    const el = mount('<void-menu open><void-menu-item>a</void-menu-item></void-menu>');
    await settle(el);
    el.textContent = '';
    const item = document.createElement('void-menu-item');
    item.textContent = 'x';
    el.appendChild(item);
    await settle(el);
    expect(el.querySelectorAll('.void-menu-list').length).toBe(1);
    expect(el.querySelectorAll('.void-menu-list void-menu-item').length).toBe(1);
  });
});

describe('insertion order for observed nodes', () => {
  it('prepend lands first in a card body', async () => {
    const el = mount('<void-projection-fixture><p id="a">a</p><p id="b">b</p></void-projection-fixture>');
    await settle(el);
    const x = document.createElement('p');
    x.id = 'x';
    el.prepend(x);
    await settle(el);
    expect(ids(el.querySelector('.void-projection-fixture-inner'))).toEqual(['x', 'a', 'b']);
    const y = document.createElement('p');
    y.id = 'y';
    el.insertBefore(y, el.firstChild);
    await settle(el);
    expect(ids(el.querySelector('.void-projection-fixture-inner'))).toEqual(['y', 'x', 'a', 'b']);
  });

  it('several prepended nodes keep their relative order', async () => {
    const el = mount('<void-projection-fixture><p id="a">a</p></void-projection-fixture>');
    await settle(el);
    const x = document.createElement('p');
    x.id = 'x';
    const y = document.createElement('p');
    y.id = 'y';
    el.prepend(x, y);
    await settle(el);
    expect(ids(el.querySelector('.void-projection-fixture-inner'))).toEqual(['x', 'y', 'a']);
  });

  it('prepend lands first in a select', async () => {
    const el = mount('<void-select><option value="a">a</option></void-select>');
    await settle(el);
    const o = document.createElement('option');
    o.value = 'first';
    el.prepend(o);
    await settle(el);
    expect(Array.from(el.querySelector('select')!.options).map(x => x.value)).toEqual(['first', 'a']);
  });

});
