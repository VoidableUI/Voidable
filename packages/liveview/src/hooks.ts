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
  pushEventTo(target: unknown, event: string, payload: object): void;
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
  _destroyed?: boolean;
}

function parseEvents(el: HTMLElement): string[] {
  return (el.dataset.voidEvents || "").split(",").filter(Boolean);
}

/**
 * Payload pushed to the server: the event `detail` fields (kept at the top
 * level for backwards compatibility) plus context about the element.
 */
export function buildPayload(el: HTMLElement, event: string, detail: unknown): Record<string, unknown> {
  const fields =
    detail && typeof detail === "object" && !Array.isArray(detail)
      ? (detail as Record<string, unknown>)
      : {};
  return {
    ...fields,
    id: el.id || null,
    // A component that enhances a native control written inside it (void-select, #52)
    // has its name on that control.
    name: el.getAttribute("name") ?? Array.from(el.children).find((c) => c.localName === "select")?.getAttribute("name") ?? null,
    event,
    detail: detail ?? {},
  };
}

function push(hook: VoidEventInstance, event: string, payload: object): void {
  if (hook._destroyed) return;
  // Honour phx-target (a component cid or a CSS selector), like phx-click does.
  const target = hook.el.getAttribute("phx-target");
  const sent: unknown = target ? hook.pushEventTo(target, event, payload) : hook.pushEvent(event, payload);
  // LiveView rejects a hook push once the view has gone (a navigation away);
  // it logs that itself, so the rejection is not left unhandled.
  if (sent && typeof (sent as Promise<unknown>).catch === "function") (sent as Promise<unknown>).catch(() => {});
}

function attachListeners(hook: VoidEventInstance, events: string[]): void {
  for (const event of events) {
    const handler = (e: Event) => {
      const payload = buildPayload(hook.el, event, (e as CustomEvent).detail);
      // Pushed in a task of its own, after the DOM event that caused it has
      // finished dispatching. A hook push marks the element as awaiting a
      // reply, and LiveView drops its own binding on an element in that state
      // (phx-click on a void-button whose void-click is bridged), so the
      // element's phx-* bindings run first.
      setTimeout(() => push(hook, event, payload), 0);
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
      this._destroyed = false;
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
      this._destroyed = true;
      detachListeners(this);
    },
  },
};
