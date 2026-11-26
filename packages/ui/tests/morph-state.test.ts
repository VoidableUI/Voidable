// @vitest-environment happy-dom
// The shared state rule of VoidElement.voidBeforeMorph (issue #61 review): a
// reflected attribute the server changed since its last render wins, anything
// else keeps the client's value; declared client state; groups re-applying
// state to their children; bounded restoring of owned attributes; the
// projection's wrap regions under direct DOM edits; text written into a marker.
// Real morphers, focus and moveBefore are covered by the Chromium probes.
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { VoidElement } from '../src/base.js';
import '../src/components/switch.js';
import '../src/components/button.js';
import '../src/components/toggle.js';
import '../src/components/toggle-group.js';
import '../src/components/segmented-control.js';
import '../src/components/radio-group.js';
import '../src/components/radio.js';
import '../src/components/sidebar.js';
import '../src/components/number-input.js';
import '../src/components/editable.js';
import '../src/components/tabs.js';
import '../src/components/select.js';
import '../src/components/breadcrumbs.js';
import '../src/components/alert.js';
import '../src/components/tag.js';
import '../src/components/field.js';
import '../src/components/input.js';
import '../src/components/popover.js';
import '../src/components/dialog.js';
import '../src/components/checkbox.js';

type Host = VoidElement & Record<string, unknown>;

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 0));
    await Promise.all(
      Array.from(document.querySelectorAll('*'))
        .map(e => (e as Partial<VoidElement>).updateComplete)
        .filter(Boolean)
    );
  }
}

async function mount<T = Host>(html: string): Promise<T> {
  const wrap = document.createElement('div');
  document.body.appendChild(wrap);
  wrap.innerHTML = html.trim();
  await settle();
  return wrap.firstElementChild as T;
}

function server(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

/** What a morpher does with the host's own attributes: make them equal to the incoming element's. */
function morphAttributes(live: Element, incoming: Element): void {
  for (const a of Array.from(live.attributes)) if (!incoming.hasAttribute(a.name)) live.removeAttribute(a.name);
  for (const a of Array.from(incoming.attributes)) if (live.getAttribute(a.name) !== a.value) live.setAttribute(a.name, a.value);
}

/** voidBeforeMorph followed by an attribute morph of the host, as Turbo, morphdom and Livewire do. */
async function morph(live: Host, html: string): Promise<Element> {
  const next = server(html);
  live.voidBeforeMorph(next);
  morphAttributes(live, next);
  await settle();
  return next;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.querySelectorAll('void-projection-park').forEach(p => p.remove());
  delete (globalThis as Record<symbol, unknown>)[Symbol.for('voidable.dev')];
});

describe('server baseline versus incoming', () => {
  it('keeps client state the server did not change, for any reflected property', async () => {
    const sb = await mount<Host>('<void-sidebar><div>s</div></void-sidebar>');
    sb.collapsed = true;
    const t = await mount<Host>('<void-toggle>Filter</void-toggle>');
    t.pressed = true;
    await settle();
    await morph(sb, '<void-sidebar><div>s</div></void-sidebar>');
    await morph(t, '<void-toggle>Filter</void-toggle>');
    expect(sb.collapsed).toBe(true);
    expect(t.pressed).toBe(true);
    expect(t.getAttribute('aria-pressed')).toBe('true');
  });

  it('lets the server win when it changed the attribute since its last render', async () => {
    const sw = await mount<Host>('<void-switch>N</void-switch>');
    await morph(sw, '<void-switch checked>N</void-switch>');
    expect(sw.checked).toBe(true);
    sw.checked = false;
    await settle();
    // Unchanged server value: the user's uncheck survives.
    await morph(sw, '<void-switch checked>N</void-switch>');
    expect(sw.checked).toBe(false);
    // The server drops it: that is a change, and its (absent) value wins.
    sw.checked = true;
    await settle();
    await morph(sw, '<void-switch>N</void-switch>');
    expect(sw.checked).toBe(false);
  });

  it('records the server value, not the copied client value, as the new baseline', async () => {
    const sb = await mount<Host>('<void-sidebar></void-sidebar>');
    sb.collapsed = true;
    await settle();
    const next = await morph(sb, '<void-sidebar></void-sidebar>');
    expect(next.hasAttribute('collapsed')).toBe(true);
    // The server still never rendered collapsed: a later morph keeps the client's value again.
    await morph(sb, '<void-sidebar></void-sidebar>');
    expect(sb.collapsed).toBe(true);
    await morph(sb, '<void-sidebar collapsed></void-sidebar>');
    sb.collapsed = false;
    await settle();
    await morph(sb, '<void-sidebar collapsed></void-sidebar>');
    expect(sb.collapsed).toBe(false);
  });
});

