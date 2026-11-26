// @vitest-environment happy-dom
// The key action resolver (#90): binding formats, modifiers, case, reading direction, the three levels of
// override, disabling, and that every element with key actions declares the map the manifest is written from.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { actionFor, configureKeys, type KeyMap } from '../src/keys.js';
import { keyMaps } from '../src/keymaps/index.js';
import '../src/index.js';

const MAP: KeyMap = {
  next: ['ArrowInlineEnd', 'ArrowDown'],
  previous: ['ArrowInlineStart', 'ArrowUp'],
  first: ['Home'],
  close: ['Escape', 'Alt+ArrowUp'],
  backTab: ['Shift+Tab'],
  tab: ['Tab'],
  selectAll: [],
};

class Keyed extends HTMLElement {
  static keyMap = MAP;
  keys: Record<string, unknown> | null = null;
}
customElements.define('x-keyed', Keyed);

const make = (): Keyed => {
  const el = document.createElement('x-keyed') as Keyed;
  document.body.append(el);
  return el;
};
const key = (k: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
const act = (el: HTMLElement, k: string, init: KeyboardEventInit = {}) => actionFor(el, key(k, init));

afterEach(() => {
  document.body.innerHTML = '';
  configureKeys('x-keyed', null);
  configureKeys('*', null);
});

describe('actionFor', () => {
  it('resolves the default keys of a map', () => {
    const el = make();
    expect(act(el, 'ArrowRight')).toBe('next');
    expect(act(el, 'ArrowDown')).toBe('next');
    expect(act(el, 'ArrowLeft')).toBe('previous');
    expect(act(el, 'Home')).toBe('first');
    expect(act(el, 'Escape')).toBe('close');
    expect(act(el, 'F5')).toBeUndefined();
  });

  it('follows the reading direction for the default inline keys', () => {
    const el = make();
    el.dir = 'rtl';
    el.style.direction = 'rtl';
    expect(act(el, 'ArrowLeft')).toBe('next');
    expect(act(el, 'ArrowRight')).toBe('previous');
    expect(act(el, 'ArrowDown')).toBe('next');
  });

  it('takes a key an application writes literally, without mirroring', () => {
    const el = make();
    el.dir = 'rtl';
    el.style.direction = 'rtl';
    el.keys = { next: ['ArrowRight'], previous: ['ArrowLeft'] };
    expect(act(el, 'ArrowRight')).toBe('next');
    expect(act(el, 'ArrowLeft')).toBe('previous');
  });

  it('needs Control, Alt and Meta to match exactly', () => {
    const el = make();
    expect(act(el, 'ArrowUp', { altKey: true })).toBe('close');
    expect(act(el, 'Escape', { altKey: true })).toBeUndefined();
    expect(act(el, 'Home', { ctrlKey: true })).toBeUndefined();
    expect(act(el, 'Home', { metaKey: true })).toBeUndefined();
  });

  it('needs Shift to match exactly for a named key, and prefers the more specific binding', () => {
    const el = make();
    expect(act(el, 'Tab')).toBe('tab');
    expect(act(el, 'Tab', { shiftKey: true })).toBe('backTab');
    expect(act(el, 'Home', { shiftKey: true })).toBeUndefined();
  });

  it('matches a character in either case unless Shift is named', () => {
    const el = make();
    el.keys = { first: ['g'], close: ['Shift+g'] };
    expect(act(el, 'g')).toBe('first');
    expect(act(el, 'G', { shiftKey: true })).toBe('close');
    expect(act(el, 'G')).toBe('first');
    el.keys = { first: ['G'] };
    expect(act(el, 'g')).toBe('first');
  });

  it('reads Space, modifiers and chords written the documented way', () => {
    const el = make();
    el.keys = { first: ['Space'], close: ['Control+a', 'Meta+k'], selectAll: ['Control+Shift+z'] };
    expect(act(el, ' ')).toBe('first');
    expect(act(el, 'a', { ctrlKey: true })).toBe('close');
    expect(act(el, 'k', { metaKey: true })).toBe('close');
    expect(act(el, 'Z', { ctrlKey: true, shiftKey: true })).toBe('selectAll');
    expect(act(el, 'z', { ctrlKey: true })).toBeUndefined();
  });

  it('reads a plus sign as a key', () => {
    const el = make();
    el.keys = { first: ['+'], close: ['Control++'] };
    expect(act(el, '+')).toBe('first');
    expect(act(el, '+', { ctrlKey: true })).toBe('close');
  });

  it('lets a specific key beat Printable, and Printable take the rest', () => {
    const el = make();
    const map: KeyMap = { typeahead: ['Printable'], next: ['ArrowDown'] };
    el.keys = { next: ['j'] };
    expect(actionFor(el, key('j'), map)).toBe('next');
    expect(actionFor(el, key('k'), map)).toBe('typeahead');
    expect(actionFor(el, key('k', { ctrlKey: true }), map)).toBeUndefined();
    expect(actionFor(el, key('ArrowDown'), map)).toBeUndefined();
  });

  it('is no action for an event that was cancelled or is part of a composition', () => {
    const el = make();
    const e = key('Escape');
    e.preventDefault();
    expect(actionFor(el, e)).toBeUndefined();
    expect(actionFor(el, key('Escape', { isComposing: true }))).toBeUndefined();
  });

  it('is an opt-in shortcut when the default is empty', () => {
    const el = make();
    expect(act(el, 'a', { ctrlKey: true })).toBeUndefined();
    el.keys = { selectAll: ['Control+a', 'Meta+a'] };
    expect(act(el, 'a', { ctrlKey: true })).toBe('selectAll');
    expect(act(el, 'a', { metaKey: true })).toBe('selectAll');
  });

  it('takes one key as a string', () => {
    const el = make();
    el.keys = { first: 'F2' };
    expect(act(el, 'F2')).toBe('first');
    expect(act(el, 'Home')).toBeUndefined();
  });

  it('has nothing to resolve in an element without a map', () => {
    const el = document.createElement('div');
    expect(act(el, 'Escape')).toBeUndefined();
  });
});

describe('overrides', () => {
  it('lets an element rebind one action, and the old keys stop working for it only', () => {
    const el = make();
    el.keys = { first: ['g'] };
    expect(act(el, 'g')).toBe('first');
    expect(act(el, 'Home')).toBeUndefined();
    expect(act(el, 'ArrowRight')).toBe('next');
  });

  it('turns an action off with an empty list or null', () => {
    const el = make();
    el.keys = { close: [], next: null };
    expect(act(el, 'Escape')).toBeUndefined();
    expect(act(el, 'ArrowRight')).toBeUndefined();
    expect(act(el, 'ArrowUp')).toBe('previous');
  });

  it('applies configureKeys to every element of a tag', () => {
    const a = make();
    const b = make();
    configureKeys('x-keyed', { next: ['l'] });
    expect(act(a, 'l')).toBe('next');
    expect(act(b, 'l')).toBe('next');
    expect(act(a, 'ArrowRight')).toBeUndefined();
  });

  it('applies configureKeys("*") to an action name in every component', () => {
    const el = make();
    configureKeys('*', { close: ['q'] });
    expect(act(el, 'q')).toBe('close');
    expect(act(el, 'Escape')).toBeUndefined();
  });

  it('lets the most specific level win, action by action', () => {
    const el = make();
    configureKeys('*', { close: ['q'], first: ['g'] });
    configureKeys('x-keyed', { close: ['w'], next: ['l'] });
    el.keys = { close: ['e'] };
    expect(act(el, 'e')).toBe('close');
    expect(act(el, 'w')).toBeUndefined();
    expect(act(el, 'q')).toBeUndefined();
    expect(act(el, 'l')).toBe('next');
    expect(act(el, 'g')).toBe('first');
  });

  it('replaces an earlier configureKeys for the tag and clears it with null', () => {
    const el = make();
    configureKeys('x-keyed', { next: ['l'] });
    configureKeys('x-keyed', { first: ['g'] });
    expect(act(el, 'l')).toBeUndefined();
    expect(act(el, 'ArrowRight')).toBe('next');
    configureKeys('x-keyed', null);
    expect(act(el, 'g')).toBeUndefined();
  });

  it('keeps the registry on globalThis, so another copy of the library shares it', () => {
    configureKeys('x-keyed', { next: ['l'] });
    const registry = (globalThis as Record<symbol, Record<string, unknown>>)[Symbol.for('voidable.keys')];
    expect(registry?.['x-keyed']).toEqual({ next: ['l'] });
  });

  it('reports an action name the tag does not have when the development entry is loaded', async () => {
    const dev = await import('../src/dev/index.js');
    const seen: { kind: string; subject: string }[] = [];
    dev.configure({ onWarning: (w) => seen.push(w) });
    dev.reset();
    try {
      configureKeys('x-keyed', { nxt: ['l'], next: ['k'] });
      configureKeys('*', { whatever: ['q'] });
      expect(seen.map((w) => [w.kind, w.subject])).toEqual([['keys', 'nxt']]);
    } finally {
      dev.configure({ onWarning: undefined });
    }
  });
});

describe('the keys attribute', () => {
  it('is JSON, parsed into the keys property of a component, and not reflected', async () => {
    const tabs = document.createElement('void-tabs') as HTMLElement & { keys: unknown; updateComplete: Promise<boolean> };
    tabs.setAttribute('keys', '{"next":["ArrowRight","l"],"close":[]}');
    document.body.append(tabs);
    await tabs.updateComplete;
    expect(tabs.keys).toEqual({ next: ['ArrowRight', 'l'], close: [] });
    tabs.keys = { first: ['g'] };
    await tabs.updateComplete;
    expect(tabs.getAttribute('keys')).toBe('{"next":["ArrowRight","l"],"close":[]}');
  });

  it('is checked by the development rules: invalid JSON and an unknown action are reported', async () => {
    const { checkAttribute } = await import('../src/dev/rules.js');
    const table = { 'void-tabs': { m: 'tabs', a: { keys: 0 }, e: [] } } as never;
    const tabs = (v: string) => {
      const el = document.createElement('void-tabs');
      el.setAttribute('keys', v);
      return checkAttribute(table, el, 'keys');
    };
    expect(tabs('{"next":["j"],"activate":[]}')).toBeUndefined();
    expect(tabs('next:j')?.kind).toBe('keys');
    expect(tabs('{"nxt":["j"]}')?.message).toContain('Did you mean "next"?');
  });

  it('ignores a value that is not a JSON object', async () => {
    for (const bad of ['next:l', '["l"]', 'null', '']) {
      const tabs = document.createElement('void-tabs') as HTMLElement & { keys: unknown; updateComplete: Promise<boolean> };
      tabs.setAttribute('keys', bad);
      document.body.append(tabs);
      await tabs.updateComplete;
      expect(tabs.keys).toBeNull();
    }
  });
});

describe('the key maps', () => {
  it('belong to the element that reads them', () => {
    for (const [tag, map] of Object.entries(keyMaps)) {
      const ctor = customElements.get(tag) as (CustomElementConstructor & { keyMap?: KeyMap }) | undefined;
      expect(ctor, `<${tag}> is not registered`).toBeDefined();
      expect(ctor!.keyMap, `<${tag}>.keyMap`).toBe(map);
      expect('keys' in ctor!.prototype, `<${tag}> has no keys property`).toBe(true);
    }
  });

  it('are the ones the manifest (voidKeys) and the React wrappers know', () => {
    const manifestPath = resolve(__dirname, '../dist/custom-elements.json');
    if (!existsSync(manifestPath)) return; // `mise run test` builds first
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      modules: { declarations?: { tagName?: string; attributes?: { name: string }[]; voidKeys?: unknown }[] }[];
    };
    const decls = manifest.modules.flatMap((m) => m.declarations ?? []).filter((d) => d.tagName && d.voidKeys);
    const withKeys = decls.filter((d) => (d.attributes ?? []).some((a) => a.name === 'keys')).map((d) => d.tagName!).sort();
    expect(withKeys).toEqual(Object.keys(keyMaps).sort());
    const react = readFileSync(resolve(__dirname, '../../react/src/components.tsx'), 'utf8');
    const listed = [...(/KEYED_TAGS = \[([^\]]*)\]/.exec(react)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
    expect(listed, 'KEYED_TAGS in packages/react/src/components.tsx').toEqual(withKeys);
  });

  it('leave native controls alone: their elements have no map', () => {
    for (const tag of ['void-input', 'void-select', 'void-slider', 'void-textarea', 'void-field']) {
      expect((customElements.get(tag) as { keyMap?: KeyMap } | undefined)?.keyMap, tag).toBeUndefined();
    }
  });

  it('bind no shortcut by default: no default binding has a Control or Meta modifier', () => {
    for (const [tag, map] of Object.entries(keyMaps)) {
      for (const [action, keys] of Object.entries(map)) {
        for (const spec of keys) expect(/(^|\+)(Control|Ctrl|Meta)\+/.test(spec), `${tag} ${action} ${spec}`).toBe(false);
      }
    }
  });

  it('use the one vocabulary of action names', () => {
    const vocabulary = new Set([
      'activate', 'open', 'openLast', 'close', 'cancel', 'submit', 'send', 'leave',
      'next', 'previous', 'first', 'last', 'nextPage', 'previousPage', 'typeahead',
      'increment', 'decrement', 'add', 'removeLast', 'deleteBackward', 'deleteForward',
      'previousDay', 'nextDay', 'previousWeek', 'nextWeek', 'startOfWeek', 'endOfWeek',
      'previousMonth', 'nextMonth', 'previousYear', 'nextYear',
    ]);
    for (const [tag, map] of Object.entries(keyMaps)) {
      for (const action of Object.keys(map)) expect(vocabulary.has(action), `${tag}: "${action}" is not in the vocabulary`).toBe(true);
    }
  });
});
