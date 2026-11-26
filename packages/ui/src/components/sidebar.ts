import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { msg, nameHost } from '../messages.js';

/**
 * Collapsible side navigation for app shells, admin panels, and documentation sites.
 *
 * @fires {CustomEvent<{ reason: 'api' }>} void-collapse - `toggle()` collapsed it. Does not bubble.
 * @fires {CustomEvent<{ reason: 'api' }>} void-expand - `toggle()` expanded it. Does not bubble.
 */
export class VoidSidebar extends VoidElement {
  /**
   * Show the narrow, collapsed width (a rail that stays on screen, not a closed panel). `toggle()` fires
   * `void-collapse` or `void-expand`; the element
   * has no built-in toggle button, so wire one (for example a `void-hamburger`) to this attribute.
   */
  @property({ type: Boolean, reflect: true }) collapsed = false;
  /** CSS width when expanded. Defaults to the theme's `--void-sidebar-width`. */
  @property({ type: String, reflect: true }) width = 'var(--void-sidebar-width)';
  /** CSS width when collapsed. Defaults to the theme's `--void-sidebar-collapsed-width`. */
  @property({ type: String, attribute: 'collapsed-width', reflect: true }) collapsedWidth = 'var(--void-sidebar-collapsed-width)';
  /** Which side of the content the sidebar sits on, in the reading direction: `start` (default) or `end`. */
  @property({ type: String, reflect: true }) side: 'start' | 'end' = 'start';

  /**
   * Collapses or expands the sidebar on behalf of the user (call it from the
   * control that toggles it, such as a `void-hamburger`) and dispatches
   * `void-collapse` or `void-expand`. Setting `collapsed` directly, or the
   * server changing the attribute, dispatches nothing.
   */
  toggle(force?: boolean): void {
    const next = force ?? !this.collapsed;
    if (next === this.collapsed) return;
    this.collapsed = next;
    const detail = { reason: 'api' as const };
    if (this.collapsed) this.dispatchEvent(new CustomEvent('void-collapse', { bubbles: false, detail }));
    else this.dispatchEvent(new CustomEvent('void-expand', { bubbles: false, detail }));
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'navigation');
    this._name();
    this._updateWidth();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  private _name(): void {
    nameHost(this, msg(this, 'sidebar.label'), (n, v) => this.setHostAttribute(n, v));
  }

  updated(changed: Map<string, unknown>): void {
    this._name();
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