describe('declared client state', () => {
  it('keeps typed text through a re-render and a morph that leaves value alone', async () => {
    const num = await mount<Host>('<void-number-input value="3"></void-number-input>');
    const input = num.querySelector('input')!;
    input.value = '34';
    input.dispatchEvent(new Event('input'));
    num.requestUpdate();
    await settle();
    expect(input.value).toBe('34');
    await morph(num, '<void-number-input value="3"></void-number-input>');
    expect(num.querySelector('input')!.value).toBe('34');
  });

  it('drops typed text when the server changes the attribute it belongs to', async () => {
    const num = await mount<Host>('<void-number-input value="3"></void-number-input>');
    const input = num.querySelector('input')!;
    input.value = '34';
    input.dispatchEvent(new Event('input'));
    await morph(num, '<void-number-input value="7"></void-number-input>');
    expect(num.value).toBe(7);
    expect(num.querySelector('input')!.value).toBe('7');
  });

  it('keeps an editable draft and its editing state', async () => {
    const ed = await mount<Host>('<void-editable value="Note"></void-editable>');
    ed.click();
    await settle();
    const input = ed.querySelector('input')!;
    input.value = 'Draft';
    input.dispatchEvent(new Event('input'));
    await morph(ed, '<void-editable value="Note"></void-editable>');
    expect(ed.editing).toBe(true);
    expect(ed.querySelector('input')!.value).toBe('Draft');
  });
});

describe('groups re-apply their state to children after a morph', () => {
  it('toggle-group presses the toggle a morph replaced', async () => {
    const g = await mount<Host>('<void-toggle-group value="bold"><void-toggle value="bold">B</void-toggle><void-toggle value="italic">I</void-toggle></void-toggle-group>');
    const next = server(g.outerHTML.replace(/<!--[^]*?-->/g, ''));
    g.voidBeforeMorph(next);
    // The morpher replaced the first toggle with a fresh one from the server.
    const fresh = document.createElement('void-toggle');
    fresh.setAttribute('value', 'bold');
    g.firstElementChild!.replaceWith(fresh);
    await settle();
    expect((fresh as unknown as Host).pressed).toBe(true);
  });

  it('a toggle that connects after its group takes the group state', async () => {
    const g = await mount<Host>('<void-toggle-group value="italic"></void-toggle-group>');
    const t = document.createElement('void-toggle') as unknown as Host;
    t.setAttribute('value', 'italic');
    g.appendChild(t as unknown as Node);
    await settle();
    expect(t.pressed).toBe(true);
  });
});

