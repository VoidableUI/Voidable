// @vitest-environment happy-dom
// Morph and clone safety of every VoidElement (issue #61): confined chrome for
// components without regions, owned host attributes, reflected defaults,
// recovery and clone clean-up. Focus, caret and typed-text survival, real
// morphers (idiomorph, morphdom, Alpine morph) and moveBefore are covered by the
// Chromium probes only.
import { describe, it, expect, afterEach } from 'vitest';
import type { VoidElement } from '../src/base.js';
import '../src/components/switch.js';
import '../src/components/button.js';
import '../src/components/avatar.js';
import '../src/components/input.js';
import '../src/components/field.js';
import '../src/components/breadcrumbs.js';
import '../src/components/nav-menu.js';
import '../src/components/nav-bar.js';
import '../src/components/sidebar.js';
import '../src/components/indicator.js';
import '../src/components/tooltip.js';
import '../src/components/segmented-control.js';
import '../src/components/tabs.js';

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

/** Markup without comments (markers), as a server would render it. */
const serverShape = (el: Element) => el.innerHTML.replace(/<!--[^]*?-->/g, '');

function server(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.querySelectorAll('void-projection-park').forEach(p => p.remove());
});

describe('chrome of components without regions', () => {
  it('parks and restores the same chrome nodes around a morph', async () => {
    const sw = await mount('<void-switch name="n">Label</void-switch>');
    const track = sw.querySelector('.void-switch-track');
    expect(track).not.toBeNull();
    expect(sw.voidBeforeMorph()).toBe(true);
    expect(serverShape(sw)).toBe('Label');
    await settle();
    expect(sw.querySelector('.void-switch-track')).toBe(track);
    expect(sw.querySelectorAll('.void-switch-track')).toHaveLength(1);
    // Consumer content first, then the chrome, as with a plain Lit render.
    expect(sw.firstChild?.textContent).toBe('Label');
  });

  it('keeps the native input (and its typed value) of a void-input', async () => {
    const el = await mount<Host>('<void-input name="email"></void-input>');
    const input = el.querySelector('input')!;
    input.value = 'typed';
    input.dispatchEvent(new Event('input'));
    el.voidBeforeMorph(server('<void-input name="email"></void-input>'));
    expect(el.querySelector('input')).toBeNull();
    await settle();
    expect(el.querySelector('input')).toBe(input);
    expect(input.value).toBe('typed');
  });

  it('returns false for a component that renders nothing of its own', async () => {
    const btn = await mount<Host>('<void-button>Go</void-button>');
    expect(btn.voidBeforeMorph()).toBe(false);
    expect(btn.textContent).toBe('Go');
  });

  it('re-renders chrome that was removed without the hook', async () => {
    const sw = await mount<Host>('<void-switch>Label</void-switch>');
    sw.querySelector('.void-switch-track')!.remove();
    await settle();
    expect(sw.querySelectorAll('.void-switch-track')).toHaveLength(1);
    sw.innerHTML = 'New label';
    await settle();
    expect(sw.querySelectorAll('.void-switch-track')).toHaveLength(1);
    expect(sw.textContent).toContain('New label');
  });

  it('renders exactly one set of chrome for a clone or outerHTML copy of a rendered host', async () => {
    const av = await mount<Host>('<void-avatar initials="AL"></void-avatar>');
    const clone = av.cloneNode(true) as Host;
    document.body.appendChild(clone);
    const wrap = document.createElement('div');
    wrap.innerHTML = av.outerHTML;
    document.body.appendChild(wrap);
    await settle();
    for (const el of [clone, wrap.firstElementChild as Host]) {
      expect(el.querySelectorAll('.void-avatar-initials')).toHaveLength(1);
      expect(el.textContent!.trim()).toBe('AL');
    }
  });

  it('cleans up a cloned field with a nested input: one label, one native input', async () => {
    const form = await mount<HTMLFormElement>('<form><void-field label="Name"><void-input name="user[name]"></void-input></void-field></form>');
    const copy = form.cloneNode(true) as HTMLFormElement;
    document.body.appendChild(copy);
    await settle();
    expect(copy.querySelectorAll('.void-field-label')).toHaveLength(1);
    expect(copy.querySelectorAll('input')).toHaveLength(1);
    expect(copy.querySelector('.void-field-control > void-input')).not.toBeNull();
  });

  it('confines imperatively built components too (indicator dot, nav-menu item, tooltip bubble)', async () => {
    const ind = await mount<Host>('<void-indicator count="3"><span>x</span></void-indicator>');
    const dot = ind.querySelector('.void-indicator-dot');
    ind.voidBeforeMorph();
    expect(serverShape(ind)).toBe('<span>x</span>');
    await settle();
    expect(ind.querySelector('.void-indicator-dot')).toBe(dot);

    // The nav-menu item has explicit parts (#52): the author's nodes are the DOM, and a morph that strips the
    // ARIA on the trigger control (consumer markup) gets it back.
    const item = await mount<Host>('<void-nav-menu-item><void-nav-menu-trigger><button id="b">Products</button></void-nav-menu-trigger><void-nav-menu-content><div id="c">x</div></void-nav-menu-content></void-nav-menu-item>');
    const trigger = item.querySelector('#b')!;
    item.voidBeforeMorph();
    expect(Array.from(item.children).map(c => c.localName)).toEqual(['void-nav-menu-trigger', 'void-nav-menu-content']);
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    trigger.removeAttribute('aria-haspopup');
    await settle();
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');

    // The tooltip has explicit parts (#52): nothing to confine; a morph that
    // strips the control's aria-describedby (consumer markup) gets it back.
    const tip = await mount<Host>('<void-tooltip><void-tooltip-trigger><button id="b">b</button></void-tooltip-trigger><void-tooltip-content>t</void-tooltip-content></void-tooltip>');
    tip.voidBeforeMorph();
    expect(Array.from(tip.children).map(c => c.localName)).toEqual(['void-tooltip-trigger', 'void-tooltip-content']);
    tip.querySelector('#b')!.removeAttribute('aria-describedby');
    await settle();
    expect(tip.querySelector('#b')!.getAttribute('aria-describedby')).toBe(tip.querySelector('void-tooltip-content')!.id);
  });

  it('breadcrumbs have explicit parts (#52): the items are the author nodes, nothing is lifted or wrapped', async () => {
    const bc = await mount<Host>('<void-breadcrumbs><void-breadcrumbs-item><a href="/">a</a></void-breadcrumbs-item><void-breadcrumbs-item aria-current="page">b</void-breadcrumbs-item></void-breadcrumbs>');
    const items = Array.from(bc.children);
    bc.voidBeforeMorph();
    expect(serverShape(bc)).toBe('<void-breadcrumbs-item><a href="/">a</a></void-breadcrumbs-item><void-breadcrumbs-item aria-current="page">b</void-breadcrumbs-item>');
    await settle();
    expect(Array.from(bc.children)).toEqual(items);
    expect(bc.querySelector('li')).toBeNull();
  });
});

