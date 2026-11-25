import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Structured item list for menus, option sets, and content feeds with consistent spacing and optional dividers. */
export class VoidList extends VoidElement {
  /** Draw a hairline between items. */
  @property({ type: Boolean, reflect: true }) dividers = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'list');
  }

}

if (!customElements.get('void-list')) {
  customElements.define('void-list', VoidList);
}

/** Individual selectable item within a VoidList. */
export class VoidListItem extends VoidElement {
  /**
   * Mark the item as the current choice: it is drawn highlighted. It is a visual state only; it is not
   * exposed to assistive technology.
   */
  @property({ type: Boolean, reflect: true }) selected = false;
  /** Dim the item and stop it firing `void-click`. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Make the item behave like a button: a hover and focus style, and a click fires `void-click`. Without
   * it the item is static and fires nothing.
   */
  @property({ type: Boolean, reflect: true }) interactive = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'listitem');
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (_changed.has('interactive')) {
      if (this.interactive) {
        this.addEventListener('click', this._handleClick);
      } else {
        this.removeEventListener('click', this._handleClick);
      }
    }
  }

  private _handleClick = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('void-click', {
      bubbles: true,
      composed: true,
      detail: {},
    }));
  };

}

if (!customElements.get('void-list-item')) {
  customElements.define('void-list-item', VoidListItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-list': VoidList;
    'void-list-item': VoidListItem;
  }
}
