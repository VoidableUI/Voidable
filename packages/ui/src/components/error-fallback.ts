import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidErrorFallback extends VoidElement {
  @property({ type: String }) heading = 'Something went wrong';
  @property({ type: String }) message = '';
  @property({ type: Boolean, reflect: true }) retryable = false;
  @property({ type: String }) retryLabel = 'Try again';
  @property({ type: Boolean }) icon = true;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'alert');
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
        ${this.retryable ? html`<button class="void-error-fallback-retry" @click="${this._retry}">${this.retryLabel}</button>` : nothing}
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
