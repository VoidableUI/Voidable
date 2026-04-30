/**
 * DOM-patching callbacks that preserve web component client state during
 * LiveView's morphdom updates.
 *
 * Usage:
 * ```js
 * import { VoidDOM } from "@voidable/ui-liveview";
 * const liveSocket = new LiveSocket("/live", Socket, {
 *   dom: {
 *     onBeforeElUpdated(from, to) {
 *       VoidDOM.onBeforeElUpdated(from, to);
 *     },
 *   },
 * });
 * ```
 */

/** ARIA attributes that web components manage on the client side. */
const PRESERVE_ARIA: readonly string[] = [
  "aria-expanded",
  "aria-selected",
  "aria-checked",
  "aria-hidden",
];

/** Boolean state attributes that web components toggle internally. */
const PRESERVE_STATE: readonly string[] = [
  "open",
  "active",
  "checked",
  "selected",
];

export const VoidDOM = {
  /**
   * Call from `dom.onBeforeElUpdated` in your LiveSocket config.
   *
   * When LiveView patches the DOM via morphdom, client-managed attributes on
   * `void-*` custom elements can be lost if they weren't in the server-rendered
   * markup. This callback copies them from the outgoing element to the incoming
   * one so the component keeps its visual state.
   */
  onBeforeElUpdated(fromEl: Element, toEl: Element): void {
    if (!fromEl.tagName.startsWith("VOID-")) {
      return;
    }

    for (const attr of PRESERVE_ARIA) {
      if (fromEl.hasAttribute(attr) && !toEl.hasAttribute(attr)) {
        toEl.setAttribute(attr, fromEl.getAttribute(attr)!);
      }
    }

    for (const attr of PRESERVE_STATE) {
      if (fromEl.hasAttribute(attr) && !toEl.hasAttribute(attr)) {
        toEl.setAttribute(attr, fromEl.getAttribute(attr)!);
      }
    }
  },
};
