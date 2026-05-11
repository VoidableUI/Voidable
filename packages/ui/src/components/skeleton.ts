import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Content placeholder during data loading for cards, lists, and profile pages to prevent layout shift. */
export class VoidSkeleton extends VoidElement {
  @property({ type: String, reflect: true }) variant: 'text' | 'circular' | 'rectangular' = 'text';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'presentation');
    this.setAttribute('aria-hidden', 'true');
  }
}

if (!customElements.get('void-skeleton')) {
  customElements.define('void-skeleton', VoidSkeleton);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-skeleton': VoidSkeleton;
  }
}
