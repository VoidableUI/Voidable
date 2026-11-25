import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Inline contextual message for form validation feedback, permission warnings, and system status notices. */
export class VoidAlert extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: Boolean, reflect: true }) dismissible = false;
  @property({ type: String, reflect: true }) variant: 'subtle' | 'filled' = 'subtle';

  // Consumer content stays on the host, after the rendered close button.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'content', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'alert');
  }

  private _dismiss(): void {
    this.dispatchEvent(new CustomEvent('void-dismiss', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    if (!this.dismissible) return nothing;
    return html`<button type="button" class="void-alert-close" aria-label="Dismiss" @click="${this._dismiss}">&times;</button>`;
  }
}

if (!customElements.get('void-alert')) {
  customElements.define('void-alert', VoidAlert);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-alert': VoidAlert;
  }
}
