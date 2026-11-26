import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { closeControlPressed, removeWithFocus } from '../dismiss.js';

/**
 * Inline contextual message for form validation feedback, permission warnings, and system status notices.
 *
 * Its role follows the colour: `error` and `warning` are `role="alert"` (announced at once, interrupting), every
 * other colour is `role="status"` (announced politely). A role you write on it is kept.
 *
 * Its text is written as parts: an optional `<void-alert-title>`, the `<void-alert-description>` and an optional
 * `<void-alert-close>`. The parts are never moved. The close part wraps the one control the author writes (a
 * `<button type="button" aria-label="Dismiss">`); pressing it fires `void-close` and, unless that is cancelled, removes the alert (focus inside
 * it moves on to the next focusable element). Without a close part the alert cannot be dismissed.
 *
 * @fires {CustomEvent<{ reason: 'close-button' }>} void-close - The close control was pressed. Cancelable: `preventDefault()`
 *   keeps the alert; otherwise it removes itself afterwards. Does not bubble.
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
    this._syncRole();
    this.addEventListener('click', this._onClick);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('color')) this._syncRole();
  }

  /**
   * `alert` (assertive: it interrupts) only for the urgent colours, `error` and `warning`; every other
   * alert is `status` (polite). A role the author wrote is left alone.
   */
  private _syncRole(): void {
    const current = this.getAttribute('role');
    if (current !== null && current !== this._writtenRole) return;
    this._writtenRole = this.color === 'error' || this.color === 'warning' ? 'alert' : 'status';
    this.setHostAttribute('role', this._writtenRole);
  }

  /** The role this alert wrote itself, so one the author wrote is told apart from it. */
  private _writtenRole: string | null = null;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }

  private _onClick = (e: Event): void => {
    if (!closeControlPressed(this._parts.one('void-alert-close'), e)) return;
    const go = this.dispatchEvent(new CustomEvent('void-close', { bubbles: false, cancelable: true, detail: { reason: 'close-button' } }));
    if (go) removeWithFocus(this);
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
