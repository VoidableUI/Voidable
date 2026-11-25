import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { closeControlPressed, removeWithFocus } from '../dismiss.js';

/**
 * Inline contextual message for form validation feedback, permission warnings, and system status notices.
 *
 * Its text is written as parts: an optional `<void-alert-title>`, the `<void-alert-description>` and an optional
 * `<void-alert-close>`. The parts are never moved. The close part wraps the one control the author writes (a
 * `<button type="button" aria-label="Dismiss">`); pressing it fires `void-close` and removes the alert (focus inside
 * it moves on to the next focusable element). Without a close part the alert cannot be dismissed.
 *
 * @fires {CustomEvent} void-close - The close control was pressed; the alert removes itself afterwards.
 */
export class VoidAlert extends VoidElement {
  /**
   * Status colour of the message: `default`, `error`, `warning`, `caution`, `success`, `info`,
   * `notice` or `highlight`. Pick the one that matches the meaning (error for a failure, success for a confirmation).
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /**
   * `subtle` (default) tints the background; `filled` fills it with the status colour for a louder
   * message.
   */
  @property({ type: String, reflect: true }) variant: 'subtle' | 'filled' = 'subtle';

  protected readonly _parts = new PartsController(this, {
    tags: ['void-alert-title', 'void-alert-description', 'void-alert-close'],
    onChange: () => undefined,
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'alert');
    this.addEventListener('click', this._onClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }

  private _onClick = (e: Event): void => {
    if (!closeControlPressed(this._parts.one('void-alert-close'), e)) return;
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
    removeWithFocus(this);
  };
}

if (!customElements.get('void-alert')) {
  customElements.define('void-alert', VoidAlert);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-alert': VoidAlert;
  }
}
