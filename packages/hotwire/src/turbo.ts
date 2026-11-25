/**
 * Turbo morph integration to preserve client-managed attributes on `VOID-*`
 * elements during page morphs.
 *
 * A client-managed attribute (`open`, `checked`, `aria-expanded`, ...) is kept
 * only while the server keeps rendering the same value it rendered last time.
 * When the server renders a different value (including removing the
 * attribute), the server wins.
 *
 * It also calls each `void-*` element's `voidUnproject()` pre-morph hook, so
 * the morph compares the element's own children with the server markup instead
 * of the chrome the component rendered around them. Turbo morphs parents before
 * children, so outer elements are unprojected first; every element re-projects
 * itself (same chrome, same state, focus kept) in the microtask after the
 * morph.
 *
 * Usage:
 * ```js
 * import { VoidTurbo } from '@voidable/ui-hotwire';
 * const stop = VoidTurbo.start(); // call stop() to detach
 * ```
 */

const PRESERVE_ATTRS = [
  'aria-expanded',
  'aria-selected',
  'aria-checked',
  'aria-hidden',
  'open',
  'active',
  'checked',
  'selected',
];

type ServerAttrs = Record<string, string | null>;
type Unprojectable = Element & { voidUnproject?: () => boolean };

function isVoid(el: Element | null | undefined): el is Element {
  return !!el?.tagName?.startsWith('VOID-');
}

function snapshot(el: Element): ServerAttrs {
  const attrs: ServerAttrs = {};
  for (const name of PRESERVE_ATTRS) attrs[name] = el.getAttribute(name);
  return attrs;
}

export const VoidTurbo = {
  /** Start listening. Returns a function that removes the listeners. */
  start(target: Document = document): () => void {
    // State lives in this closure (one per start() call), not in module scope.
    /** Last server-rendered attribute values per element. */
    const lastServer = new WeakMap<Element, ServerAttrs>();
    /** Attributes to preserve for the element currently being morphed. */
    const preserve = new WeakMap<Element, Set<string>>();

    // Elements present on load carry server-rendered attributes. Record them
    // as the baseline so the first morph can tell a server change apart from
    // a client change.
    const seed = () => {
      for (const el of target.querySelectorAll('*')) {
        if (isVoid(el) && !lastServer.has(el)) lastServer.set(el, snapshot(el));
      }
    };

    const onBeforeMorphElement = ((event: CustomEvent<{ newElement?: Element }>) => {
      const el = event.target as Element;
      const next = event.detail?.newElement;
      if (!isVoid(el) || !next) return;

      const prev = lastServer.get(el);
      const incoming = snapshot(next);
      const keep = new Set<string>();

      for (const name of PRESERVE_ATTRS) {
        // No baseline: keep the client value (safe default).
        if (!prev || prev[name] === incoming[name]) keep.add(name);
      }

      preserve.set(el, keep);
      lastServer.set(el, incoming);

      // After the server state is recorded (unprojecting only moves children;
      // host attributes and properties are untouched), and only if the element
      // is really about to be morphed.
      if (!event.defaultPrevented) (el as Unprojectable).voidUnproject?.();
    }) as EventListener;

    const onBeforeMorphAttribute = ((event: CustomEvent<{ attributeName: string }>) => {
      const el = event.target as Element;
      if (!isVoid(el)) return;

      const keep = preserve.get(el);
      const name = event.detail.attributeName;
      if (PRESERVE_ATTRS.includes(name) && (!keep || keep.has(name))) {
        event.preventDefault();
      }
    }) as EventListener;

    target.addEventListener('turbo:load', seed);
    target.addEventListener('turbo:before-morph-element', onBeforeMorphElement);
    target.addEventListener('turbo:before-morph-attribute', onBeforeMorphAttribute);
    seed();

    return () => {
      target.removeEventListener('turbo:load', seed);
      target.removeEventListener('turbo:before-morph-element', onBeforeMorphElement);
      target.removeEventListener('turbo:before-morph-attribute', onBeforeMorphAttribute);
    };
  },
};
