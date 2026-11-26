import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { closeControlPressed, removeWithFocus } from '../dismiss.js';

/**
 * Full-width site-level announcement for maintenance windows, cookie consent, and promotional messaging.
 *
 * Its text is written as parts: an optional `<void-banner-title>`, the `<void-banner-description>`, an optional
 * `<void-banner-actions>` (buttons or links) and an optional `<void-banner-close>`. The parts are never moved. The
 * close part wraps the one control the author writes (a `<void-button aria-label="Dismiss">`); pressing it fires
 * `void-close` and removes the banner (focus inside it moves on to the next focusable element). Without a close part the banner cannot be dismissed.
 *
 * @fires {CustomEvent} void-close - The close control was pressed; the banner removes itself afterwards.
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
    this.setHostAttribute('role', 'banner');
    this.addEventListener('click', this._onClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }

  private _onClick = (e: Event): void => {
    if (!closeControlPressed(this._parts.one('void-banner-close'), e)) return;
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
    removeWithFocus(this);
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