describe('owned host attributes', () => {
  it('carries role, tabindex and aria-* onto the incoming element, but never over a server value', async () => {
    const sw = await mount<Host>('<void-switch name="n">N</void-switch>');
    const next = server('<void-switch name="n" tabindex="-1">N</void-switch>');
    sw.voidBeforeMorph(next);
    expect(next.getAttribute('role')).toBe('switch');
    expect(next.getAttribute('aria-checked')).toBe('false');
    // The server's own value wins.
    expect(next.getAttribute('tabindex')).toBe('-1');
  });

  it('carries reflected defaults and client-changed reflected state the server did not change', async () => {
    const sw = await mount<Host>('<void-switch>N</void-switch>');
    sw.checked = true;
    await settle();
    const next = server('<void-switch>N</void-switch>');
    sw.voidBeforeMorph(next);
    expect(next.getAttribute('size')).toBe('md');
    expect(next.getAttribute('color')).toBe('default');
    expect(next.hasAttribute('checked')).toBe(true);
  });

  it('puts an owned attribute back when something else removes it', async () => {
    const btn = await mount<Host>('<void-button>Go</void-button>');
    btn.removeAttribute('role');
    btn.removeAttribute('tabindex');
    expect(btn.hasAttribute('role')).toBe(false);
    await Promise.resolve();
    expect(btn.getAttribute('role')).toBe('button');
    expect(btn.getAttribute('tabindex')).toBe('0');
  });

  it('leaves a different value written by someone else alone', async () => {
    const btn = await mount<Host>('<void-button>Go</void-button>');
    btn.setAttribute('role', 'link');
    await settle();
    expect(btn.getAttribute('role')).toBe('link');
  });

  it('keeps owned style custom properties when the style attribute is replaced', async () => {
    const sb = await mount<Host>('<void-sidebar width="300px"><div>s</div></void-sidebar>');
    const value = sb.style.getPropertyValue('--void-sidebar-width');
    expect(value).not.toBe('');
    sb.setAttribute('style', 'color: red');
    await Promise.resolve();
    expect(sb.style.getPropertyValue('--void-sidebar-width')).toBe(value);
    expect(sb.style.getPropertyValue('color')).toBe('red');
  });

  it('a child item owns the state its group gives it (segmented control aria-checked)', async () => {
    const sc = await mount<Host>('<void-segmented-control value="b"><void-segmented-control-item value="a">A</void-segmented-control-item><void-segmented-control-item value="b">B</void-segmented-control-item></void-segmented-control>');
    const [a, b] = Array.from(sc.children);
    expect([a.getAttribute('aria-checked'), b.getAttribute('aria-checked')]).toEqual(['false', 'true']);
    b.removeAttribute('aria-checked');
    await Promise.resolve();
    expect(b.getAttribute('aria-checked')).toBe('true');
  });
});

