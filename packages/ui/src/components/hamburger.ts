import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { isInDisabledFieldset, watchDisabledAncestors } from '../form-control.js';

/** Animated open/close toggle for mobile navigation menus and collapsible sidebars. */
export class VoidHamburger extends VoidElement {
  /**
   * Whether the menu it controls is open: draws the lines as a close cross and sets `aria-expanded`. It
   * flips on every click and Enter or Space, and fires `void-toggle`; set it yourself when the menu
   * closes some other way.
   */
  @property({ type: Boolean, reflect: true }) active = false;
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
    this.setHostAttribute('aria-expanded', String(this.active));
    this.setHostAttribute('aria-label', this.active ? 'Close menu' : 'Menu');
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
    this._unwatch?.();
    this._unwatch = null;
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('active')) {
      this.setHostAttribute('aria-expanded', String(this.active));
      this.setHostAttribute('aria-label', this.active ? 'Close menu' : 'Menu');
    }
  }

  private _handleClick = (): void => {
    if (isInDisabledFieldset(this)) return;
    this.active = !this.active;
    this.dispatchEvent(new CustomEvent('void-toggle', {
      bubbles: true,
      composed: true,
      detail: { active: this.active },
    }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this._handleClick();
    }
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
