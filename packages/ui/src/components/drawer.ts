import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidDrawer extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String, reflect: true }) side: 'left' | 'right' | 'top' | 'bottom' = 'right';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String }) heading = '';
  @property({ type: Boolean, reflect: true }) closable = true;

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('heading') && this.heading) {
      this.setAttribute('aria-label', this.heading);
    } else if (changed.has('heading') && !this.heading) {
      this.removeAttribute('aria-label');
    }
    if (!this._didSetup) {
      this._didSetup = true;
      const body = this.querySelector('.void-drawer-body');
      if (body) {
        for (const node of this._userContent) {
          body.appendChild(node);
        }
      }
    }
  }

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open && this.closable) {
      this._close();
    }
  };

  private _handleBackdropClick = (): void => {
    if (this.closable) {
      this._close();
    }
  };

  private _handleBackdropKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.closable) {
      this._close();
    }
  };

  private _close(): void {
    this.open = false;
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.open) return nothing;
    return html`
      <div class="void-drawer-backdrop" @click="${this._handleBackdropClick}" @keydown="${this._handleBackdropKeydown}"></div>
      <div class="void-drawer-panel">
        <div class="void-drawer-header">
          ${this.heading ? html`<span class="void-drawer-heading">${this.heading}</span>` : nothing}
          ${this.closable ? html`<button class="void-drawer-close" aria-label="Close" @click="${this._close}">&times;</button>` : nothing}
        </div>
        <div class="void-drawer-body"></div>
      </div>
    `;
  }
}

if (!customElements.get('void-drawer')) {
  customElements.define('void-drawer', VoidDrawer);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-drawer': VoidDrawer;
  }
}
