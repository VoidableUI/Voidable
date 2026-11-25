import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoidableAlpine } from '../src/plugin.js';
import { registerLivewireHooks } from '../src/livewire.js';

function createMockAlpine() {
  const directives: Record<string, Function> = {};
  const magics: Record<string, Function> = {};

  return {
    directive(name: string, callback: Function) {
      directives[name] = callback;
    },
    magic(name: string, callback: Function) {
      magics[name] = callback;
    },
    _directives: directives,
    _magics: magics,
  };
}

describe('VoidableAlpine plugin', () => {
  it('registers the void-on directive', () => {
    const Alpine = createMockAlpine();
    VoidableAlpine(Alpine as any);
    expect(Alpine._directives['void-on']).toBeDefined();
  });

  it('registers the void-preserve directive', () => {
    const Alpine = createMockAlpine();
    VoidableAlpine(Alpine as any);
    expect(Alpine._directives['void-preserve']).toBeDefined();
  });

  it('registers the $voidable magic', () => {
    const Alpine = createMockAlpine();
    VoidableAlpine(Alpine as any);
    expect(Alpine._magics['voidable']).toBeDefined();
  });

  describe('x-void-on directive', () => {
    it('adds event listener for specified event and evaluates expression', () => {
      const Alpine = createMockAlpine();
      VoidableAlpine(Alpine as any);

      const el = document.createElement('div');
      const evaluate = vi.fn();

      Alpine._directives['void-on'](
        el,
        { value: 'void-change', expression: 'name = $event.detail.value' },
        { evaluate },
      );

      const detail = { value: 'hello' };
      const event = new CustomEvent('void-change', { detail });
      el.dispatchEvent(event);

      expect(evaluate).toHaveBeenCalledWith(
        'name = $event.detail.value',
        { scope: { $event: event } },
      );
    });

    it('does nothing when no value is provided', () => {
      const Alpine = createMockAlpine();
      VoidableAlpine(Alpine as any);

      const el = document.createElement('div');
      const evaluate = vi.fn();

      Alpine._directives['void-on'](
        el,
        { value: '', expression: 'foo()' },
        { evaluate },
      );

      el.dispatchEvent(new CustomEvent('void-change'));
      expect(evaluate).not.toHaveBeenCalled();
    });
  });

  describe('x-void-preserve directive', () => {
    it('sets wire:ignore so Lit-rendered children are protected too', () => {
      const Alpine = createMockAlpine();
      VoidableAlpine(Alpine as any);

      const el = document.createElement('div');
      Alpine._directives['void-preserve'](el);

      expect(el.getAttribute('wire:ignore')).toBe('');
      // wire:ignore.self would still morph the children
      expect(el.hasAttribute('wire:ignore.self')).toBe(false);
    });
  });

  describe('$voidable magic', () => {
    it('dispatches a CustomEvent on the target element', () => {
      const Alpine = createMockAlpine();
      VoidableAlpine(Alpine as any);

      const magicFn = Alpine._magics['voidable']();
      const target = document.createElement('div');
      const handler = vi.fn();
      target.addEventListener('void-clear', handler);

      magicFn(target, 'void-clear', { reason: 'user' });

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ reason: 'user' });
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });
  });
});

describe('registerLivewireHooks', () => {
  beforeEach(() => {
    delete (window as any).Livewire;
  });

  it('does nothing when Livewire is not present', () => {
    expect(() => registerLivewireHooks()).not.toThrow();
  });

  it('registers morph hooks when Livewire is available', () => {
    const hooks: Record<string, Function> = {};
    (window as any).Livewire = {
      hook(name: string, callback: Function) {
        hooks[name] = callback;
      },
    };

    registerLivewireHooks();

    expect(hooks['morph.updating']).toBeDefined();
    expect(hooks['morph.updated']).toBeDefined();
  });

  function setup() {
    const hooks: Record<string, Function> = {};
    (window as any).Livewire = {
      hook(name: string, callback: Function) {
        hooks[name] = callback;
      },
    };
    registerLivewireHooks();
    return hooks;
  }

  function serverEl(attrs: Record<string, string>) {
    const toEl = document.createElement('void-input');
    for (const [k, v] of Object.entries(attrs)) toEl.setAttribute(k, v);
    return toEl;
  }

  function morph(hooks: Record<string, Function>, el: any, toEl: Element, clobber: () => void) {
    hooks['morph.updating']({ el, toEl });
    clobber();
    hooks['morph.updated']({ el });
  }

  it('preserves client state while the server value is unchanged', () => {
    const hooks = setup();
    const el = document.createElement('void-input') as any;

    // First render establishes the baseline.
    morph(hooks, el, serverEl({ value: 'a' }), () => {});

    el.value = 'typed';
    el.checked = true;
    morph(hooks, el, serverEl({ value: 'a' }), () => {
      el.value = 'a';
      el.checked = false;
    });

    expect(el.value).toBe('typed');
    expect(el.checked).toBe(true);
  });

  it('lets the server win when the server value changed', () => {
    const hooks = setup();
    const el = document.createElement('void-input') as any;

    morph(hooks, el, serverEl({ value: 'a' }), () => {});
    el.value = 'typed';

    morph(hooks, el, serverEl({ value: 'b' }), () => {
      el.value = 'b';
    });
    expect(el.value).toBe('b');
  });

  it('lets the server uncheck an element it previously rendered checked', () => {
    const hooks = setup();
    const el = document.createElement('void-input') as any;

    morph(hooks, el, serverEl({ checked: '' }), () => {});
    el.checked = true;

    morph(hooks, el, serverEl({}), () => {
      el.checked = false;
    });
    expect(el.checked).toBe(false);
  });

  it('keeps no state in module scope between registrations', () => {
    const hooksA = setup();
    const el = document.createElement('void-input') as any;
    morph(hooksA, el, serverEl({ value: 'a' }), () => {});

    // A fresh registration has no record for el, so it preserves (safe default).
    const hooksB = setup();
    el.value = 'typed';
    morph(hooksB, el, serverEl({ value: 'b' }), () => {
      el.value = 'b';
    });
    expect(el.value).toBe('typed');
  });

  it('ignores non-void elements', () => {
    const hooks: Record<string, Function> = {};
    (window as any).Livewire = {
      hook(name: string, callback: Function) {
        hooks[name] = callback;
      },
    };

    registerLivewireHooks();

    const el = document.createElement('div') as any;
    el.value = 'test';

    hooks['morph.updating']({ el, toEl: document.createElement('div') });
    el.value = 'changed';
    hooks['morph.updated']({ el });
    expect(el.value).toBe('changed');
  });
});
