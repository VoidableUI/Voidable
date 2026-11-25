import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Inline contextual message for form validation feedback, permission warnings, and system status notices. */
export class VoidAlert extends VoidElement {
  /**
   * Status colour of the message: `default`, `error`, `warning`, `caution`, `success`, `info`,
   * `notice` or `highlight`. Pick the one that matches the meaning (error for a failure, success for a confirmation).
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Show a close button. Clicking it fires `void-dismiss` and removes the alert from the page. */
  @property({ type: Boolean, reflect: true }) dismissible = false;
  /**
   * `subtle` (default) tints the background; `filled` fills it with the status colour for a louder
   * message.
   */
  @property({ type: String, reflect: true }) variant: 'subtle' | 'filled' = 'subtle';

  // Consumer content stays on the host, after the rendered close button.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'content', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'alert');
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
