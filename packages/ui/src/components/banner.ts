import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { closeControlPressed, removeWithFocus } from '../dismiss.js';

/**
 * Full-width site-level announcement for maintenance windows, cookie consent, and promotional messaging.
 *
 * It never has the `banner` role: that is the page header landmark (at most one per page, never inside
 * `<main>`), which an announcement is not. Like the alert it carries an announcement, so its role follows its
 * `color`: `alert` for `error` and `warning`, `status` for the rest. To make it a landmark users can jump to,
 * write `role="region"` and an `aria-label`; the component leaves a role you write alone.
 *
 * Its text is written as parts: an optional `<void-banner-title>`, the `<void-banner-description>`, an optional
 * `<void-banner-actions>` (buttons or links) and an optional `<void-banner-close>`. The parts are never moved. The
 * close part wraps the one control the author writes (a `<void-button aria-label="Dismiss">`); pressing it fires
 * `void-close` and removes the banner (focus inside it moves on to the next focusable element). Without a close part the banner cannot be dismissed.
 *
 * @fires {CustomEvent<{ reason: 'close-button' }>} void-close - The close part was pressed; the banner removes itself
 * afterwards unless a listener cancels the event. Does not bubble.
 */
export class VoidBanner extends VoidElement {
  /**
   * Status colour of the announcement: `default`, `error`, `warning`, `caution`, `success`, `info`,
   * `notice` or `highlight`.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** `subtle` (default) tints the background; `filled` fills it with the status colour. */
  @property({ type: String, reflect: true }) variant: 'subtle' | 'filled' = 'subtle';

  protected readonly _parts = new PartsController(this, {
    tags: ['void-banner-title', 'void-banner-description', 'void-banner-actions', 'void-banner-close'],
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

  /** `alert` for the urgent colours, `status` otherwise; a role the author wrote is left alone. */
  private _syncRole(): void {
    const current = this.getAttribute('role');
    if (current !== null && current !== this._writtenRole) return;
    this._writtenRole = this.color === 'error' || this.color === 'warning' ? 'alert' : 'status';
    this.setHostAttribute('role', this._writtenRole);
  }

  private _writtenRole: string | null = null;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }

  private _onClick = (e: Event): void => {
    if (!closeControlPressed(this._parts.one('void-banner-close'), e)) return;
    const go = this.dispatchEvent(new CustomEvent('void-close', { bubbles: false, cancelable: true, detail: { reason: 'close-button' } }));
    if (go) removeWithFocus(this);
  };
}

if (!customElements.get('void-banner')) {
  customElements.define('void-banner', VoidBanner);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-banner': VoidBanner;
  }
}
