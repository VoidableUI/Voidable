import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidBadge extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
  }
}

if (!customElements.get('void-badge')) {
  customElements.define('void-badge', VoidBadge);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-badge': VoidBadge;
  }
}
