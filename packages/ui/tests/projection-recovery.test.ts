// @vitest-environment happy-dom
// Issue #4 review follow-up: recovery from morphs, clones and wholesale child
// replacement; insertion order; explicit triggers. Visibility is checked in the
// Chromium probes, not here (happy-dom has no layout).
import { describe, it, expect, afterEach } from 'vitest';
import type { LitElement } from 'lit';
import '../src/components/dialog.js';
import '../src/components/card.js';
import '../src/components/tabs.js';
import '../src/components/select.js';
import '../src/components/dropdown-menu.js';
import '../src/components/popover.js';
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
  it('dialog rebuilds its chrome and projects the morphed content', async () => {
    const el = mount('<void-dialog heading="Hi"><p id="dc">one</p></void-dialog>');
    await settle(el);
    morphChildren(el, '<p id="dc">two</p><button id="db">ok</button>');
    await settle(el);
    expect(markers(el).length).toBe(2);
    expect(el.querySelectorAll('dialog.void-dialog-panel').length).toBe(1);
    expect(el.querySelector('.void-dialog-close')).not.toBeNull();
    expect(ids(el.querySelector('.void-dialog-body'))).toEqual(['dc', 'db']);
    expect(el.querySelector('#dc')!.textContent).toBe('two');
    el.open = true;
    await settle(el);
    expect(el.querySelector<HTMLDialogElement>('dialog.void-dialog-panel')!.open).toBe(true);
    // conditional template parts keep working after recovery
    el.closable = false;
    await settle(el);
    expect(el.querySelector('.void-dialog-close')).toBeNull();
    el.closable = true;
    await settle(el);
    expect(el.querySelectorAll('.void-dialog-close').length).toBe(1);
  });

  it('survives repeated morphs', async () => {
    const el = mount('<void-card heading="H"><p>1</p></void-card>');
    await settle(el);
    for (let i = 2; i < 6; i++) {
      morphChildren(el, `<p id="p${i}">${i}</p>`);
      await settle(el);
      expect(ids(el.querySelector('.void-card-body'))).toEqual([`p${i}`]);
      expect(el.querySelectorAll('.void-card-header').length).toBe(1);
    }
    el.heading = '';
    await settle(el);
    expect(el.querySelector('.void-card-header')).toBeNull();
    el.heading = 'Back';
    await settle(el);
    expect(el.querySelector('.void-card-heading')!.textContent).toBe('Back');
  });

  it('tabs rebuild their tab buttons', async () => {
    const el = mount('<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel></void-tabs>');
    await settle(el);
    morphChildren(el, '<void-tab-panel tab="a" label="A">a</void-tab-panel><void-tab-panel tab="b" label="B">b</void-tab-panel>');
    await settle(el);
    expect(Array.from(el.querySelectorAll('.void-tabs-tab')).map(b => b.textContent!.trim())).toEqual(['A', 'B']);
    expect(el.querySelectorAll('[role=tablist]').length).toBe(1);
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

  it('dropdown-menu keeps its trigger first and still toggles', async () => {
    const el = mount('<void-dropdown-menu><button id="t">T</button><void-dropdown-menu-item>A</void-dropdown-menu-item></void-dropdown-menu>');
    await settle(el);
    morphChildren(el, '<button id="t">T2</button><void-dropdown-menu-item id="a">A2</void-dropdown-menu-item>');
    await settle(el);
    expect(el.firstElementChild!.id).toBe('t');
    expect(el.querySelector('.void-dropdown-menu-panel #a')).not.toBeNull();
    el.querySelector<HTMLElement>('#t')!.click();
    expect(el.open).toBe(true);
  });

  it('recovers when only one marker is removed, without duplicating chrome or content', async () => {
    const el = mount('<void-dialog><p id="c">c</p></void-dialog>');
    await settle(el);
    const start = markers(el)[0];
    Node.prototype.removeChild.call(el, start);
    await settle(el);
    expect(markers(el).length).toBe(2);
    expect(el.querySelectorAll('dialog.void-dialog-panel').length).toBe(1);
    expect(el.querySelectorAll('#c').length).toBe(1);
    expect(el.querySelector('.void-dialog-body #c')).not.toBeNull();
  });

  it('recovers when markers vanish while disconnected', async () => {
    const el = mount('<void-card><p id="c">c</p></void-card>');
    await settle(el);
    el.remove();
    morphChildren(el, '<p id="d">d</p>');
    document.body.appendChild(el);
    await settle(el);
    expect(ids(el.querySelector('.void-card-body'))).toEqual(['d']);
  });

  it('recovers when a property change lands in the same tick as the morph', async () => {
    const el = mount('<void-card heading="H"><p>1</p></void-card>');
    await settle(el);
    el.heading = '';
    morphChildren(el, '<p id="m">m</p>');
    await settle(el);
    expect(el.querySelector('.void-card-header')).toBeNull();
    expect(ids(el.querySelector('.void-card-body'))).toEqual(['m']);
  });

  it('settles after recovery instead of looping', async () => {
    const el = mount('<void-card><p>1</p></void-card>');
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
    const el = mount('<void-card heading="H"><p>old</p></void-card>');
    await settle(el);
    el.innerHTML = '<p id="n">new</p>';
    await settle(el);
    expect(ids(el.querySelector('.void-card-body'))).toEqual(['n']);
    el.heading = 'H2';
    await settle(el);
    expect(el.querySelector('.void-card-heading')!.textContent).toBe('H2');
  });
});

