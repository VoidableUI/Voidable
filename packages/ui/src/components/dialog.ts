import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Modal overlay for confirmations, detail views, and multi-step forms that require user attention before continuing. */
export class VoidDialog extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) heading = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @property({ type: Boolean }) closable = true;

  private _userContent: Node[] = [];
  private _didSetup = false;

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.closable) {
      this._close();
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    if (this.heading) {
      this.setAttribute('aria-label', this.heading);
    }
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    if (changed.has('heading')) {
      if (this.heading) {
        this.setAttribute('aria-label', this.heading);
      } else {
        this.removeAttribute('aria-label');
      }
    }

    if (changed.has('open')) {
      if (this.open) {
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', this._handleKeydown);
        this._focusFirst();
      } else {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', this._handleKeydown);
      }
    }

    if (!this._didSetup) {
      this._didSetup = true;
      const body = this.querySelector('.void-dialog-body');
      if (body) {
        for (const n of this._userContent) body.appendChild(n);
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeydown);
    if (this.open) {
      document.body.style.overflow = '';
    }
  }

  private _focusFirst(): void {
    requestAnimationFrame(() => {
      const focusable = this.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });
  }

  private _close(): void {
    this.open = false;
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
  }

  private _onBackdropClick = (e: Event): void => {
    if (this.closable && e.target === e.currentTarget) {
      this._close();
    }
  };

  private _onBackdropKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.closable) {
      this._close();
    }
  };

  render() {
    if (!this.open) return nothing;
    return html`
      <div class="void-dialog-backdrop" @click="${this._onBackdropClick}" @keydown="${this._onBackdropKeydown}">
        <div class="void-dialog-panel">
          <div class="void-dialog-header">
            <span class="void-dialog-heading">${this.heading}</span>
            ${this.closable
              ? html`<button class="void-dialog-close" aria-label="Close" @click="${this._close}">&times;</button>`
              : nothing}
          </div>
          <div class="void-dialog-body"></div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('void-dialog')) {
  customElements.define('void-dialog', VoidDialog);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-dialog': VoidDialog;
  }
}