describe('reflected attributes removed from outside', () => {
  it('return the property to its default instead of null', async () => {
    const btn = await mount<Host>('<void-button size="lg" variant="filled">Go</void-button>');
    btn.removeAttribute('size');
    btn.removeAttribute('variant');
    await settle();
    expect(btn.size).toBe('md');
    expect(btn.variant).toBe('outline');
    expect(btn.getAttribute('size')).toBe('md');
  });

  it('a boolean that defaults to true stays true', async () => {
    const nb = await mount<Host>('<void-nav-bar><a href="#">a</a></void-nav-bar>');
    expect(nb.bordered).toBe(true);
    nb.removeAttribute('bordered');
    await settle();
    expect(nb.bordered).toBe(true);
  });

  it('is not triggered by the component reflecting a property it set itself', async () => {
    const btn = await mount<Host>('<void-button>Go</void-button>');
    btn.disabled = true;
    await settle();
    btn.disabled = false;
    await settle();
    expect(btn.disabled).toBe(false);
    expect(btn.hasAttribute('disabled')).toBe(false);
  });
});

describe('tabs', () => {
  it('activates the content named by the initial value', async () => {
    const tabs = await mount<Host>('<void-tabs value="b"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b">b</void-tabs-content></void-tabs>');
    const panels = Array.from(tabs.querySelectorAll('void-tabs-content'));
    expect(panels.map(p => p.hasAttribute('active'))).toEqual([false, true]);
  });

  it('gives incoming parts the generated ids of the live parts at the same place, so morphers pair them', async () => {
    const tabs = await mount<Host>('<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b">b</void-tabs-content></void-tabs>');
    const next = server('<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger><void-tabs-trigger value="c">C</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content><void-tabs-content value="b">b</void-tabs-content><void-tabs-content value="c">c</void-tabs-content></void-tabs>');
    tabs.voidBeforeMorph(next);
    const live = Array.from(tabs.querySelectorAll('void-tabs-content')).map(p => p.id);
    const ids = Array.from(next.querySelectorAll('void-tabs-content')).map(p => p.getAttribute('id'));
    expect(ids).toEqual([live[0], live[1], null]);
  });
});
