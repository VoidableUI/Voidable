import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Navigation trail for deep page hierarchies in dashboards, e-commerce category trees, and file browsers. */
export class VoidBreadcrumbs extends VoidElement {
  @property({ type: String }) separator = '/';

  private _items: Element[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Breadcrumb');
    if (!this._didSetup) {
      this._items = Array.from(this.children);
    }
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSetup) {
      this._didSetup = true;
      const list = this.querySelector('.void-breadcrumbs-list');
      if (!list) return;
      this._items.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'void-breadcrumbs-item';
        li.setAttribute('data-separator', this.separator);
        if (index === this._items.length - 1) {
          li.setAttribute('aria-current', 'page');
        }
        li.appendChild(item);
        list.appendChild(li);
      });
    } else if (_changed.has('separator')) {
      const lis = Array.from(this.querySelectorAll('.void-breadcrumbs-item'));
      for (const li of lis) {
        li.setAttribute('data-separator', this.separator);
      }
    }
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
