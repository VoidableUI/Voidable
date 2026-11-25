import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean } from '../converters.js';

/** Error state display for failed data fetches and unexpected runtime errors; includes an optional retry action. */
export class VoidErrorFallback extends VoidElement {
  /** Headline of the error state. Defaults to `Something went wrong`. */
  @property({ type: String }) heading = 'Something went wrong';
  /** Detail shown under the headline, such as what failed or what to try. Optional. */
  @property({ type: String }) message = '';
  /**
   * Show a retry button. Clicking it fires `void-retry`; the element does not retry anything itself, so
   * listen for the event and reload.
   */
  @property({ type: Boolean, reflect: true }) retryable = false;
  /** Text of the retry button. Defaults to `Try again`. Only used with `retryable`. */
  @property({ type: String, attribute: 'retry-label' }) retryLabel = 'Try again';
  /** Show the warning icon above the headline. On by default; write `icon="false"` to hide it. */
  @property({ type: Boolean, converter: defaultTrueBoolean }) icon = true;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'alert');
  }

  private _retry(): void {
    this.dispatchEvent(new CustomEvent('void-retry', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="void-error-fallback-content">
        ${this.icon ? html`<span class="void-error-fallback-icon">&#9888;</span>` : nothing}
        <span class="void-error-fallback-heading">${this.heading}</span>
        ${this.message ? html`<span class="void-error-fallback-message">${this.message}</span>` : nothing}
        ${this.retryable ? html`<button type="button" class="void-error-fallback-retry" @click="${this._retry}">${this.retryLabel}</button>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('void-error-fallback')) {
  customElements.define('void-error-fallback', VoidErrorFallback);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-error-fallback': VoidErrorFallback;
  }
}
