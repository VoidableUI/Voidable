import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/**
 * Removable label chip for selected filters, applied tags, and multi-value inputs.
 *
 * Inside a `<void-list>` or an element with `role="list"` a tag is a list item (`role="listitem"`);
 * anywhere else it has no role.
 */
export class VoidTag extends VoidElement {
  /** Status colour: `default`, `error`, `warning`, `caution`, `success`, `info` or `notice`. */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' = 'default';
  /** Show a remove button. Clicking it fires `void-remove` and removes the tag from the page. */
  @property({ type: Boolean, reflect: true }) removable = false;
  /** Size step: `sm`, `md` (default), `lg`, `xl` or `xxl`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  // Consumer content stays on the host, before the rendered remove button.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'label', target: 'before' }],
  });
  /**
   * A list item only inside a list: a `<void-list>` or an element with `role="list"` (a row of tags marked
   * up as a list). Anywhere else a tag is a plain chip with no role, as `listitem` outside a list is invalid.
   */
  connectedCallback(): void {
    super.connectedCallback();
    const parent = this.parentElement;
    const inList = !!parent && (parent.localName === 'void-list' || parent.getAttribute('role') === 'list');
    this.setHostAttribute('role', inList ? 'listitem' : null);
  }

  render() {
    if (!this.removable) return nothing;
    return html`<button type="button" class="void-tag-close" aria-label="Remove" @click="${this._remove}">×</button>`;
  }

  private _remove(): void {
    this.dispatchEvent(new CustomEvent('void-remove', { bubbles: true, composed: true }));
    this.remove();
  }
}

if (!customElements.get('void-tag')) {
  customElements.define('void-tag', VoidTag);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-tag': VoidTag;
  }
}
