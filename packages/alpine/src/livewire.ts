/**
 * Livewire morph hooks that preserve Voidable component state during
 * Livewire re-renders.
 *
 * Client state (`value`, `checked`) is preserved only while the server keeps
 * rendering the same value it rendered last time. As soon as the server
 * renders a different value, the server wins and the client state is
 * overwritten.
 *
 * Before Livewire morphs a `void-*` element its `voidUnproject()` pre-morph hook
 * is called, so the morph compares the element's own children with the server
 * markup instead of the chrome the component rendered around them (Livewire
 * morphs parents first, so outer elements are unprojected first). The element
 * re-projects itself in the microtask after the morph; client state recorded
 * before unprojecting is re-applied once it has.
 *
 * Usage:
 * ```js
 * import { registerLivewireHooks } from '@voidable/ui-alpine';
 * registerLivewireHooks();
 * ```
 */

interface ServerState {
  value: string | null;
  checked: boolean;
}

interface ClientState {
  value?: unknown;
  checked?: boolean;
}

type VoidHost = HTMLElement & {
  voidUnproject?: () => boolean;
  updateComplete?: Promise<unknown>;
};

function readServerState(el: Element | undefined): ServerState | undefined {
  if (!el || typeof el.getAttribute !== 'function') return undefined;
  return { value: el.getAttribute('value'), checked: el.hasAttribute('checked') };
}

export function registerLivewireHooks(): void {
  if (typeof window === 'undefined') return;

  const Livewire = (window as any).Livewire;
  if (!Livewire) return;

  // State is owned by this registration, not by module scope.
  /** Last server-rendered value per element. */
  const lastServer = new WeakMap<Element, ServerState>();
  /** Client state to restore after the current morph of an element. */
  const pending = new WeakMap<Element, ClientState>();
  /** Elements unprojected for the current morph; restored once re-projected. */
  const unprojected = new WeakSet<Element>();

  const restore = (el: HTMLElement, state: ClientState) => {
    if (state.value !== undefined) (el as any).value = state.value;
    if (state.checked !== undefined) (el as any).checked = state.checked;
  };

  Livewire.hook('morph.updating', ({ el, toEl }: { el: HTMLElement; toEl?: Element }) => {
    if (!el.tagName?.startsWith('VOID-')) return;

    const next = readServerState(toEl);
    const prev = lastServer.get(el);
    const preserve: ClientState = {};

    // Without a record (or without the incoming markup) keep the client state,
    // which is the safe default. Otherwise preserve only unchanged attributes.
    if (!next || !prev || next.value === prev.value) {
      preserve.value = (el as any).value;
    }
    if (!next || !prev || next.checked === prev.checked) {
      preserve.checked = (el as any).checked;
    }

    pending.set(el, preserve);
    if (next) lastServer.set(el, next);

    // Only after the client state is read: getters may read rendered chrome,
    // which unprojecting takes out of the element until it re-projects.
    if ((el as VoidHost).voidUnproject?.()) unprojected.add(el);
  });

  Livewire.hook('morph.updated', ({ el }: { el: HTMLElement }) => {
    const state = pending.get(el);
    if (!state) return;
    pending.delete(el);

    if (!unprojected.has(el)) {
      restore(el, state);
      return;
    }
    // Livewire fires morph.updated before it morphs the element's children, so
    // re-projecting here would put the chrome back in the morph's way. The
    // element re-projects in the update that unprojecting scheduled; apply the
    // state after it (and after any server-side attribute changes the morph made).
    unprojected.delete(el);
    const host = el as VoidHost;
    (host.updateComplete ?? Promise.resolve()).then(() => restore(el, state));
  });
}
