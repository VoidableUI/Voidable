/**
 * Livewire morph hooks that preserve Voidable component state during
 * Livewire re-renders.
 *
 * Client state (`value`, `checked`) is preserved only while the server keeps
 * rendering the same value it rendered last time. As soon as the server
 * renders a different value, the server wins and the client state is
 * overwritten.
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
  });

  Livewire.hook('morph.updated', ({ el }: { el: HTMLElement }) => {
    const state = pending.get(el);
    if (!state) return;
    pending.delete(el);

    if (state.value !== undefined) (el as any).value = state.value;
    if (state.checked !== undefined) (el as any).checked = state.checked;
  });
}
