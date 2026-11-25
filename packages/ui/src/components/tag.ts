import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement, ProjectionController } from '../base.js';

/** Removable label chip for selected filters, applied tags, and multi-value inputs. */
export class VoidTag extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: Boolean, reflect: true }) removable = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  // Consumer content stays on the host, before the rendered remove button.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'label', target: 'before' }],
  });
  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
  }

  render() {
    if (!this.removable) return nothing;
    return html`<button type="button" class="void-tag-close" aria-label="Remove" @click="${this._remove}">×</button>`;
  }

  private _remove(): void {
    this.dispatchEvent(new CustomEvent('void-remove', { bubbles: true, composed: true }));
    this.remove();
  }
}

if (!customElements.get('void-tag')) {
  customElements.define('void-tag', VoidTag);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-tag': VoidTag;
  }
}
