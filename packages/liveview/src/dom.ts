/**
 * DOM-patching callbacks that preserve web component client state during
 * LiveView's morphdom updates.
 *
 * Client-managed attributes (`open`, `checked`, `aria-expanded`, ...) are kept
 * only while the server keeps rendering the same value it rendered last time.
 * When the server renders a different value (including dropping the
 * attribute) the server wins, so `open={false}` on the server really closes a
 * dialog the client opened.
 *
 * `onBeforeElUpdated` also calls each `void-*` element's `voidBeforeMorph(toEl)`
 * pre-morph hook: attributes the component manages on its host (`role`,
 * `tabindex`, `aria-*`, reflected defaults) are copied onto `toEl` where the
 * server markup does not set them, and the chrome the component rendered is
 * parked, so morphdom compares the element's own children with the server
 * markup. morphdom visits parents before children, so outer elements are parked
 * first; every element puts the same chrome back in the microtask after the
 * patch.
 *
 * Usage:
 * ```js
 * import { VoidDOM } from "@voidable/ui-liveview";
 * const liveSocket = new LiveSocket("/live", Socket, {
 *   dom: VoidDOM, // onBeforeElUpdated + onNodeAdded
 * });
 * ```
 */

/** Attributes that web components manage on the client side. */
const PRESERVE_ATTRS: readonly string[] = [
  "aria-expanded",
  "aria-selected",
  "aria-checked",
  "aria-hidden",
  "open",
  "active",
  "checked",
  "selected",
  // A reflected value the user changed (number-input, slider, tabs ...).
  "value",
];

/**
 * Last server-rendered value per attribute, stored on the element itself so
 * that no state lives in module scope (Module Federation singletons).
 */
const SERVER_STATE = Symbol.for("@voidable/ui-liveview:server-attrs");

type ServerAttrs = Record<string, string | null>;
type WithState = Element & { [SERVER_STATE]?: ServerAttrs; voidBeforeMorph?: (incoming?: Element | null) => boolean };

function isVoid(el: Element): boolean {
  return !!el.tagName?.startsWith("VOID-");
}

function snapshot(el: Element): ServerAttrs {
  const attrs: ServerAttrs = {};
  for (const name of PRESERVE_ATTRS) attrs[name] = el.getAttribute(name);
  return attrs;
}

export const VoidDOM = {
  /**
   * Call from `dom.onNodeAdded`: records the server-rendered attributes of a
   * freshly inserted `void-*` element as the baseline for later patches.
   */
  onNodeAdded(el: Element): void {
    if (el.nodeType === 1 && isVoid(el)) {
      (el as WithState)[SERVER_STATE] = snapshot(el);
    }
  },

  /**
   * Call from `dom.onBeforeElUpdated`.
   *
   * `fromEl` is the live element, `toEl` the server-rendered one. For each
   * client-managed attribute: if the server value is unchanged since the last
   * render, `toEl` is made to carry the client's current value (so the patch
   * is a no-op for it); if the server value changed, `toEl` is left alone and
   * the server value is applied.
   */
  onBeforeElUpdated(fromEl: Element, toEl: Element): void {
    if (!isVoid(fromEl)) {
      return;
    }

    const el = fromEl as WithState;
    const prev = el[SERVER_STATE];
    const next = snapshot(toEl);

    for (const name of PRESERVE_ATTRS) {
      // Without a baseline keep the client value, but never invent one.
      const unchanged = prev ? prev[name] === next[name] : next[name] === null;
      if (!unchanged) continue;

      const client = fromEl.getAttribute(name);
      if (client === null) {
        toEl.removeAttribute(name);
      } else {
        toEl.setAttribute(name, client);
      }
    }

    el[SERVER_STATE] = next;

    // After the server attributes are recorded: the hook adds the component's own
    // attributes to toEl, which must not count as server values.
    el.voidBeforeMorph?.(toEl);
  },
};
