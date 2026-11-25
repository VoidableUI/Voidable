import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';

const LIST = 'void-breadcrumbs-list';
const ITEM = 'void-breadcrumbs-item';

/**
 * Navigation trail for deep page hierarchies in dashboards, e-commerce category trees, and file browsers.
 *
 * A navigation landmark named "Breadcrumb" holding an ordered list, as in the ARIA Authoring Practices breadcrumb
 * pattern: write one `<void-breadcrumbs-list>` and, in it, one `<void-breadcrumbs-item>` per crumb, each holding a
 * link (or plain text for the page you are on). Mark the current page with `aria-current="page"` on its item. The
 * list and the items are CSS-only parts; the component gives them `role="list"` and `role="listitem"` (so a screen
 * reader says "list, 3 items" and "2 of 3"), also for items added, removed or reordered later. It renders nothing of
 * its own: the separators are drawn by the theme between the items and are not exposed to assistive technology.
 */
export class VoidBreadcrumbs extends VoidElement {
  /**
   * Character drawn between the crumbs. Defaults to `/`. It is drawn by CSS and hidden from assistive
   * technology.
   */
  @property({ type: String }) separator = '/';

  protected readonly _parts = new PartsController(this, {
    tags: [LIST, ITEM],
    onChange: () => this._wire(),
  });

  /** Writes the list and list-item roles onto the parts: items count only inside the list part. */
  private _wire(): void {
    const list = this._parts.one(LIST);
    if (list) this._parts.set(list, 'role', 'list');
    for (const item of this._parts.within(list, ITEM)) this._parts.set(item, 'role', 'listitem');
  }

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
