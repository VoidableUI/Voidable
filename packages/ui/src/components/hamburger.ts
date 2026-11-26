import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { isInDisabledFieldset, watchDisabledAncestors } from '../form-control.js';
import { useProjection } from '../projection.js';

useProjection();

/**
 * Animated open/close toggle for mobile navigation menus and collapsible sidebars.
 *
 * @fires {CustomEvent<{ reason: 'trigger' }>} void-open - The user opened it (click, Enter or Space). Does not bubble.
 * @fires {CustomEvent<{ reason: 'trigger' }>} void-close - The user closed it. Does not bubble.
 */
export class VoidHamburger extends VoidElement {
  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, { disabled: () => isInDisabledFieldset(this) });

  /**
   * Whether the menu it controls is open: draws the lines as a close cross and sets `aria-expanded`. It
   * flips on every click and Enter or Space, firing `void-open` or `void-close`; set it yourself when the
   * menu closes some other way.
   */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private _unwatch: (() => void) | null = null;

  /** Inside a `<fieldset disabled>` it ignores clicks and keys and leaves the tab order, as a native button does. */
  private _syncDisabled(): void {
    const off = isInDisabledFieldset(this);
    this.setHostAttribute('aria-disabled', off ? 'true' : null);
    this.setHostAttribute('tabindex', off ? '-1' : '0');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this._syncDisabled();
    this._unwatch = watchDisabledAncestors(this, () => this._syncDisabled());
    this.setHostAttribute('aria-expanded', String(this.open));
    this.setHostAttribute('aria-label', this.open ? 'Close menu' : 'Menu');
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this._unwatch?.();
    this._unwatch = null;
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) {
      this.setHostAttribute('aria-expanded', String(this.open));
      this.setHostAttribute('aria-label', this.open ? 'Close menu' : 'Menu');
    }
  }

  private _handleClick = (): void => {
    if (isInDisabledFieldset(this)) return;
    this.open = !this.open;
    const detail = { reason: 'trigger' as const };
    if (this.open) this.dispatchEvent(new CustomEvent('void-open', { bubbles: false, detail }));
    else this.dispatchEvent(new CustomEvent('void-close', { bubbles: false, detail }));
  };

  render() {
    return html`
      <span class="void-hamburger-lines">
        <span class="void-hamburger-line"></span>
        <span class="void-hamburger-line"></span>
        <span class="void-hamburger-line"></span>
      </span>
    `;
  }
}

if (!customElements.get('void-hamburger')) {
  customElements.define('void-hamburger', VoidHamburger);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-hamburger': VoidHamburger;
  }
}
