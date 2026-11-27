import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { msg, nameHost } from '../messages.js';

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
 *
 * Add `landmark="none"` when the page keeps one navigation region: the trail is then a named group of the same
 * list. Inside a `<nav>` or an element with `role="navigation"` it is never a landmark, whatever this says, so
 * landmarks do not nest.
 */
export class VoidBreadcrumbs extends VoidElement {
  /**
   * `none` makes the trail a named `group` instead of a `navigation` landmark, for a page that keeps a single
   * navigation region. Any other value (the default) is a landmark. Inside a `<nav>` or an element with
   * `role="navigation"` it is never a landmark, whatever this says.
   */
  @property({ type: String, reflect: true }) landmark: 'navigation' | 'none' = 'navigation';

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
    this._role();
    this._name();
  }

  /** `navigation`, unless the author opted out or an enclosing navigation already is the landmark. */
  private _role(): void {
    const landmark = this.landmark !== 'none' && !this.parentElement?.closest('nav, [role="navigation"]');
    this.setHostAttribute('role', landmark ? 'navigation' : 'group');
  }

  /** The landmark's name: the author's `aria-label`, else the message. */
  private _name(): void {
    nameHost(this, msg(this, 'breadcrumbs.label'), (n, v) => this.setHostAttribute(n, v));
  }

  protected override updated(changed: Map<string, unknown>): void {
    this._name();
    if (changed.has('landmark')) this._role();
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
