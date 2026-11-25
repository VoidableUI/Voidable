import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Badge overlay for notification counts on icons and online presence signals on avatars. */
export class VoidIndicator extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
  @property({ type: Number, reflect: true }) count: number | null = null;
  @property({ type: Boolean, reflect: true }) ping = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'status');
  }

  updated(): void {
    this.setHostAttribute('aria-label', this.count != null ? `${this.count} ${this.count === 1 ? 'notification' : 'notifications'}` : 'notification');
  }

  // The dot is rendered after the consumer content it decorates.
  render() {
    return html`<span class="void-indicator-dot">${this.count != null ? String(this.count) : ''}</span>`;
  }
}

if (!customElements.get('void-indicator')) {
  customElements.define('void-indicator', VoidIndicator);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-indicator': VoidIndicator;
  }
}
