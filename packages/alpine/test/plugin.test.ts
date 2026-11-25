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

  it('registers the morph.updating hook when Livewire is available', () => {
    const hooks: Record<string, Function> = {};
    (window as any).Livewire = {
      hook(name: string, callback: Function) {
        hooks[name] = callback;
      },
    };

    registerLivewireHooks();

    expect(Object.keys(hooks)).toEqual(['morph.updating']);
  });
});
