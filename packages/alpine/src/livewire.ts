/**
 * Livewire morph hooks that preserve Voidable component state during
 * Livewire re-renders.
 *
 * Usage:
 * ```js
 * import { registerLivewireHooks } from '@voidable/ui-alpine';
 * registerLivewireHooks();
 * ```
 */

interface VoidState {
  value?: unknown;
  checked?: boolean;
}

declare global {
  interface HTMLElement {
    __voidState?: VoidState;
  }
}

export function registerLivewireHooks(): void {
  if (typeof window === 'undefined') return;

  const Livewire = (window as any).Livewire;
  if (!Livewire) return;

  // Protect Voidable element state during Livewire morphs
  Livewire.hook('morph.updating', ({ el }: { el: HTMLElement }) => {
    if (el.tagName?.startsWith('VOID-')) {
      el.__voidState = {
        value: (el as any).value,
        checked: (el as any).checked,
      };
    }
  });

  Livewire.hook('morph.updated', ({ el }: { el: HTMLElement }) => {
    if (el.__voidState) {
      if (el.__voidState.value !== undefined) {
        (el as any).value = el.__voidState.value;
      }
      if (el.__voidState.checked !== undefined) {
        (el as any).checked = el.__voidState.checked;
      }
      delete el.__voidState;
    }
  });
}
