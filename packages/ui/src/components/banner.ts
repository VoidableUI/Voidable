import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement, ProjectionController } from '../base.js';

/** Full-width site-level announcement for maintenance windows, cookie consent, and promotional messaging. */
export class VoidBanner extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: Boolean, reflect: true }) dismissable = false;
  @property({ type: String, reflect: true }) variant: 'subtle' | 'filled' = 'subtle';

  // Consumer content stays on the host, after the rendered close button.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'content', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'banner');
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    if (!this.dismissable) return nothing;
    return html`<button type="button" class="void-banner-close" aria-label="Close" @click="${this._close}">&times;</button>`;
  }
}

if (!customElements.get('void-banner')) {
  customElements.define('void-banner', VoidBanner);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-banner': VoidBanner;
  }
}
