import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Small status chip for issue trackers, tag systems, and categorization UIs where color conveys state at a glance. */
export class VoidBadge extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) variant: 'filled' | 'outline' = 'filled';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'status');
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
