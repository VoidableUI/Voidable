import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean } from '../converters.js';

/** Temporary notification for action confirmations, error alerts, and copy-to-clipboard feedback. */
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

  /** Show a close button. On by default; write `dismissable="false"` to hide it. */
  @property({ type: Boolean, reflect: true, converter: defaultTrueBoolean })
  dismissable = true;

  /** Bold title above the message. Optional. */
  @property({ type: String })
  heading = '';

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
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('color')) this._syncRole();
  }

  /** Errors and warnings interrupt (alert); everything else is polite (status). */
  private _syncRole(): void {
    this.setHostAttribute('role', this.color === 'error' || this.color === 'warning' ? 'alert' : 'status');
  }

  private _startTimer(): void {
    this._timerStart = Date.now();
    this._timer = setTimeout(() => this._close(), this._remaining);
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

  private _close() {
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    return html`
      ${this.heading ? html`<span class='void-toast-heading'>${this.heading}</span>` : nothing}
      ${this.dismissable ? html`<button type="button" class='void-toast-close' aria-label='Close' @click='${this._close}'>&times;</button>` : nothing}
    `;
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
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' | 'inline' = 'bottom-right';

  private _observer: MutationObserver | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.setHostAttribute('role', 'region');
    this.setHostAttribute('aria-label', 'Notifications');
    this.setHostAttribute('aria-live', 'polite');
    if (typeof this.showPopover === 'function') this.setHostAttribute('popover', 'manual');
    this._observer ??= new MutationObserver(records => this._syncShown(records.some(r => r.addedNodes.length > 0)));
    this._observer.observe(this, { childList: true });
    this._syncShown(true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
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
      modal = added && !!this.ownerDocument.querySelector('dialog:modal');
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

  static show(options: {
    message: string;
    heading?: string;
    color?: VoidToast['color'];
    duration?: number;
    dismissable?: boolean;
  }): VoidToast {
    let container = document.querySelector('void-toast-container') as VoidToastContainer | null;
    if (!container) {
      container = document.createElement('void-toast-container') as VoidToastContainer;
      document.body.appendChild(container);
    }
    const toast = document.createElement('void-toast') as VoidToast;
    if (options.color !== undefined) toast.color = options.color;
    if (options.heading !== undefined) toast.heading = options.heading;
    if (options.duration !== undefined) toast.duration = options.duration;
    if (options.dismissable !== undefined) toast.dismissable = options.dismissable;
    toast.textContent = options.message;
    container.appendChild(toast);
    return toast;
  }
}

/** Options for {@link toast}. */
export interface ToastOptions {
  message: string;
  heading?: string;
  color?: VoidToast['color'];
  /** Milliseconds before the toast closes itself; 0 keeps it until dismissed. */
  duration?: number;
  dismissable?: boolean;
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
