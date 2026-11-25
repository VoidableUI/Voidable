import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean } from '../converters.js';
import { ProjectionController } from '../projection.js';

/** Modal overlay for confirmations, detail views, and multi-step forms that require user attention before continuing. */
export class VoidDialog extends VoidElement {
  /**
   * Whether the dialog is shown. Set the property or attribute to open it; closing it (close button,
   * Escape, backdrop click) sets it back to false and fires `void-close`. While open the page behind
   * does not scroll.
   */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Title in the header row. Also the dialog's accessible name, so always set it. */
  @property({ type: String }) heading = '';
  /** Width of the dialog panel: `sm`, `md` (default), `lg` or `xl`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  /** Set `closable="false"` in markup to hide the close button and ignore Escape and backdrop clicks. */
  @property({ type: Boolean, converter: defaultTrueBoolean }) closable = true;

  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'body', target: () => this.querySelector(':scope > .void-dialog-backdrop .void-dialog-body') }],
  });

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.closable) {
      this._close();
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'dialog');
    this.setHostAttribute('aria-modal', 'true');
    if (this.heading) {
      this.setHostAttribute('aria-label', this.heading);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    if (changed.has('heading')) {
      if (this.heading) {
        this.setHostAttribute('aria-label', this.heading);
      } else {
        this.setHostAttribute('aria-label', null);
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
    // Always rendered so the projected body survives close/reopen; hidden while closed.
    return html`
      <div class="void-dialog-backdrop" ?hidden=${!this.open} @click="${this._onBackdropClick}" @keydown="${this._onBackdropKeydown}">
        <div class="void-dialog-panel">
          <div class="void-dialog-header">
            <span class="void-dialog-heading">${this.heading}</span>
            ${this.closable
              ? html`<button type="button" class="void-dialog-close" aria-label="Close" @click="${this._close}">&times;</button>`
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
