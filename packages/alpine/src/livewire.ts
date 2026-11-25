/**
 * Livewire morph hooks for `void-*` elements.
 *
 * Before Livewire morphs a `void-*` element (`morph.updating`) this calls the
 * element's `voidBeforeMorph(toEl)` pre-morph hook, which applies Void UI's rule
 * for state: a reflected attribute the server changed since its last render
 * wins; every other one keeps the client's value (an opened dialog or drawer,
 * an expanded accordion item, a pressed toggle), and attributes the component
 * manages on its host (`role`, `tabindex`, `aria-*`) are carried over. The hook
 * also parks the chrome the component rendered, so the morph compares the
 * element's own children with the server markup (Livewire morphs parents
 * first, so outer elements are parked first). Each element re-projects itself
 * in the microtask after the morph. The rule itself lives in the base class,
 * shared with the Turbo and LiveView adapters; this module only connects it to
 * Livewire.
 *
 * Usage:
 * ```js
 * import { registerLivewireHooks } from '@voidable/ui-alpine';
 * registerLivewireHooks();
 * ```
 */

type VoidHost = Element & {
  voidBeforeMorph?: (incoming?: Element | null) => boolean;
  voidUnchanged?: (incoming: Element) => boolean;
};

export function registerLivewireHooks(): void {
  if (typeof window === 'undefined') return;

  const Livewire = (window as any).Livewire;
  if (!Livewire) return;

  Livewire.hook('morph.updating', ({ el, toEl, skip }: { el: VoidHost; toEl?: Element; skip?: () => void }) => {
    if (!el.tagName?.startsWith('VOID-')) return;
    // The server sent exactly what it sent last time: skip the element and its subtree.
    if (toEl && skip && el.voidUnchanged?.(toEl)) {
      skip();
      return;
    }
    el.voidBeforeMorph?.(toEl);
  });
}
