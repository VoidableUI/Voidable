import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { closeControlPressed, removeWithFocus } from '../dismiss.js';

/**
 * Temporary notification for action confirmations, error alerts, and copy-to-clipboard feedback.
 *
 * Its text is written as parts: an optional `<void-toast-title>`, the `<void-toast-description>`, an optional
 * `<void-toast-actions>` (buttons) and an optional `<void-toast-close>` wrapping the one control that dismisses
 * it (a `<void-button aria-label="Dismiss">`). The parts are never moved, so a toast a server rendered into the
 * container and one built by `toast()` are the same markup. Without a close part the toast cannot be dismissed by
 * the user (it still closes itself after `duration`).
 *
 * @fires {CustomEvent<{ reason: 'close-button' | 'timeout' | 'api' }>} void-close - The toast is closing, by its close
 * part, its timer or `close()`; it removes itself afterwards. Does not bubble. Cancelable for `close-button`.
 */
export class VoidToast extends VoidElement {
  /**
   * Status colour: `default`, `error`, `warning`, `caution`, `success`, `info`, `notice` or `highlight`. `error` and `warning`
   * are announced assertively, the rest politely.
   */
  @property({ type: String, reflect: true })
  color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';

  /**
   * Milliseconds before the toast closes itself. Defaults to 5000; 0 keeps it until dismissed. The timer
   * pauses while the pointer or focus is on the toast.
   */
  @property({ type: Number })
  duration = 5000;

  protected readonly _parts = new PartsController(this, {
    tags: ['void-toast-title', 'void-toast-description', 'void-toast-actions', 'void-toast-close'],
    onChange: () => undefined,
  });

  private _timer: ReturnType<typeof setTimeout> | undefined;
  private _remaining = 0;
  private _timerStart = 0;
  private _hovered = false;
  private _focused = false;

  connectedCallback() {
    super.connectedCallback();
    this._syncRole();
    this.addEventListener('mouseenter', this._onEnter);
    this.addEventListener('mouseleave', this._onLeave);
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
    this.addEventListener('click', this._onClick);
    this._hovered = false;
    this._focused = false;
    if (this.duration > 0) {
      this._remaining = this.duration;
      this._startTimer();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
    this._timer = undefined;
    this.removeEventListener('mouseenter', this._onEnter);
    this.removeEventListener('mouseleave', this._onLeave);
    this.removeEventListener('focusin', this._onFocusIn);
    this.removeEventListener('focusout', this._onFocusOut);
    this.removeEventListener('click', this._onClick);
  }

  /**
   * The toast is a plain group, reachable by a screen reader but not a live region itself: a live region inserted
   * together with its text is commonly not announced. The container announces it instead, through its own
   * announcer elements, which exist before any toast does.
   */
  private _syncRole(): void {
    this.setHostAttribute('role', 'group');
  }

  /** What a screen reader should say for this toast: its title, then its message (or, without parts, its text). */
  announcement(): string {
    const text = (el: Element | null | undefined): string => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const title = text(this._parts.one('void-toast-title'));
    const description = text(this._parts.one('void-toast-description'));
    if (title || description) return [title, description].filter(Boolean).join('. ');
    const clone = this.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('void-toast-close, void-toast-actions').forEach(n => n.remove());
    return text(clone);
  }

  private _startTimer(): void {
    this._timerStart = Date.now();
    this._timer = setTimeout(() => this._close('timeout'), this._remaining);
  }

  private _pause(): void {
    if (this._timer === undefined) return;
    clearTimeout(this._timer);
    this._timer = undefined;
    this._remaining = Math.max(0, this._remaining - (Date.now() - this._timerStart));
  }

  private _resume(): void {
    if (this._hovered || this._focused || this._timer !== undefined || this.duration <= 0) return;
    this._startTimer();
  }

  private _onEnter = (): void => { this._hovered = true; this._pause(); };
  private _onLeave = (): void => { this._hovered = false; this._resume(); };
  private _onFocusIn = (): void => { this._focused = true; this._pause(); };
  private _onFocusOut = (e: FocusEvent): void => {
    if (e.relatedTarget instanceof Node && this.contains(e.relatedTarget)) return;
    this._focused = false;
    this._resume();
  };

  private _onClick = (e: Event): void => {
    if (!closeControlPressed(this._parts.one('void-toast-close'), e)) return;
    this._close('close-button');
  };

  /** Closes the toast: fires `void-close` (reason `api`) and removes it. */
  close(): void {
    this._close('api');
  }

  /** Fires `void-close`; a listener may cancel a close the user asked for (the close part), which keeps the toast. */
  private _close(reason: 'close-button' | 'timeout' | 'api') {
    const go = this.dispatchEvent(new CustomEvent('void-close', { bubbles: false, cancelable: reason === 'close-button', detail: { reason } }));
    if (go) removeWithFocus(this);
  }
}

if (!customElements.get('void-toast')) {
  customElements.define('void-toast', VoidToast);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-toast': VoidToast;
  }
}

