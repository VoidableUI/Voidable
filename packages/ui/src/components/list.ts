import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Structured item list for menus, option sets, and content feeds with consistent spacing and optional dividers. */
export class VoidList extends VoidElement {
  @property({ type: Boolean, reflect: true }) dividers = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'list');
  }

}

if (!customElements.get('void-list')) {
  customElements.define('void-list', VoidList);
}

/** Individual selectable item within a VoidList. */
export class VoidListItem extends VoidElement {
  @property({ type: Boolean, reflect: true }) selected = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) interactive = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
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
