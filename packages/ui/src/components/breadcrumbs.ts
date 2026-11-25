import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/**
 * Navigation trail for deep page hierarchies in dashboards, e-commerce category trees, and file browsers.
 *
 * Write one `<void-breadcrumbs-item>` per crumb, each holding a link (or plain text for the page you are on).
 * Mark the current page with `aria-current="page"` on its item. The items are CSS-only parts and the trail
 * renders nothing of its own: the separators are drawn by the theme between the items, so reordering, keying or
 * morphing the items needs nothing from the component.
 */
export class VoidBreadcrumbs extends VoidElement {
  /**
   * Character drawn between the crumbs. Defaults to `/`. It is drawn by CSS and hidden from assistive
   * technology.
   */
  @property({ type: String }) separator = '/';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'navigation');
    this.setHostAttribute('aria-label', 'Breadcrumb');
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('separator')) {
      // A CSS string, read by `content` in breadcrumbs.css.
      this.setHostStyle('--_void-breadcrumbs-separator', JSON.stringify(this.separator)); // style-ok
    }
  }
}

if (!customElements.get('void-breadcrumbs')) {
  customElements.define('void-breadcrumbs', VoidBreadcrumbs);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-breadcrumbs': VoidBreadcrumbs;
  }
}
