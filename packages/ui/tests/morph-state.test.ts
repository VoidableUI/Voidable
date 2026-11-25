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
import '../src/components/field.js';
import '../src/components/input.js';
import '../src/components/popover.js';

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

describe('tabs', () => {
  it('copies only generated ids onto incoming panels; an id the server sends wins', async () => {
    const tabs = await mount<Host>('<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel><void-tab-panel tab="b" label="B" id="mine">b</void-tab-panel></void-tabs>');
    const [a] = Array.from(tabs.querySelectorAll('void-tab-panel'));
    const next = server('<void-tabs value="a"><void-tab-panel tab="a" label="A" id="mine">a</void-tab-panel><void-tab-panel tab="b" label="B">b</void-tab-panel></void-tabs>');
    tabs.voidBeforeMorph(next);
    expect(Array.from(next.children).map(p => p.getAttribute('id'))).toEqual(['mine', null]);
    const fresh = server('<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel></void-tabs>');
    await settle();
    tabs.voidBeforeMorph(fresh);
    expect(fresh.firstElementChild!.id).toBe(a.id);
  });

  it('selects the panel the value attribute names, else the first, when the selected panel is removed', async () => {
    const tabs = await mount<Host>('<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel><void-tab-panel tab="b" label="B">b</void-tab-panel><void-tab-panel tab="c" label="C">c</void-tab-panel></void-tabs>');
    (tabs.querySelectorAll('[role=tab]')[2] as HTMLElement).click();
    await settle();
    expect(tabs.value).toBe('c');
    tabs.querySelector('void-tab-panel[tab=c]')!.remove();
    await settle();
    expect(tabs.value).toBe('a');
    expect(Array.from(tabs.querySelectorAll('[role=tab]')).map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
  });

  it('nested tab sets: each lists only its own panels', async () => {
    const tabs = await mount<Host>('<void-tabs value="x"><void-tab-panel tab="x" label="X"><void-tabs value="a"><void-tab-panel tab="a" label="a">a</void-tab-panel></void-tabs></void-tab-panel><void-tab-panel tab="y" label="Y">y</void-tab-panel></void-tabs>');
    const outer = Array.from(tabs.querySelectorAll(':scope > .void-tabs-list [role=tab]')).map(t => t.textContent!.trim());
    expect(outer).toEqual(['X', 'Y']);
    const ids = Array.from(tabs.querySelectorAll('[id]')).map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('select', () => {
  it('falls back to the value attribute when the picked option is removed', async () => {
    const sel = await mount<Host>('<void-select name="k" value="b"><option value="a">a</option><option value="b">b</option><option value="c">c</option></void-select>');
    const native = sel.querySelector('select')!;
    native.value = 'c';
    native.dispatchEvent(new Event('change'));
    await settle();
    expect(sel.value).toBe('c');
    sel.voidBeforeMorph(server('<void-select name="k" value="b"><option value="a">a</option><option value="b">b</option></void-select>'));
    sel.querySelector('option[value=c]')!.remove();
    await settle();
    expect(sel.value).toBe('b');
    expect(sel.querySelector('select')!.value).toBe('b');
  });
});

describe('wrap regions under direct DOM edits (breadcrumbs)', () => {
  const items = (bc: Element) => Array.from(bc.querySelectorAll('li')).map(li => li.textContent);

  it('a reorder by appendChild (React) follows the nodes, not their old list items', async () => {
    const bc = await mount<Host>('<void-breadcrumbs><a>a</a><a>b</a><a>c</a></void-breadcrumbs>');
    const [a, b] = Array.from(bc.querySelectorAll('a'));
    bc.appendChild(a);
    bc.appendChild(b);
    await settle();
    expect(items(bc)).toEqual(['c', 'a', 'b']);
  });

  it('a node inserted with before() next to an item gets a list item of its own (Svelte)', async () => {
    const bc = await mount<Host>('<void-breadcrumbs><a>b</a><a>c</a></void-breadcrumbs>');
    const c = bc.querySelectorAll('a')[1];
    const x = document.createElement('a');
    x.textContent = 'x';
    c.before(x);
    await settle();
    expect(items(bc)).toEqual(['b', 'x', 'c']);
    bc.textContent = '';
    await settle();
    expect(bc.querySelectorAll('li')).toHaveLength(0);
  });

  it('an insert before the next sibling of an item lands right after it (Solid)', async () => {
    const bc = await mount<Host>('<void-breadcrumbs><a>b</a><a>c</a></void-breadcrumbs>');
    const b = bc.querySelector('a')!;
    const x = document.createElement('a');
    x.textContent = 'x';
    bc.insertBefore(x, b.nextSibling);
    await settle();
    expect(items(bc)).toEqual(['b', 'x', 'c']);
  });

  it('follows a Solid keyed swap (nextSibling read before two moves)', async () => {
    const bc = await mount<Host>('<void-breadcrumbs><a>a</a><a>x</a><a>b</a><a>y</a></void-breadcrumbs>');
    const [a, x, b, y] = Array.from(bc.querySelectorAll('a'));
    // reconcileArrays: [a, x, b, y] -> [y, b, x, a]
    let node = y.nextSibling;
    bc.insertBefore(y, a.nextSibling);
    bc.insertBefore(a, node);
    node = b.nextSibling;
    bc.insertBefore(b, x.nextSibling);
    bc.insertBefore(x, node);
    await settle();
    expect(items(bc)).toEqual(['y', 'b', 'x', 'a']);
  });

  it('keeps the order of a run of items inserted before one reference (Solid)', async () => {
    const bc = await mount<Host>('<void-breadcrumbs><a>a</a><a>h</a><a>d</a></void-breadcrumbs>');
    const h = bc.querySelectorAll('a')[1];
    const node = h.nextSibling;
    for (const t of ['c', 'b']) {
      const n = document.createElement('a');
      n.textContent = t;
      bc.insertBefore(n, node);
    }
    await settle();
    expect(items(bc)).toEqual(['a', 'h', 'c', 'b', 'd']);
  });

  it('follows Svelte moves with anchor.before()', async () => {
    const bc = await mount<Host>('<void-breadcrumbs><a>a</a><a>x</a><a>b</a><a>y</a></void-breadcrumbs>');
    const anchor = document.createTextNode('');
    bc.appendChild(anchor);
    await settle();
    const [a, , b, y] = Array.from(bc.querySelectorAll('a'));
    // [a, x, b, y] -> [y, b, x, a]
    a.before(y);
    a.before(b);
    anchor.before(a);
    await settle();
    expect(items(bc)).toEqual(['y', 'b', 'x', 'a']);
  });

  it('a replaced item keeps its position', async () => {
    const bc = await mount<Host>('<void-breadcrumbs><a>a</a><a>b</a><a>c</a></void-breadcrumbs>');
    const y = document.createElement('a');
    y.textContent = 'y';
    bc.querySelectorAll('a')[1].replaceWith(y);
    await settle();
    expect(items(bc)).toEqual(['a', 'y', 'c']);
  });
});

describe('text written into the start marker (Solid text-only children)', () => {
  it('is moved to the consumer text node', async () => {
    const alert = await mount<Host>('<void-alert>hello</void-alert>');
    expect(alert.firstChild!.nodeType).toBe(Node.COMMENT_NODE);
    (alert.firstChild as CharacterData).data = 'world';
    await settle();
    expect(alert.textContent).toContain('world');
    expect(alert.textContent).not.toContain('hello');
    expect((alert.firstChild as Comment).data).toBe('void-projection');
  });
});

describe('replaceChildren on an overlay', () => {
  it('routes the first unslotted element to the trigger, as a fresh render does', async () => {
    const pop = await mount<Host>('<void-popover><button id="t1">t</button><div>body</div></void-popover>');
    const t2 = document.createElement('button');
    t2.id = 't2';
    const body = document.createElement('div');
    body.textContent = 'new body';
    pop.replaceChildren(t2, body);
    await settle();
    expect(pop.querySelector('.void-popover-body #t2')).toBeNull();
    expect(pop.querySelector('.void-popover-body')!.textContent).toBe('new body');
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
    const sel = await mount<Host>('<void-select name="s"><option value="a">a</option><option value="x">x</option><option value="b">b</option><option value="y">y</option></void-select>');
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
