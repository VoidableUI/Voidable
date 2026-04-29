import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidAlert extends VoidElement {
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: Boolean, reflect: true }) dismissible = false;
  @property({ type: String, reflect: true }) variant: 'subtle' | 'filled' = 'subtle';

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'alert');
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

  private _dismiss(): void {
    this.dispatchEvent(new CustomEvent('void-dismiss', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    if (!this.dismissible) return nothing;
    return html`<button class="void-alert-close" aria-label="Dismiss" @click="${this._dismiss}">&times;</button>`;
  }
}

if (!customElements.get('void-alert')) {
  customElements.define('void-alert', VoidAlert);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-alert': VoidAlert;
  }
}