/**
 * Container that manages toast positioning and provides a static show() helper for programmatic toast display.
 *
 * While it holds toasts it is shown in the top layer (a `popover="manual"`), so toasts are never clipped or buried by
 * the page's stacking contexts. A toast added while a modal dialog is open raises the container above the dialog; it
 * is visible there, but the page outside the dialog (the container included) stays inert until the dialog closes.
 */
export class VoidToastContainer extends VoidElement {
  /** Where the container sits. The corner and centre values overlay the page at a fixed position; `inline` keeps the container in normal flow so toasts push content instead of covering it. */
  @property({ type: String, reflect: true })
  placement: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' | 'inline' = 'bottom-right';

  private _observer: MutationObserver | null = null;
  private _announceTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

  connectedCallback() {
    super.connectedCallback();
    this.setHostAttribute('role', 'region');
    this.setHostAttribute('aria-label', 'Notifications');
    // Neither the toasts nor the container are live regions: the two announcers below speak for them.
    if (typeof this.showPopover === 'function') this.setHostAttribute('popover', 'manual');
    this._ensureAnnouncers();
    this._observer ??= new MutationObserver(records => {
      this._ensureAnnouncers();
      this._syncShown(records.some(r => r.addedNodes.length > 0));
      for (const r of records) {
        for (const n of r.addedNodes) if (n instanceof VoidToast) this._announce(n);
      }
    });
    this._observer.observe(this, { childList: true });
    this._syncShown(true);
    for (const toast of this.querySelectorAll(':scope > void-toast')) this._announce(toast as VoidToast);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    for (const t of this._announceTimers.values()) clearTimeout(t);
    this._announceTimers.clear();
  }

  /**
   * Two persistent, visually hidden live regions that exist from the container's connection: a polite one
   * (`role="status"`) and an assertive one (`role="alert"`). A screen reader announces text that changes inside a
   * region it already knows, so a toast's words are written here after the toast is in, never together with it.
   */
  private _ensureAnnouncers(): void {
    for (const [kind, role] of [['polite', 'status'], ['assertive', 'alert']] as const) {
      if (this.querySelector(`:scope > [data-void-announcer="${kind}"]`)) continue;
      const el = this.ownerDocument.createElement('div');
      el.setAttribute('data-void-announcer', kind);
      el.setAttribute('role', role);
      el.setAttribute('aria-live', kind);
      el.setAttribute('aria-atomic', 'true');
      el.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;pointer-events:none';
      this.prepend(el);
    }
  }

  /** Writes a toast's text into the matching announcer on a later task, after clearing it so a repeat is spoken again. */
  private _announce(toast: VoidToast): void {
    const kind = toast.color === 'error' || toast.color === 'warning' ? 'assertive' : 'polite';
    const region = this.querySelector<HTMLElement>(`:scope > [data-void-announcer="${kind}"]`);
    if (!region) return;
    clearTimeout(this._announceTimers.get(region));
    region.textContent = '';
    this._announceTimers.set(
      region,
      setTimeout(() => {
        this._announceTimers.delete(region);
        if (!toast.isConnected) return;
        region.textContent = toast.announcement();
        // Spoken by now; do not leave a stale copy of the message for a reader to find later.
        this._announceTimers.set(region, setTimeout(() => { this._announceTimers.delete(region); region.textContent = ''; }, 5000));
      }, 150),
    );
  }

