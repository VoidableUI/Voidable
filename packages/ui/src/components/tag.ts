import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidTag extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: Boolean, reflect: true }) removable = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSetup) {
      this._didSetup = true;
      const close = this.querySelector('.void-tag-close');
      for (const node of this._userContent) {
        if (close) {
          this.insertBefore(node, close);
        } else {
          this.appendChild(node);
        }
      }
    }
  }

  render() {
    if (!this.removable) return nothing;
    return html`<button class="void-tag-close" aria-label="Remove" @click="${this._remove}">×</button>`;
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
