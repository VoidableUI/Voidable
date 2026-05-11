import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Animated open/close toggle for mobile navigation menus and collapsible sidebars. */
export class VoidHamburger extends VoidElement {
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-expanded', String(this.active));
    this.setAttribute('aria-label', this.active ? 'Close menu' : 'Menu');
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('active')) {
      this.setAttribute('aria-expanded', String(this.active));
      this.setAttribute('aria-label', this.active ? 'Close menu' : 'Menu');
    }
  }

  private _handleClick = (): void => {
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