describe('owned attributes are restored a bounded number of times', () => {
  it('gives up after repeated removals and reports it to the development warnings', async () => {
    const report = vi.fn();
    (globalThis as Record<symbol, unknown>)[Symbol.for('voidable.dev')] = { report };
    const btn = await mount<Host>('<void-button>Go</void-button>');
    let restored = 0;
    for (let i = 0; i < 50; i++) {
      btn.removeAttribute('role');
      await Promise.resolve();
      await Promise.resolve();
      if (btn.hasAttribute('role')) restored++;
    }
    expect(restored).toBe(10);
    expect(btn.hasAttribute('role')).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][0]).toMatchObject({ kind: 'attribute-fight', tag: 'void-button', subject: 'role' });
  });

  it('keeps restoring removals that are spread out in time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const btn = await mount<Host>('<void-button>Go</void-button>');
      for (let i = 0; i < 30; i++) {
        vi.setSystemTime(Date.now() + 200);
        btn.removeAttribute('role');
        await Promise.resolve();
        await Promise.resolve();
      }
      expect(btn.getAttribute('role')).toBe('button');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('tabs (explicit parts, #52)', () => {
  it('copies the generated ids and wiring onto the incoming parts; an id the server sends wins', async () => {
    const tabs = await mount<Host>('<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b" id="mine">b</void-tabs-content></void-tabs>');
    const [a, b] = Array.from(tabs.querySelectorAll('void-tabs-content'));
    const next = server('<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b" id="theirs">b</void-tabs-content></void-tabs>');
    tabs.voidBeforeMorph(next);
    const [na, nb] = Array.from(next.querySelectorAll('void-tabs-content'));
    expect(na!.id).toBe(a!.id);
    expect(na!.getAttribute('role')).toBe('tabpanel');
    expect(na!.hasAttribute('active')).toBe(true);
    expect(nb!.id).toBe('theirs');
    expect(b!.id).toBe('mine');
    const [nt] = Array.from(next.querySelectorAll('void-tabs-trigger'));
    expect(nt!.getAttribute('aria-selected')).toBe('true');
    expect(nt!.getAttribute('tabindex')).toBe('0');
  });

  it('selects the tab the value attribute names, else the first, when the selected tab is removed', async () => {
    const tabs = await mount<Host>('<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger><void-tabs-trigger value="c">C</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b">b</void-tabs-content><void-tabs-content value="c">c</void-tabs-content></void-tabs>');
    (tabs.querySelectorAll('[role=tab]')[2] as HTMLElement).click();
    await settle();
    expect(tabs.value).toBe('c');
    tabs.querySelector('void-tabs-trigger[value=c]')!.remove();
    tabs.querySelector('void-tabs-content[value=c]')!.remove();
    await settle();
    expect(tabs.value).toBe('a');
    expect(Array.from(tabs.querySelectorAll('[role=tab]')).map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
  });

  it('nested tab sets: each wires only its own parts', async () => {
    const tabs = await mount<Host>('<void-tabs value="x"><void-tabs-list><void-tabs-trigger value="x">X</void-tabs-trigger><void-tabs-trigger value="y">Y</void-tabs-trigger></void-tabs-list><void-tabs-content value="x"><void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">a</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content></void-tabs></void-tabs-content><void-tabs-content value="y">y</void-tabs-content></void-tabs>');
    await settle();
    const outer = Array.from(tabs.querySelectorAll(':scope > void-tabs-list [role=tab]')).map(t => t.textContent!.trim());
    expect(outer).toEqual(['X', 'Y']);
    const ids = Array.from(tabs.querySelectorAll('[id]')).map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const inner = tabs.querySelector('void-tabs void-tabs')!;
    expect(inner.querySelector('void-tabs-content')!.getAttribute('aria-labelledby')).toBe(inner.querySelector('void-tabs-trigger')!.id);
  });
});

describe('select', () => {
  const markup = (value: string, selected = '') =>
    `<void-select value="${value}"><select name="k"><option value="a">a</option><option value="b"${selected === 'b' ? ' selected' : ''}>b</option><option value="c">c</option></select></void-select>`;

  it('keeps the pick through a morph that does not change the selection, though the morpher resets the native one', async () => {
    const sel = await mount<Host>(markup('b'));
    const native = sel.querySelector('select')!;
    native.value = 'c';
    native.dispatchEvent(new Event('change'));
    sel.voidBeforeMorph(server(markup('b')));
    native.value = 'b'; // what a morph library syncing the options does
    await settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(sel.value).toBe('c');
    expect(native.value).toBe('c');
  });

  it('takes the server value when the server changed the value attribute', async () => {
    const sel = await mount<Host>(markup('b'));
    const native = sel.querySelector('select')!;
    native.value = 'c';
    native.dispatchEvent(new Event('change'));
    sel.voidBeforeMorph(server(markup('a')));
    sel.setAttribute('value', 'a'); // the morph applies the server attribute
    await settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(sel.value).toBe('a');
    expect(native.value).toBe('a');
  });
});

describe('keyed list edits (breadcrumbs, explicit parts)', () => {
  // The items are the author's own nodes in the trail itself: nothing wraps them, so every direct DOM edit a
  // framework makes leaves exactly the order it made.
  const items = (bc: Element) => Array.from(bc.children).map(c => c.textContent);
  const trail = (...t: string[]) => `<void-breadcrumbs><void-breadcrumbs-list>${t.map(x => `<void-breadcrumbs-item>${x}</void-breadcrumbs-item>`).join('')}</void-breadcrumbs-list></void-breadcrumbs>`;
  // The list part holds the items; every edit below is made on it, as a framework would.
  const mountTrail = async (...t: string[]) => (await mount<Host>(trail(...t))).firstElementChild as HTMLElement;
  const node = (t: string) => {
    const n = document.createElement('void-breadcrumbs-item');
    n.textContent = t;
    return n;
  };

  it('a reorder by appendChild (React) keeps the nodes and the order', async () => {
    const bc = await mountTrail('a', 'b', 'c');
    const [a, b] = Array.from(bc.children);
    bc.appendChild(a);
    bc.appendChild(b);
    await settle();
    expect(items(bc)).toEqual(['c', 'a', 'b']);
    expect(bc.children[1]).toBe(a);
  });

  it('a node inserted with before() (Svelte) and an insert before the next sibling (Solid)', async () => {
    const bc = await mountTrail('b', 'c');
    bc.children[1]!.before(node('x'));
    await settle();
    expect(items(bc)).toEqual(['b', 'x', 'c']);
    bc.insertBefore(node('y'), bc.children[0]!.nextSibling);
    await settle();
    expect(items(bc)).toEqual(['b', 'y', 'x', 'c']);
  });

  it('follows a Solid keyed swap and Svelte anchor moves', async () => {
    const bc = await mountTrail('a', 'x', 'b', 'y');
    const [a, x, b, y] = Array.from(bc.children) as HTMLElement[];
    // reconcileArrays: [a, x, b, y] -> [y, b, x, a]
    let ref = y!.nextSibling;
    bc.insertBefore(y!, a!.nextSibling);
    bc.insertBefore(a!, ref);
    ref = b!.nextSibling;
    bc.insertBefore(b!, x!.nextSibling);
    bc.insertBefore(x!, ref);
    await settle();
    expect(items(bc)).toEqual(['y', 'b', 'x', 'a']);

    const anchor = document.createTextNode('');
    bc.appendChild(anchor);
    // [y, b, x, a] -> [a, x, b, y]
    y!.before(a!);
    y!.before(x!);
    anchor.before(y!);
    await settle();
    expect(items(bc)).toEqual(['a', 'x', 'b', 'y']);
  });

  it('a replaced item keeps its position, and clearing leaves nothing behind', async () => {
    const bc = await mountTrail('a', 'b', 'c');
    bc.children[1]!.replaceWith(node('y'));
    await settle();
    expect(items(bc)).toEqual(['a', 'y', 'c']);
    bc.textContent = '';
    await settle();
    expect(bc.childNodes).toHaveLength(0);
  });

  it('gives items added later the listitem role and takes it off a removed one', async () => {
    const nav = await mount<Host>(trail('a', 'b'));
    const list = nav.firstElementChild!;
    expect(list.getAttribute('role')).toBe('list');
    const x = node('x');
    list.appendChild(x);
    await settle();
    expect(x.getAttribute('role')).toBe('listitem');
    list.removeChild(x);
    await settle();
    expect(x.hasAttribute('role')).toBe(false);
    expect(Array.from(list.children).map(c => c.getAttribute('role'))).toEqual(['listitem', 'listitem']);
  });
});

describe('text written into the start marker (Solid text-only children)', () => {
  it('is moved to the consumer text node', async () => {
    const tag = await mount<Host>('<void-tag>hello</void-tag>');
    const start = () => Array.from(tag.childNodes).find((n): n is Comment => n.nodeType === Node.COMMENT_NODE && /^void-projection/.test((n as Comment).data))!;
    expect(start()).toBeDefined();
    start().data = 'world';
    await settle();
    expect(tag.textContent).toContain('world');
    expect(tag.textContent).not.toContain('hello');
    expect(start().data).toBe('void-projection');
  });
});

describe('replaceChildren on an overlay (explicit parts, #52)', () => {
  it('wires the new parts and releases the old ones', async () => {
    const pop = await mount<Host>('<void-popover><void-popover-trigger><button id="t1">t</button></void-popover-trigger><void-popover-content><div>body</div></void-popover-content></void-popover>');
    const t1 = pop.querySelector('#t1')!;
    const trigger = document.createElement('void-popover-trigger');
    trigger.innerHTML = '<button id="t2">t</button>';
    const content = document.createElement('void-popover-content');
    content.textContent = 'new body';
    pop.replaceChildren(trigger, content);
    await settle();
    expect(pop.querySelector('#t2')!.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('role')).toBe('dialog');
    expect(t1.hasAttribute('aria-controls')).toBe(false);
  });
});

describe('field', () => {
  it('puts back the control\'s own aria-invalid once the error is removed', async () => {
    const field = await mount<Host>('<void-field label="Email"><void-input name="e"></void-input></void-field>');
    const input = () => field.querySelector('input')!;
    const before = input().getAttribute('aria-invalid');
    field.setAttribute('error', 'Invalid');
    await settle();
    expect(input().getAttribute('aria-invalid')).toBe('true');
    field.removeAttribute('error');
    await settle();
    expect(input().getAttribute('aria-invalid')).toBe(before);
  });
});

describe('reset default follows the server', () => {
  it('a value the server changed becomes what form.reset() restores', async () => {
    const form = await mount<HTMLFormElement>('<form><void-number-input name="q" value="3"></void-number-input></form>');
    const n = form.querySelector('void-number-input') as Host;
    await morph(n, '<void-number-input name="q" value="5"></void-number-input>');
    expect(n.value).toBe(5);
    n.value = 9;
    await settle();
    form.reset();
    await settle();
    expect(n.value).toBe(5);
  });

  it('a value the client changed does not', async () => {
    const form = await mount<HTMLFormElement>('<form><void-number-input name="q" value="3"></void-number-input></form>');
    const n = form.querySelector('void-number-input') as Host;
    n.value = 9;
    await settle();
    await morph(n, '<void-number-input name="q" value="3"></void-number-input>');
    expect(n.value).toBe(9);
    form.reset();
    await settle();
    expect(n.value).toBe(3);
  });
});

describe('appending to a rendered host (Solid keyed lists)', () => {
  it('an option inserted before null is in place at once, so later nextSibling reads are right', async () => {
    const host = await mount<Host>('<void-select><select name="s"><option value="a">a</option><option value="x">x</option><option value="b">b</option><option value="y">y</option></select></void-select>');
    // The options are children of the author's <select> (#52), which is their parent for Solid too.
    const sel = host.querySelector('select')!;
    const [a, x, b, y] = Array.from(sel.querySelectorAll('option'));
    // reconcileArrays: [a, x, b, y] -> [y, b, x, a]
    let node = y.nextSibling;
    sel.insertBefore(y, a.nextSibling);
    sel.insertBefore(a, node);
    node = b.nextSibling;
    sel.insertBefore(b, x.nextSibling);
    sel.insertBefore(x, node);
    await settle();
    expect(Array.from(sel.querySelectorAll('option')).map(o => o.value)).toEqual(['y', 'b', 'x', 'a']);
  });
});

describe('overlay open state (what the Livewire hook hands to the morph)', () => {
  it('keeps a dialog the user opened open through a re-render that does not mention it', async () => {
    const live = await mount<Host>('<void-dialog><void-dialog-title>D</void-dialog-title><void-dialog-body>x</void-dialog-body></void-dialog>');
    live.setAttribute('open', '');
    await settle();
    const toEl = server('<void-dialog><void-dialog-title>D</void-dialog-title><void-dialog-body>x</void-dialog-body></void-dialog>');
    live.voidBeforeMorph(toEl);
    expect(toEl.hasAttribute('open')).toBe(true);
  });

  it('closes it when the server stops rendering open (server wins)', async () => {
    const live = await mount<Host>('<void-dialog open><void-dialog-title>D</void-dialog-title><void-dialog-body>x</void-dialog-body></void-dialog>');
    const toEl = server('<void-dialog><void-dialog-title>D</void-dialog-title><void-dialog-body>x</void-dialog-body></void-dialog>');
    live.voidBeforeMorph(toEl);
    expect(toEl.hasAttribute('open')).toBe(false);
  });

  it('opens it when the server starts rendering open, and keeps a user close while the server repeats itself', async () => {
    const live = await mount<Host>('<void-dialog><void-dialog-title>D</void-dialog-title><void-dialog-body>x</void-dialog-body></void-dialog>');
    const first = await morph(live, '<void-dialog open><void-dialog-title>D</void-dialog-title><void-dialog-body>x</void-dialog-body></void-dialog>');
    expect(first.hasAttribute('open')).toBe(true);
    expect(live.hasAttribute('open')).toBe(true);
    live.removeAttribute('open'); // the user closed it
    await settle();
    const again = server('<void-dialog open><void-dialog-title>D</void-dialog-title><void-dialog-body>x</void-dialog-body></void-dialog>');
    live.voidBeforeMorph(again);
    expect(again.hasAttribute('open')).toBe(false);
  });
});

describe('tabs under LiveView placeholders', () => {
  it('gives an unchanged panel sent as a data-phx-skip placeholder its generated id, paired by data-phx-id', async () => {
    const tabs = await mount<Host>('<void-tabs><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a" data-phx-id="m1">A</void-tabs-content><void-tabs-content value="b" data-phx-id="m2">B</void-tabs-content></void-tabs>');
    const live = Array.from(tabs.querySelectorAll('void-tabs-content')).map(p => p.id);
    expect(live.every(Boolean)).toBe(true);
    const next = server('<void-tabs value="b"><void-tabs-list><void-tabs-trigger></void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content data-phx-skip data-phx-id="m1"></void-tabs-content><void-tabs-content value="b" data-phx-id="m2">B!</void-tabs-content></void-tabs>');
    tabs.voidBeforeMorph(next);
    expect(Array.from(next.querySelectorAll('void-tabs-content')).map(p => p.id)).toEqual(live);
  });
});

describe('morphs that arrive while the element is parked, or that hand over a copy of a rendered element', () => {
  it('a second voidBeforeMorph before re-projection applies the rule to the new incoming element and stays parked', async () => {
    const sw = await mount('<void-switch>News</void-switch>');
    const first = server('<void-switch>News</void-switch>');
    expect(sw.voidBeforeMorph(first)).toBe(true);
    // The server changed `checked` in the second patch of the same task: it wins.
    const second = server('<void-switch checked>News</void-switch>');
    expect(sw.voidBeforeMorph(second)).toBe(true);
    morphAttributes(sw, second);
    await settle();
    expect(sw.checked).toBe(true);
    expect(sw.querySelectorAll('.void-switch-track').length).toBeLessThanOrEqual(1);
  });

  it('a detached clone of a rendered element is put back into its server shape and carries no server change', async () => {
    const field = await mount('<void-field label="Name"><void-input name="n"></void-input></void-field>');
    const input = field.querySelector('void-input') as Host;
    input.value = 'typed';
    await settle();
    // LiveView clones a locked element with everything it rendered, patches the clone and later morphs the live element to it.
    const clone = field.cloneNode(true) as Host;
    expect(clone.querySelector('[data-void-chrome]')).not.toBeNull();
    field.voidBeforeMorph(clone);
    expect(Array.from(clone.childNodes).some(n => n.nodeType === Node.COMMENT_NODE && (n as Comment).data.includes('void-projection'))).toBe(false);
    expect(clone.querySelector(':scope > [data-void-chrome]')).toBeNull();
    expect(clone.querySelector(':scope > void-input')).not.toBeNull();
    await settle();
    expect(field.querySelectorAll('void-input').length).toBe(1);
    expect((field.querySelector('void-input') as Host).value).toBe('typed');
  });

  it('a copy that carries client state does not make it the server baseline', async () => {
    const dlg = await mount('<void-dialog><void-dialog-title>D</void-dialog-title><void-dialog-body>Body</void-dialog-body></void-dialog>');
    dlg.open = true;
    await settle();
    const clone = dlg.cloneNode(true) as Element;
    dlg.voidBeforeMorph(clone);
    morphAttributes(dlg, clone);
    await settle();
    expect(dlg.open).toBe(true);
    // The server still renders no `open`: unchanged, so the user's open dialog stays open.
    const again = server('<void-dialog><void-dialog-title>D</void-dialog-title><void-dialog-body>Body</void-dialog-body></void-dialog>');
    dlg.voidBeforeMorph(again);
    morphAttributes(dlg, again);
    await settle();
    expect(dlg.open).toBe(true);
    dlg.open = false;
    await settle();
  });
});

describe('a server value of what the user is editing waits while focus is inside (editState)', () => {
  it('keeps the typed text when the echo of an older keystroke arrives, and applies a server change after focus left', async () => {
    const el = await mount<Host>('<void-input value="ab"></void-input>');
    const control = el.querySelector('input')!;
    control.focus();
    control.value = 'abcd';
    control.dispatchEvent(new Event('input', { bubbles: true }));
    const echo = server('<void-input value="abc"></void-input>');
    el.voidBeforeMorph(echo);
    morphAttributes(el, echo);
    await settle();
    expect(control.value).toBe('abcd');
    expect(el.value).toBe('abcd');
    control.blur();
    const later = server('<void-input value="from the server"></void-input>');
    el.voidBeforeMorph(later);
    morphAttributes(el, later);
    await settle();
    expect(el.value).toBe('from the server');
  });
});

describe('boolean ARIA the server turns off', () => {
  for (const tag of ['void-switch', 'void-checkbox', 'void-radio', 'void-button', 'void-toggle', 'void-number-input']) {
    it(`${tag} drops aria-disabled when a morph re-enables it, rather than leaving "false"`, async () => {
      const el = await mount<Host>(`<${tag} disabled name="n">X</${tag}>`);
      const enabled = server(`<${tag} name="n">X</${tag}>`);
      el.voidBeforeMorph(enabled);
      morphAttributes(el, enabled);
      await settle();
      expect(el.disabled).toBe(false);
      expect(el.hasAttribute('aria-disabled')).toBe(false);
    });
  }
});
