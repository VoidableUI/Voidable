import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Collapsible side navigation for app shells, admin panels, and documentation sites. */
export class VoidSidebar extends VoidElement {
  @property({ type: Boolean, reflect: true }) collapsed = false;
  @property({ type: String, reflect: true }) width = 'var(--void-sidebar-width)';
  @property({ type: String, attribute: 'collapsed-width', reflect: true }) collapsedWidth = 'var(--void-sidebar-collapsed-width)';
  @property({ type: String, reflect: true }) position: 'left' | 'right' = 'left';

  /**
   * Collapses or expands the sidebar on behalf of the user (call it from the
   * control that toggles it, such as a `void-hamburger`) and dispatches
   * `void-toggle` with `{ collapsed }`. Setting `collapsed` directly, or the
   * server changing the attribute, dispatches nothing.
   *
   * @fires void-toggle
   */
  toggle(force?: boolean): void {
    const next = force ?? !this.collapsed;
    if (next === this.collapsed) return;
    this.collapsed = next;
    this.dispatchEvent(new CustomEvent('void-toggle', {
      bubbles: true,
      composed: true,
      detail: { collapsed: this.collapsed },
    }));
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'navigation');
    this.setHostAttribute('aria-label', 'Sidebar navigation');
    this._updateWidth();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('collapsed') || changed.has('width') || changed.has('collapsedWidth')) {
      this._updateWidth();
    }
  }

  private _updateWidth(): void {
    this.setHostStyle('--void-sidebar-width', this.collapsed ? this.collapsedWidth : this.width);
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
