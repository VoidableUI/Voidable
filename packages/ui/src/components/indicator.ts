import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Badge overlay for notification counts on icons and online presence signals on avatars. */
export class VoidIndicator extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
  @property({ type: Number, reflect: true }) count: number | null = null;
  @property({ type: Boolean, reflect: true }) ping = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  private _dot!: HTMLSpanElement;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this._dot = document.createElement('span');
    this._dot.className = 'void-indicator-dot';
    this._updateDot();
    this.appendChild(this._dot);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._dot?.remove();
  }

  updated(): void {
    this._updateDot();
  }

  private _updateDot(): void {
    if (!this._dot) return;
    this._dot.textContent = this.count != null ? String(this.count) : '';
    this.setAttribute('aria-label', this.count != null ? `${this.count} notifications` : 'notification');
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
