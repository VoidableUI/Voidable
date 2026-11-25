import { overlayState } from '../../src/overlay.js';

/** Lets pending Lit updates and the controller's microtasks run. */
export async function flush(...els: Array<{ updateComplete: Promise<unknown> }>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.all(els.map(e => e.updateComplete));
    await Promise.resolve();
  }
}

export function press(key: string, target: EventTarget = document.activeElement ?? document.body): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(e);
  return e;
}

export function pointerdown(target: EventTarget, init: PointerEventInit = {}): void {
  const Ctor = (globalThis as { PointerEvent?: typeof PointerEvent }).PointerEvent ?? MouseEvent;
  target.dispatchEvent(new Ctor('pointerdown', { bubbles: true, cancelable: true, composed: true, button: 0, ...init }));
}

/** Whether an overlay surface is shown (popover or [hidden] fallback, or an open dialog). */
export function shown(surface: Element | null): boolean {
  if (!surface) return false;
  if (surface instanceof HTMLDialogElement) return surface.open;
  const el = surface as HTMLElement;
  try {
    if (typeof el.showPopover === 'function') return el.matches(':popover-open');
  } catch {
    // happy-dom: no Popover API.
  }
  return !el.hidden;
}

export const stack = (): string[] => overlayState(document).stack.map(h => h.id || h.localName);
export const locks = (): number => overlayState(document).locks;

/** Removes everything and lets disconnect handling settle, so no overlay leaks into the next test. */
export async function cleanup(): Promise<void> {
  document.body.innerHTML = '';
  await Promise.resolve();
  await Promise.resolve();
  document.documentElement.removeAttribute('style');
}
