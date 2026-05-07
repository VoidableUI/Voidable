import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidSidebar extends VoidElement {
  @property({ type: Boolean, reflect: true }) collapsed = false;
  @property({ type: String, reflect: true }) width = '240px';
  @property({ type: String, reflect: true }) collapsedWidth = '60px';
  @property({ type: String, reflect: true }) position: 'left' | 'right' = 'left';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Sidebar navigation');
    this._updateWidth();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('collapsed')) {
      this._updateWidth();
      this.dispatchEvent(new CustomEvent('void-toggle', {
        bubbles: true,
        composed: true,
        detail: { collapsed: this.collapsed },
      }));
    }
    if (changed.has('width') || changed.has('collapsedWidth')) {
      this._updateWidth();
    }
  }

  private _updateWidth(): void {
    this.style.setProperty('--void-sidebar-width', this.collapsed ? this.collapsedWidth : this.width);
  }
}

if (!customElements.get('void-sidebar')) {
  customElements.define('void-sidebar', VoidSidebar);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-sidebar': VoidSidebar;
  }
}
