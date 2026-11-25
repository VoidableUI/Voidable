import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/**
 * Content grouping container for dashboard widgets, product listings, and media previews.
 *
 * Its regions are parts, in this order: an optional `<void-card-header>` (holding a `<void-card-title>` and an
 * optional `<void-card-description>`), the `<void-card-body>`, and an optional `<void-card-footer>`. The parts are
 * CSS-only and the card renders nothing of its own, so the markup looks the same before and after the script
 * loads and survives any morph or re-render.
 */
export class VoidCard extends VoidElement {
  /** Surface style: `default`, `elevated` (lifted, with a shadow) or `bordered` (a visible border). */
  @property({ type: String, reflect: true }) variant: 'default' | 'elevated' | 'bordered' = 'default';
  /**
   * Space around the card's parts: `none`, `sm`, `md` (default) or `lg`. Use `none` for edge-to-edge
   * content such as a table or an image.
   */
  @property({ type: String, reflect: true }) padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
}

if (!customElements.get('void-card')) {
  customElements.define('void-card', VoidCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-card': VoidCard;
  }
}
