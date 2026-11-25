import { describe, it, expect, beforeEach } from 'vitest';
import { registerLivewireHooks } from '../src/livewire.js';

// The pre-morph hook: registerLivewireHooks calls voidUnproject() on each
// void-* element in morph.updating, after reading the client state, and
// re-applies that state once the element has re-projected.

type Hooks = Record<string, (arg: object) => void>;

function setup(): Hooks {
  const hooks: Hooks = {};
  (window as any).Livewire = {
    hook(name: string, callback: (arg: object) => void) {
      hooks[name] = callback;
    },
  };
  registerLivewireHooks();
  return hooks;
}

/**
 * A stand-in for a projecting component: while unprojected, its rendered chrome
 * (which its `value` getter reads) is out of the element, and it re-projects in
 * the update that unprojecting scheduled.
 */
function fakeHost(log: string[], initial: string) {
  const el = document.createElement('void-select') as HTMLElement & Record<string, any>;
  let chrome = true;
  let value = initial;
  let resolve!: () => void;
  Object.defineProperty(el, 'value', {
    get: () => (chrome ? value : ''),
    set: (v: string) => {
      log.push(`set value=${v} chrome=${chrome}`);
      value = v;
    },
  });
  el.voidUnproject = () => {
    log.push('unproject');
    chrome = false;
    el.updateComplete = new Promise<void>((r) => (resolve = r)).then(() => {
      chrome = true;
      log.push('reprojected');
    });
    return true;
  };
  return { el, reproject: () => resolve() };
}

const server = (value: string) => {
  const to = document.createElement('void-select');
  to.setAttribute('value', value);
  return to;
};

describe('registerLivewireHooks pre-morph hook', () => {
  beforeEach(() => {
    delete (window as any).Livewire;
  });

  it('reads client state before unprojecting and re-applies it after re-projection', async () => {
    const hooks = setup();
    const log: string[] = [];
    const { el, reproject } = fakeHost(log, 'a');

    // First morph establishes the server baseline; then the user picks "z".
    hooks['morph.updating']({ el, toEl: server('a') });
    hooks['morph.updated']({ el });
    reproject();
    await el.updateComplete;
    el.value = 'z';
    log.length = 0;

    // Server renders the same value: the client's "z" is kept.
    hooks['morph.updating']({ el, toEl: server('a') });
    // morph.updated fires before Livewire morphs the children: nothing restored yet.
    hooks['morph.updated']({ el });
    expect(log).toEqual(['unproject']);
    reproject();
    await el.updateComplete;
    await Promise.resolve();
    expect(log).toEqual(['unproject', 'reprojected', 'set value=z chrome=true']);
  });

  it('lets the server win and still unprojects', async () => {
    const hooks = setup();
    const log: string[] = [];
    const { el, reproject } = fakeHost(log, 'a');
    hooks['morph.updating']({ el, toEl: server('a') });
    hooks['morph.updated']({ el });
    reproject();
    await el.updateComplete;
    el.value = 'z';
    log.length = 0;

    hooks['morph.updating']({ el, toEl: server('b') });
    hooks['morph.updated']({ el });
    reproject();
    await el.updateComplete;
    await Promise.resolve();
    // No client value is preserved; the morph's attribute change applies.
    expect(log).toEqual(['unproject', 'reprojected']);
  });

  it('unprojects outer elements first, in morph order', () => {
    const hooks = setup();
    const log: string[] = [];
    const outer = fakeHost(log, '').el;
    const inner = fakeHost(log, '').el;
    outer.id = 'outer';
    inner.id = 'inner';
    outer.voidUnproject = () => (log.push('outer'), true);
    inner.voidUnproject = () => (log.push('inner'), true);
    hooks['morph.updating']({ el: outer, toEl: server('') });
    hooks['morph.updated']({ el: outer });
    hooks['morph.updating']({ el: inner, toEl: server('') });
    expect(log).toEqual(['outer', 'inner']);
  });

  it('restores synchronously for elements that did not unproject', () => {
    const hooks = setup();
    const el = document.createElement('void-input') as HTMLElement & Record<string, any>;
    el.voidUnproject = () => false;
    el.value = 'typed';
    hooks['morph.updating']({ el, toEl: server('') });
    el.value = 'clobbered';
    hooks['morph.updated']({ el });
    expect(el.value).toBe('typed');
  });
});
