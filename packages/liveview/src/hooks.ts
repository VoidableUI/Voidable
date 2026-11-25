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
    name: el.getAttribute("name"),
    event,
    detail: detail ?? {},
  };
}

function push(hook: ViewHookInstance, event: string, payload: object): void {
  // Honour phx-target (a component cid or a CSS selector), like phx-click does.
  const target = hook.el.getAttribute("phx-target");
  if (target) {
    hook.pushEventTo(target, event, payload);
  } else {
    hook.pushEvent(event, payload);
  }
}

/**
 * Core `closable` is a Lit boolean that defaults to true; an attribute can
 * never express false, so the server renders `data-void-closable` and we apply
 * it as a property.
 */
function applyProps(el: HTMLElement): void {
  const closable = el.dataset.voidClosable;
  if (closable !== undefined) {
    (el as HTMLElement & { closable?: boolean }).closable = closable !== "false";
  }
}

function attachListeners(hook: VoidEventInstance, events: string[]): void {
  for (const event of events) {
    const handler = (e: Event) => {
      push(hook, event, buildPayload(hook.el, event, (e as CustomEvent).detail));
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
      applyProps(this.el);
    },

    updated(this: VoidEventInstance) {
      applyProps(this.el);
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