describe('cloneNode / outerHTML of a rendered host', () => {
  it('a deep clone of a dialog renders one set of chrome around the original content', async () => {
    const el = mount('<void-dialog heading="Hi"><p id="c">content</p></void-dialog>');
    await settle(el);
    const clone = el.cloneNode(true) as Host;
    clone.id = 'clone';
    document.body.appendChild(clone);
    await settle(clone);
    expect(clone.querySelectorAll('dialog.void-dialog-panel').length).toBe(1);
    expect(clone.querySelectorAll('.void-dialog-close').length).toBe(1);
    expect(markers(clone).length).toBe(2);
    const body = clone.querySelector('.void-dialog-body')!;
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

  it('a clone of tabs has one tablist', async () => {
    const el = mount('<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel><void-tab-panel tab="b" label="B">b</void-tab-panel></void-tabs>');
    await settle(el);
    const clone = el.cloneNode(true) as Host;
    document.body.appendChild(clone);
    await settle(clone);
    expect(clone.querySelectorAll('[role=tablist]').length).toBe(1);
    expect(clone.querySelectorAll('.void-tabs-tab').length).toBe(2);
  });

  it('a clone of a dropdown-menu keeps the trigger and one panel', async () => {
    const el = mount('<void-dropdown-menu><button id="t">T</button><void-dropdown-menu-item>A</void-dropdown-menu-item></void-dropdown-menu>');
    await settle(el);
    const clone = el.cloneNode(true) as Host;
    document.body.appendChild(clone);
    await settle(clone);
    expect(clone.firstElementChild!.id).toBe('t');
    expect(clone.querySelectorAll('.void-dropdown-menu-panel').length).toBe(1);
    expect(clone.querySelectorAll('.void-dropdown-menu-panel void-dropdown-menu-item').length).toBe(1);
  });

  it('nested projecting hosts inside a cloned host are each cleaned up once', async () => {
    const el = mount('<void-dialog><void-card heading="C"><p id="inner">x</p></void-card></void-dialog>');
    await settle(el);
    const clone = el.cloneNode(true) as Host;
    document.body.appendChild(clone);
    await settle(clone);
    await settle(clone.querySelector('void-card') as LitElement);
    expect(clone.querySelectorAll('dialog.void-dialog-panel').length).toBe(1);
    expect(clone.querySelectorAll('void-card').length).toBe(1);
    expect(clone.querySelectorAll('.void-card-header').length).toBe(1);
    expect(clone.querySelectorAll('#inner').length).toBe(1);
    expect(clone.querySelector('.void-dialog-body > void-card > .void-card-body > #inner')).not.toBeNull();
  });

  it('an outerHTML round-trip (cache snapshot / restore) renders once', async () => {
    const el = mount('<void-card heading="H"><p id="c">body</p></void-card>');
    await settle(el);
    const box = document.createElement('div');
    document.body.appendChild(box);
    box.innerHTML = el.outerHTML;
    const restored = box.firstElementChild as Host;
    await settle(restored);
    expect(restored.querySelectorAll('.void-card-header').length).toBe(1);
    expect(restored.querySelectorAll('.void-card-body').length).toBe(1);
    expect(ids(restored.querySelector('.void-card-body'))).toEqual(['c']);
  });
});

describe('textContent and replaceChildren on a rendered host', () => {
  it('textContent replaces only the dialog content, keeping the chrome', async () => {
    const el = mount('<void-dialog open heading="D">hello</void-dialog>');
    await settle(el);
    const panel = el.querySelector('dialog.void-dialog-panel');
    for (const text of ['world', 'again', 'third']) {
      el.textContent = text;
      await settle(el);
      expect(el.querySelector('dialog.void-dialog-panel')).toBe(panel);
      expect(el.querySelector('.void-dialog-body')!.textContent).toBe(text);
      expect(el.querySelector('.void-dialog-close')).not.toBeNull();
    }
    el.textContent = '';
    await settle(el);
    expect(el.querySelector('.void-dialog-body')!.childNodes.length).toBe(0);
    expect(el.querySelector('dialog.void-dialog-panel')).toBe(panel);
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
    const el = mount('<void-card heading="H"><p>body</p></void-card>');
    await settle(el);
    expect(el.textContent).toContain('H');
    expect(el.textContent).toContain('body');
  });

  it('replaceChildren replaces consumer content with nodes and strings', async () => {
    const el = mount('<void-dialog open><p>old</p></void-dialog>');
    await settle(el);
    const panel = el.querySelector('dialog.void-dialog-panel');
    const p = document.createElement('p');
    p.id = 'n';
    el.replaceChildren(p, 'tail');
    await settle(el);
    expect(el.querySelector('dialog.void-dialog-panel')).toBe(panel);
    const body = el.querySelector('.void-dialog-body')!;
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
    const el = mount('<void-card><p id="a">a</p><p id="b">b</p></void-card>');
    await settle(el);
    const x = document.createElement('p');
    x.id = 'x';
    el.prepend(x);
    await settle(el);
    expect(ids(el.querySelector('.void-card-body'))).toEqual(['x', 'a', 'b']);
    const y = document.createElement('p');
    y.id = 'y';
    el.insertBefore(y, el.firstChild);
    await settle(el);
    expect(ids(el.querySelector('.void-card-body'))).toEqual(['y', 'x', 'a', 'b']);
  });

  it('several prepended nodes keep their relative order', async () => {
    const el = mount('<void-card><p id="a">a</p></void-card>');
    await settle(el);
    const x = document.createElement('p');
    x.id = 'x';
    const y = document.createElement('p');
    y.id = 'y';
    el.prepend(x, y);
    await settle(el);
    expect(ids(el.querySelector('.void-card-body'))).toEqual(['x', 'y', 'a']);
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

  it('prepend puts a tab first', async () => {
    const el = mount('<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel></void-tabs>');
    await settle(el);
    const panel = document.createElement('void-tab-panel');
    panel.setAttribute('tab', 'z');
    panel.setAttribute('label', 'Z');
    el.prepend(panel);
    await settle(el);
    expect(Array.from(el.querySelectorAll('.void-tabs-tab')).map(b => b.textContent!.trim())).toEqual(['Z', 'A']);
  });
});

describe('trigger routing', () => {
  const panelItems = (el: Element) => Array.from(el.querySelectorAll('.void-dropdown-menu-panel > *')).map(c => c.id);

  it('slot="trigger" is the trigger even when it is not the first element', async () => {
    const el = mount('<void-dropdown-menu><void-dropdown-menu-item id="a">A</void-dropdown-menu-item><button id="t" slot="trigger">T</button></void-dropdown-menu>');
    await settle(el);
    expect(el.firstElementChild!.id).toBe('t');
    expect(panelItems(el)).toEqual(['a']);
    el.querySelector<HTMLElement>('#t')!.click();
    expect(el.open).toBe(true);
  });

  it('a slotted trigger re-inserted next to a panel item (React show/hide) becomes the trigger again', async () => {
    const el = mount('<void-dropdown-menu><button id="t" slot="trigger">T</button><void-dropdown-menu-item id="a">A</void-dropdown-menu-item></void-dropdown-menu>');
    await settle(el);
    const t = el.querySelector('#t')!;
    el.removeChild(t);
    await settle(el);
    const b = document.createElement('void-dropdown-menu-item');
    b.id = 'b';
    el.insertBefore(b, null);
    await settle(el);
    expect(panelItems(el)).toEqual(['a', 'b']);
    el.insertBefore(t, el.querySelector('#a'));
    await settle(el);
    expect(el.firstElementChild).toBe(t);
    expect(panelItems(el)).toEqual(['a', 'b']);
  });

  it('without a slot, an item added while the trigger is hidden does not become the trigger', async () => {
    const el = mount('<void-dropdown-menu><button id="t">T</button><void-dropdown-menu-item id="a">A</void-dropdown-menu-item></void-dropdown-menu>');
    await settle(el);
    el.removeChild(el.querySelector('#t')!);
    await settle(el);
    const b = document.createElement('void-dropdown-menu-item');
    b.id = 'b';
    el.appendChild(b);
    await settle(el);
    expect(panelItems(el)).toEqual(['a', 'b']);
    expect(el.firstElementChild?.classList.contains('void-dropdown-menu-panel')).toBe(true);
  });

  it('insertBefore(new, old) then removeChild(old) a tick later swaps the trigger', async () => {
    const el = mount('<void-dropdown-menu><button id="old">T</button><void-dropdown-menu-item id="a">A</void-dropdown-menu-item></void-dropdown-menu>');
    await settle(el);
    const old = el.querySelector('#old')!;
    const next = document.createElement('button');
    next.id = 'new';
    el.insertBefore(next, old);
    await settle(el);
    el.removeChild(old);
    await settle(el);
    expect(el.firstElementChild).toBe(next);
    expect(panelItems(el)).toEqual(['a']);
    next.click();
    expect(el.open).toBe(true);
  });

  it('a placeholder comment (Vue v-if) stays beside the trigger and the trigger comes back there', async () => {
    const el = mount('<void-popover><button id="t">T</button><span id="c">c</span></void-popover>');
    await settle(el);
    const t = el.querySelector('#t')!;
    // Vue: insert the <!--v-if--> placeholder where the trigger was, then remove the trigger.
    const anchor = document.createComment('v-if');
    el.insertBefore(anchor, t.nextSibling);
    el.removeChild(t);
    await settle(el);
    expect(el.firstChild).toBe(anchor);
    expect(el.querySelector('.void-popover-body')!.contains(anchor)).toBe(false);
    // Vue: insert the trigger before the placeholder's next sibling, then remove the placeholder.
    el.insertBefore(t, anchor.nextSibling);
    el.removeChild(anchor);
    await settle(el);
    expect(el.firstElementChild).toBe(t);
    (t as HTMLElement).click();
    expect(el.open).toBe(true);
  });

  it('the first element is still the trigger when children arrive after an early upgrade', async () => {
    const el = document.createElement('void-dropdown-menu') as Host;
    document.body.appendChild(el);
    await settle(el);
    const t = document.createElement('button');
    t.id = 't';
    el.appendChild(document.createTextNode('\n  '));
    el.appendChild(t);
    await settle(el);
    const item = document.createElement('void-dropdown-menu-item');
    item.id = 'a';
    el.appendChild(item);
    await settle(el);
    expect(el.firstElementChild).toBe(t);
    expect(panelItems(el)).toEqual(['a']);
  });
});
