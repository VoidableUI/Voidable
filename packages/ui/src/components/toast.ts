import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidToast extends VoidElement {
  @property({ type: String, reflect: true })
  color: 'default' | 'error' | 'warning' | 'success' | 'info' = 'default';

  @property({ type: Number })
  duration = 5000;

  @property({ type: Boolean, reflect: true })
  dismissable = true;

  @property({ type: String })
  heading = '';

  private _timer: ReturnType<typeof setTimeout> | undefined;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    if (this.duration > 0) {
      this._timer = setTimeout(() => this._close(), this.duration);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    return html`
      ${this.heading ? html`<span class='void-toast-heading'>${this.heading}</span>` : nothing}
      <slot></slot>
      ${this.dismissable ? html`<button class='void-toast-close' aria-label='Close' @click='${this._close}'>&times;</button>` : nothing}
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

export class VoidToastContainer extends VoidElement {
  @property({ type: String, reflect: true })
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' = 'bottom-right';

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Notifications');
    this.setAttribute('aria-live', 'polite');
  }

  render() {
    return nothing;
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

if (!customElements.get('void-toast-container')) {
  customElements.define('void-toast-container', VoidToastContainer);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-toast-container': VoidToastContainer;
  }
}
