// @vitest-environment happy-dom
// PartsController (#52): lookup, owned attributes (set / provide / token),
// release, the per-sync sweep and the morph handover, on a minimal host.
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../src/base.js';
import { PartsController, triggerControl } from '../src/parts.js';

class TestHost extends VoidElement {
  wires = 0;
  readonly parts = new PartsController(this, {
    tags: ['x-host-trigger', 'x-host-content', 'x-host-item'],
    onChange: () => this.wire(),
  });

  wire(): void {
    this.wires++;
    const content = this.parts.one('x-host-content');
    const control = triggerControl(this.parts.one('x-host-trigger'));
    for (const item of this.parts.all('x-host-item')) this.parts.set(item, 'role', 'option');
    if (!content) return;
    this.parts.set(content, 'role', 'listbox');
    const id = this.parts.id(content, 'x-host');
    if (control) {
      this.parts.set(control, 'aria-controls', id);
      this.parts.token(control, 'aria-describedby', id);
    }
  }
}
customElements.define('x-host', TestHost);

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount(html: string): Promise<TestHost> {
  document.body.innerHTML = html;
  const el = document.querySelector('x-host') as TestHost;
  await el.updateComplete;
  await tick();
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PartsController', () => {
  it('finds its own parts and not those of a nested host of the same tag', async () => {
    const el = await mount('<x-host><x-host-item id="a"></x-host-item><x-host><x-host-item id="b"></x-host-item></x-host></x-host>');
    expect(el.parts.all('x-host-item').map((i) => i.id)).toEqual(['a']);
    expect(el.querySelector('#b')!.getAttribute('role')).toBe('option');
  });

  it('generates an id only when there is none, and never replaces a server id', async () => {
    const el = await mount('<x-host><x-host-trigger><button></button></x-host-trigger><x-host-content></x-host-content></x-host>');
    const content = el.querySelector('x-host-content')!;
    expect(content.id).toMatch(/^x-host-/);
    const generated = content.id;
    el.parts.sync();
    expect(content.id).toBe(generated);
    const other = await mount('<x-host><x-host-trigger><button></button></x-host-trigger><x-host-content id="srv"></x-host-content></x-host>');
    expect(other.querySelector('x-host-content')!.id).toBe('srv');
    expect(other.querySelector('button')!.getAttribute('aria-controls')).toBe('srv');
  });

  it('adds its token to a list attribute, keeping the others', async () => {
    const el = await mount('<x-host><x-host-trigger><button aria-describedby="help"></button></x-host-trigger><x-host-content id="c"></x-host-content></x-host>');
    expect(el.querySelector('button')!.getAttribute('aria-describedby')).toBe('help c');
  });

  it('releases what it wrote on an element that stops being its part', async () => {
    const el = await mount('<x-host><x-host-item></x-host-item><x-host-content></x-host-content></x-host>');
    const item = el.querySelector('x-host-item')!;
    const content = el.querySelector('x-host-content')!;
    document.body.append(item, content);
    await tick();
    expect(item.hasAttribute('role')).toBe(false);
    expect(content.hasAttribute('role')).toBe(false);
    expect(content.hasAttribute('id')).toBe(false);
  });

  it('sweeps what an earlier sync wired and this one did not (a control swapped inside the trigger)', async () => {
    const el = await mount('<x-host><x-host-trigger><button id="one"></button></x-host-trigger><x-host-content id="c"></x-host-content></x-host>');
    const one = el.querySelector('#one')!;
    const two = document.createElement('button');
    one.before(two);
    await tick();
    expect(two.getAttribute('aria-controls')).toBe('c');
    expect(one.hasAttribute('aria-controls')).toBe(false);
    expect(one.hasAttribute('aria-describedby')).toBe(false);
  });

  it('puts back an owned attribute someone else changed', async () => {
    const el = await mount('<x-host><x-host-content></x-host-content></x-host>');
    const content = el.querySelector('x-host-content')!;
    content.setAttribute('role', 'presentation');
    await tick();
    expect(content.getAttribute('role')).toBe('listbox');
  });

  it('settles: its own writes do not make it sync again', async () => {
    const el = await mount('<x-host><x-host-trigger><button></button></x-host-trigger><x-host-content></x-host-content></x-host>');
    const before = el.wires;
    await tick();
    await tick();
    expect(el.wires).toBe(before);
  });

  it('copies what it owns onto the server markup before a morph, matched by place', async () => {
    const el = await mount('<x-host><x-host-trigger><button></button></x-host-trigger><x-host-content></x-host-content></x-host>');
    const content = el.querySelector('x-host-content')!;
    const incoming = document.createElement('x-host');
    incoming.innerHTML = '<x-host-trigger><button aria-describedby="new"></button></x-host-trigger><x-host-content></x-host-content>';
    el.voidBeforeMorph(incoming);
    const next = incoming.querySelector('x-host-content')!;
    expect(next.id).toBe(content.id);
    expect(next.getAttribute('role')).toBe('listbox');
    expect(incoming.querySelector('button')!.getAttribute('aria-describedby')).toBe(`new ${content.id}`);
  });

  it('triggerControl is the first element child of the trigger part', () => {
    const t = document.createElement('x-host-trigger');
    expect(triggerControl(t)).toBeNull();
    t.innerHTML = 'text <a></a><b></b>';
    expect(triggerControl(t)!.localName).toBe('a');
    expect(triggerControl(null)).toBeNull();
  });
});
