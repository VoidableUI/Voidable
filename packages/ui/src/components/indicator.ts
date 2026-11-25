import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Badge overlay for notification counts on icons and online presence signals on avatars. */
export class VoidIndicator extends VoidElement {
  /** Status colour of the dot: `default`, `error`, `warning`, `caution`, `success`, `info` or `notice`. */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' = 'default';
  /**
   * Which corner of the wrapped content the dot sits on: `top-right` (default), `top-left`,
   * `bottom-right` or `bottom-left`.
   */
  @property({ type: String, reflect: true }) position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
  /**
   * Number shown in the dot, such as unread notifications. Without it the dot is a plain presence
   * marker. The accessible name becomes `N notifications`.
   */
  @property({ type: Number, reflect: true }) count: number | null = null;
  /**
   * Draw an expanding ring around the dot to draw attention. It is not drawn when the user prefers
   * reduced motion.
   */
  @property({ type: Boolean, reflect: true }) ping = false;
  /** Size step: `sm`, `md` (default), `lg`, `xl` or `xxl`. */
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
