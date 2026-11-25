import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { attachChrome } from '../parts.js';

/**
 * Inline contextual message for form validation feedback, permission warnings, and system status notices.
 *
 * Its text is written as parts: an optional `<void-alert-title>` and a `<void-alert-description>`. The parts are
 * CSS-only and never moved. With `dismissible`, the alert adds a close button of its own (internal, styled by the
 * theme as `::part(close)`), so the author's markup stays the final DOM.
 *
 * @csspart close - The close button of a `dismissible` alert.
 * @fires {CustomEvent} void-dismiss - The close button was pressed; the alert removes itself afterwards.
 */
export class VoidAlert extends VoidElement {
  /**
   * Status colour of the message: `default`, `error`, `warning`, `caution`, `success`, `info` or
   * `notice`. Pick the one that matches the meaning (error for a failure, success for a confirmation).
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' = 'default';
  /** Show a close button. Clicking it fires `void-dismiss` and removes the alert from the page. */
  @property({ type: Boolean, reflect: true }) dismissible = false;
  /**
   * `subtle` (default) tints the background; `filled` fills it with the status colour for a louder
   * message.
   */
  @property({ type: String, reflect: true }) variant: 'subtle' | 'filled' = 'subtle';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'alert');
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (!changed.has('dismissible')) return;
    // The close button exists only once the alert is dismissible; a shadow root
    // with a single slot renders the author's children exactly as before.
    if (!this.dismissible && !this.shadowRoot) return;
    const root = attachChrome(this, '<slot></slot><button type="button" part="close" aria-label="Dismiss">&times;</button>');
    const button = root.querySelector('button')!;
    button.hidden = !this.dismissible;
    button.onclick = () => this._dismiss();
  }

  private _dismiss(): void {
    this.dispatchEvent(new CustomEvent('void-dismiss', { bubbles: true, composed: true }));
    this.remove();
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
