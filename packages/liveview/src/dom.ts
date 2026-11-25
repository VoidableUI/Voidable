/**
 * DOM-patching callbacks for `void-*` elements during LiveView's morphdom
 * updates.
 *
 * `onBeforeElUpdated` calls each `void-*` element's `voidBeforeMorph(toEl)`
 * pre-morph hook, which applies Void UI's rule for state: a reflected attribute
 * the server changed since its last render wins (so `open={false}` on the
 * server really closes a dialog the client opened); every other one keeps the
 * client's value, and attributes the component manages on its host (`role`,
 * `tabindex`, `aria-*`) are copied onto `toEl`. The hook also parks the chrome
 * the component rendered, so morphdom compares the element's own children with
 * the server markup. morphdom visits parents before children, so outer
 * elements are parked first; every element puts the same chrome back in the
 * microtask after the patch. The rule itself lives in the base class, shared
 * with the Turbo and Livewire adapters; this module only connects it to
 * morphdom.
 *
 * Usage:
 * ```js
 * import { VoidDOM } from "@voidable/ui-liveview";
 * const liveSocket = new LiveSocket("/live", Socket, {
 *   dom: VoidDOM, // onBeforeElUpdated
 * });
 * ```
 */

type Morphable = Element & { voidBeforeMorph?: (incoming?: Element | null) => boolean };

export const VoidDOM = {
  /**
   * Call from `dom.onBeforeElUpdated`: `fromEl` is the live element, `toEl` the
   * server-rendered one.
   */
  onBeforeElUpdated(fromEl: Element, toEl: Element): void {
    if (!fromEl.tagName?.startsWith("VOID-")) return;
    // An unchanged comprehension or component root arrives as an empty
    // placeholder (data-phx-skip) and LiveView keeps the live element as it is;
    // it is not the server's markup, so the state rule must not read it.
    if (toEl.hasAttribute?.("data-phx-skip")) return;
    (fromEl as Morphable).voidBeforeMorph?.(toEl);
  },
};
