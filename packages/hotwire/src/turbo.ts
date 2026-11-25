/**
 * Turbo morph integration for `void-*` elements.
 *
 * Before Turbo morphs a `void-*` element (`turbo:before-morph-element`) this
 * calls the element's `voidBeforeMorph(newElement)` pre-morph hook, which
 * applies Void UI's rule for state: a reflected attribute the server changed
 * since its last render wins; every other one keeps the client's value (an
 * opened dialog, a pressed toggle, a collapsed sidebar), and attributes the
 * component manages on its host (`role`, `tabindex`, `aria-*`) are carried over.
 * The hook also parks the chrome the component rendered, so the morph compares
 * the element's own children with the server markup. Turbo morphs parents
 * before children, so outer elements are parked first; every element puts the
 * same chrome back (same nodes, state, typed text and focus) in the microtask
 * after the morph. The rule itself lives in the base class, shared with the
 * Livewire and LiveView adapters; this module only connects it to Turbo.
 *
 * Usage:
 * ```js
 * import { VoidTurbo } from '@voidable/ui-hotwire';
 * const stop = VoidTurbo.start(); // call stop() to detach
 * ```
 */

type Morphable = Element & { voidBeforeMorph?: (incoming?: Element | null) => boolean };

export const VoidTurbo = {
  /** Start listening. Returns a function that removes the listener. */
  start(target: Document = document): () => void {
    const onBeforeMorphElement = ((event: CustomEvent<{ newElement?: Element }>) => {
      const el = event.target as Morphable;
      const next = event.detail?.newElement;
      // Only if the element is really about to be morphed (another listener may cancel it).
      if (!next || event.defaultPrevented || !el.tagName?.startsWith('VOID-')) return;
      el.voidBeforeMorph?.(next);
    }) as EventListener;

    target.addEventListener('turbo:before-morph-element', onBeforeMorphElement);
    return () => target.removeEventListener('turbo:before-morph-element', onBeforeMorphElement);
  },
};
