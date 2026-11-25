import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Content placeholder during data loading for cards, lists, and profile pages to prevent layout shift. */
export class VoidSkeleton extends VoidElement {
  /**
   * Shape of the placeholder: `text` (one line of text, default), `circular` (for an avatar) or
   * `rectangular` (for an image or card). Size it with CSS width and height.
   */
  @property({ type: String, reflect: true }) variant: 'text' | 'circular' | 'rectangular' = 'text';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'presentation');
    this.setHostAttribute('aria-hidden', 'true');
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
