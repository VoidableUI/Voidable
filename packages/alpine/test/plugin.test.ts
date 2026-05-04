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
        { expression: 'name = $event.detail.value', modifiers: ['void-change'] },
        { evaluate },
      );

      const detail = { value: 'hello' };
      const event = new CustomEvent('void-change', { detail });
      el.dispatchEvent(event);

      expect(evaluate).toHaveBeenCalledWith(
        'name = $event.detail.value',
        { $event: event },
      );
    });

    it('does nothing when no modifier is provided', () => {
      const Alpine = createMockAlpine();
      VoidableAlpine(Alpine as any);

      const el = document.createElement('div');
      const evaluate = vi.fn();

      Alpine._directives['void-on'](
        el,
        { expression: 'foo()', modifiers: [] },
        { evaluate },
      );

      el.dispatchEvent(new CustomEvent('void-change'));
      expect(evaluate).not.toHaveBeenCalled();
    });
  });

  describe('x-void-preserve directive', () => {
    it('sets wire:ignore.self attribute', () => {
      const Alpine = createMockAlpine();
      VoidableAlpine(Alpine as any);

      const el = document.createElement('div');
      Alpine._directives['void-preserve'](el);

      expect(el.getAttribute('wire:ignore.self')).toBe('');
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

  it('preserves and restores state during morph', () => {
    const hooks: Record<string, Function> = {};
    (window as any).Livewire = {
      hook(name: string, callback: Function) {
        hooks[name] = callback;
      },
    };

    registerLivewireHooks();

    const el = document.createElement('void-input') as any;
    el.value = 'preserved';
    el.checked = true;

    // Simulate morph updating
    hooks['morph.updating']({ el });
    expect(el.__voidState).toEqual({ value: 'preserved', checked: true });

    // Simulate server clobbering
    el.value = '';
    el.checked = false;

    // Simulate morph updated — should restore
    hooks['morph.updated']({ el });
    expect(el.value).toBe('preserved');
    expect(el.checked).toBe(true);
    expect(el.__voidState).toBeUndefined();
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

    hooks['morph.updating']({ el });
    expect(el.__voidState).toBeUndefined();
  });
});
