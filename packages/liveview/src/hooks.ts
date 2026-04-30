/**
 * LiveView JS hooks that bridge CustomEvents emitted by Voidable web
 * components to Phoenix LiveView's `pushEvent()` channel.
 *
 * Usage in HEEx:
 * ```heex
 * <void-button phx-hook="VoidEvent" data-void-events="void-click">
 *   Click me
 * </void-button>
 * ```
 */

/** Minimal LiveView hook shape used by phoenix_live_view. */
interface ViewHookInstance {
  el: HTMLElement;
  pushEvent(event: string, payload: object): void;
  handleEvent(event: string, callback: (payload: object) => void): void;
  mounted?(): void;
  updated?(): void;
  destroyed?(): void;
  disconnected?(): void;
  reconnected?(): void;
  beforeUpdate?(): void;
  beforeDestroy?(): void;
}

type ListenerEntry = [event: string, handler: (e: Event) => void];

/** Extended hook instance carrying private bookkeeping state. */
interface VoidEventInstance extends ViewHookInstance {
  _listeners: ListenerEntry[];
  _boundEvents: string[];
}

function parseEvents(el: HTMLElement): string[] {
  return (el.dataset.voidEvents || "").split(",").filter(Boolean);
}

function attachListeners(hook: VoidEventInstance, events: string[]): void {
  for (const event of events) {
    const handler = (e: Event) => {
      hook.pushEvent(event, (e as CustomEvent).detail || {});
    };
    hook.el.addEventListener(event, handler);
    hook._listeners.push([event, handler]);
  }
  hook._boundEvents = events;
}

function detachListeners(hook: VoidEventInstance): void {
  for (const [event, handler] of hook._listeners) {
    hook.el.removeEventListener(event, handler);
  }
  hook._listeners = [];
  hook._boundEvents = [];
}

/**
 * A map of LiveView hooks to spread into the `hooks` option of `LiveSocket`.
 *
 * ```js
 * import { VoidHooks } from "@voidable/ui-liveview";
 * const liveSocket = new LiveSocket("/live", Socket, {
 *   hooks: { ...VoidHooks },
 * });
 * ```
 */
export const VoidHooks: Record<string, Partial<ViewHookInstance> & ThisType<VoidEventInstance>> = {
  VoidEvent: {
    mounted(this: VoidEventInstance) {
      this._listeners = [];
      this._boundEvents = [];
      const events = parseEvents(this.el);
      attachListeners(this, events);
    },

    updated(this: VoidEventInstance) {
      const next = parseEvents(this.el);
      const prev = this._boundEvents || [];

      // Fast path: nothing changed
      if (
        next.length === prev.length &&
        next.every((e, i) => e === prev[i])
      ) {
        return;
      }

      // Diff: tear down everything and re-bind. The event list is typically
      // short (1-3 entries) so a full rebuild is simpler and fast enough.
      detachListeners(this);
      attachListeners(this, next);
    },

    destroyed(this: VoidEventInstance) {
      detachListeners(this);
    },
  },
};