  /** Shown while it holds a toast; raised to the top of the top layer when one is added. */
  private _syncShown(added: boolean): void {
    if (typeof this.showPopover !== 'function' || !this.isConnected) return;
    const has = !!this.querySelector(':scope > void-toast');
    let shown = false;
    try {
      shown = this.matches(':popover-open');
    } catch {
      shown = false;
    }
    let modal = false;
    try {
      // A modal dialog or drawer keeps its native <dialog> in a shadow root, so look at the hosts.
      modal = added && !!this.ownerDocument.querySelector('void-dialog[open], void-drawer[open], dialog:modal');
    } catch {
      modal = false;
    }
    try {
      if (has && shown && modal) {
        // Re-showing moves it above overlays opened since (a modal dialog).
        this.hidePopover();
        this.showPopover();
      } else if (has && !shown) {
        this.showPopover();
      } else if (!has && shown) {
        this.hidePopover();
      }
    } catch {
      // Not a popover in this engine, or disconnected meanwhile.
    }
  }

  /**
   * Shows a toast built from `options` and returns it. The toast it builds is the markup an author would write:
   * `<void-toast><void-toast-title>`, `<void-toast-description>`, `<void-toast-actions>` and `<void-toast-close>`
   * parts, all plain elements (text goes in as text, never as HTML).
   */
  static show(options: ToastOptions): VoidToast {
    let container = document.querySelector('void-toast-container') as VoidToastContainer | null;
    if (!container) {
      container = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(container);
    }
    const toast = buildToast(options);
    container.appendChild(toast);
    return toast;
  }
}

/** One button of the actions part of a toast built by {@link toast}. */
export interface ToastAction {
  /** Text of the button. */
  label: string;
  /** Called when the button is pressed, with the event and the toast. The toast stays open; call `toast.close()` to close it. */
  onClick?: (event: MouseEvent, toast: VoidToast) => void;
}

/** Options for {@link toast}: each one becomes a part of the toast, or an attribute of it. */
export interface ToastOptions {
  /** Text of the `<void-toast-description>` part: the message. */
  description: string;
  /** Text of the optional `<void-toast-title>` part, shown above the message. */
  title?: string;
  /** Buttons for the optional `<void-toast-actions>` part. */
  actions?: ToastAction[];
  /** The `color` attribute. */
  color?: VoidToast['color'];
  /** The `duration` attribute: milliseconds before the toast closes itself; 0 keeps it until dismissed. */
  duration?: number;
  /** Write the `<void-toast-close>` part with its button. On by default; `false` leaves it out. */
  dismissable?: boolean;
}

/** Builds a detached `<void-toast>` with the parts an author would write. */
function buildToast(options: ToastOptions): VoidToast {
  const toast = document.createElement('void-toast') as VoidToast;
  if (options.color !== undefined) toast.color = options.color;
  if (options.duration !== undefined) toast.duration = options.duration;
  const part = (tag: string, text?: string): HTMLElement => {
    const el = document.createElement(`void-toast-${tag}`);
    if (text !== undefined) el.textContent = text;
    return el;
  };
  if (options.title) toast.append(part('title', options.title));
  toast.append(part('description', options.description));
  if (options.actions?.length) {
    const actions = part('actions');
    for (const action of options.actions) {
      const button = document.createElement('void-button');
      button.setAttribute('size', 'sm');
      button.textContent = action.label;
      button.addEventListener('click', event => action.onClick?.(event as MouseEvent, toast));
      actions.append(button);
    }
    toast.append(actions);
  }
  if (options.dismissable !== false) {
    const close = part('close');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Dismiss');
    button.innerHTML = '&times;';
    close.append(button);
    toast.append(close);
  }
  return toast;
}

/**
 * Show a toast. Finds the page's `<void-toast-container>` (creating one at the
 * default position when there is none) and returns the new `<void-toast>`.
 * Same as `VoidToastContainer.show`, importable as a plain function:
 * `import { toast } from '@voidable/ui'`.
 */
export function toast(options: ToastOptions): VoidToast {
  return VoidToastContainer.show(options);
}

if (!customElements.get('void-toast-container')) {
  customElements.define('void-toast-container', VoidToastContainer);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-toast-container': VoidToastContainer;
  }
}
