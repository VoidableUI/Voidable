import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Collapsible side navigation for app shells, admin panels, and documentation sites. */
export class VoidSidebar extends VoidElement {
  /**
   * Show the narrow, collapsed width. Toggling it fires `void-toggle` with `{ collapsed }`; the element
   * has no built-in toggle button, so wire one (for example a `void-hamburger`) to this attribute.
   */
  @property({ type: Boolean, reflect: true }) collapsed = false;
  /** CSS width when expanded. Defaults to the theme's `--void-sidebar-width`. */
  @property({ type: String, reflect: true }) width = 'var(--void-sidebar-width)';
  /** CSS width when collapsed. Defaults to the theme's `--void-sidebar-collapsed-width`. */
  @property({ type: String, attribute: 'collapsed-width', reflect: true }) collapsedWidth = 'var(--void-sidebar-collapsed-width)';
  /** Which side of the page the sidebar sits on: `left` (default) or `right`. */
  @property({ type: String, reflect: true }) position: 'left' | 'right' = 'left';

  private _initialised = false;

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
    if (changed.has('collapsed')) {
      this._updateWidth();
      // The first update reports initialised properties as changed; that is
      // not a toggle, so stay quiet until the user-visible state changes.
      if (this._initialised) {
        this.dispatchEvent(new CustomEvent('void-toggle', {
          bubbles: true,
          composed: true,
          detail: { collapsed: this.collapsed },
        }));
      }
    }
    this._initialised = true;
    if (changed.has('width') || changed.has('collapsedWidth')) {
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
