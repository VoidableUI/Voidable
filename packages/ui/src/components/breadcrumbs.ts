import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Navigation trail for deep page hierarchies in dashboards, e-commerce category trees, and file browsers. */
export class VoidBreadcrumbs extends VoidElement {
  @property({ type: String }) separator = '/';

  // Each child element becomes one list item: projected into the list, in an
  // <li> of its own that the component owns.
  protected readonly _projection = new ProjectionController(this, {
    regions: [
      {
        name: 'items',
        target: () => this.querySelector(':scope > .void-breadcrumbs-list'),
        accepts: node => node.nodeType === Node.ELEMENT_NODE,
        wrap: () => {
          const li = this.ownerDocument.createElement('li');
          li.className = 'void-breadcrumbs-item';
          return li;
        },
      },
    ],
    onChange: () => this.requestUpdate(),
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'navigation');
    this.setHostAttribute('aria-label', 'Breadcrumb');
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    const items = Array.from(this.querySelectorAll(':scope > .void-breadcrumbs-list > .void-breadcrumbs-item'));
    items.forEach((li, index) => {
      if (li.getAttribute('data-separator') !== this.separator) li.setAttribute('data-separator', this.separator);
      const last = index === items.length - 1;
      if (last && li.getAttribute('aria-current') !== 'page') li.setAttribute('aria-current', 'page');
      else if (!last && li.hasAttribute('aria-current')) li.removeAttribute('aria-current');
    });
  }

  render() {
    return html`<ol class="void-breadcrumbs-list"></ol>`;
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
