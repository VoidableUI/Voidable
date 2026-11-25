import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Content grouping container for dashboard widgets, product listings, and media previews. */
export class VoidCard extends VoidElement {
  /** Text of the card's header row. Leave it out for a card with no header. */
  @property({ type: String }) heading = '';
  /** Surface style: `default`, `elevated` (lifted, with a shadow) or `outlined` (a visible border). */
  @property({ type: String, reflect: true }) variant: 'default' | 'elevated' | 'outlined' = 'default';
  /**
   * Space around the card body: `none`, `sm`, `md` (default) or `lg`. Use `none` for edge-to-edge
   * content such as a table or an image.
   */
  @property({ type: String, reflect: true }) padding: 'none' | 'sm' | 'md' | 'lg' = 'md';

  // Consumer content is projected into the card body.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'body', target: () => this.querySelector(':scope > .void-card-body') }],
  });

  render() {
    return html`${this.heading
      ? html`<div class="void-card-header"><span class="void-card-heading">${this.heading}</span></div>`
      : nothing}<div class="void-card-body"></div>`;
  }
}

if (!customElements.get('void-card')) {
  customElements.define('void-card', VoidCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-card': VoidCard;
  }
}
