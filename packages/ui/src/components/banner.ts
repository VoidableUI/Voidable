import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Full-width site-level announcement for maintenance windows, cookie consent, and promotional messaging. */
export class VoidBanner extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: Boolean, reflect: true }) dismissable = false;
  @property({ type: String, reflect: true }) variant: 'subtle' | 'filled' = 'subtle';

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'banner');
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSetup) {
      this._didSetup = true;
      for (const node of this._userContent) {
        this.appendChild(node);
      }
    }
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    if (!this.dismissable) return nothing;
    return html`<button class="void-banner-close" aria-label="Close" @click="${this._close}">&times;</button>`;
  }
}

if (!customElements.get('void-banner')) {
  customElements.define('void-banner', VoidBanner);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-banner': VoidBanner;
  }
}
