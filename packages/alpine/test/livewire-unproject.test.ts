import { describe, it, expect, beforeEach } from 'vitest';
import { registerLivewireHooks } from '../src/livewire.js';

// The pre-morph hook: registerLivewireHooks calls voidBeforeMorph(toEl) on each
// void-* element in morph.updating. The state rule (a server change wins,
// client state survives otherwise) lives in the base class of the components
// and is tested in @voidable/ui; here only the wiring is.

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

function host(tag: string, log: unknown[]) {
  const el = document.createElement(tag) as HTMLElement & Record<string, any>;
  el.voidBeforeMorph = (incoming?: Element | null) => {
    log.push([el.id || tag, incoming]);
    return true;
  };
  return el;
}

describe('registerLivewireHooks pre-morph hook', () => {
  beforeEach(() => {
    delete (window as any).Livewire;
  });

  it('hands toEl to voidBeforeMorph so the component can apply the state rule to it', () => {
    const hooks = setup();
    const log: unknown[] = [];
    const el = host('void-switch', log);
    const toEl = document.createElement('void-switch');
    hooks['morph.updating']({ el, toEl });
    expect(log).toEqual([['void-switch', toEl]]);
  });

  it('unprojects outer elements first, in morph order', () => {
    const hooks = setup();
    const log: unknown[] = [];
    const outer = host('void-card', log);
    const inner = host('void-dialog', log);
    outer.id = 'outer';
    inner.id = 'inner';
    const to = document.createElement('void-card');
    hooks['morph.updating']({ el: outer, toEl: to });
    hooks['morph.updating']({ el: inner, toEl: to });
    expect(log.map(e => (e as unknown[])[0])).toEqual(['outer', 'inner']);
  });

  it('skips an element whose server markup is unchanged (voidUnchanged), with its subtree', () => {
    const hooks = setup();
    const log: unknown[] = [];
    const el = host('void-switch', log);
    let unchanged = true;
    el.voidUnchanged = () => unchanged;
    let skipped = 0;
    const toEl = document.createElement('void-switch');
    hooks['morph.updating']({ el, toEl, skip: () => skipped++ });
    expect([skipped, log.length]).toEqual([1, 0]);
    unchanged = false;
    hooks['morph.updating']({ el, toEl, skip: () => skipped++ });
    expect([skipped, log.length]).toEqual([1, 1]);
  });

  it('ignores non-void elements and void-* elements without the hook', () => {
    const hooks = setup();
    const log: unknown[] = [];
    const div = host('div', log);
    hooks['morph.updating']({ el: div, toEl: document.createElement('div') });
    expect(log).toEqual([]);
    expect(() => hooks['morph.updating']({ el: document.createElement('void-badge'), toEl: document.createElement('void-badge') })).not.toThrow();
  });
});
