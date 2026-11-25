import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean } from '../converters.js';
import { ProjectionController } from '../projection.js';

/** Slide-out overlay panel for filters, detail views, and navigation menus; opens from any screen edge. */
export class VoidDrawer extends VoidElement {
  /**
   * Whether the drawer is shown. Set the property or attribute to open it; closing it (close button,
   * Escape, backdrop click) sets it back to false and fires `void-close`.
   */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Screen edge the drawer slides in from: `right` (default), `left`, `top` or `bottom`. */
  @property({ type: String, reflect: true }) side: 'left' | 'right' | 'top' | 'bottom' = 'right';
  /** Width of a side drawer, or height of a top or bottom one: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Title in the header row. Also the drawer's accessible name. */
  @property({ type: String }) heading = '';
  /** Set `closable="false"` in markup to hide the close button and ignore Escape and overlay clicks. */
  @property({ type: Boolean, reflect: true, converter: defaultTrueBoolean }) closable = true;

  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'body', target: () => this.querySelector(':scope > .void-drawer-panel > .void-drawer-body') }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'dialog');
    this.setHostAttribute('aria-modal', 'true');
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('heading') && this.heading) {
      this.setHostAttribute('aria-label', this.heading);
    } else if (changed.has('heading') && !this.heading) {
      this.setHostAttribute('aria-label', null);
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
    // Always rendered so the projected body survives close/reopen; hidden while closed.
    return html`
      <div class="void-drawer-backdrop" ?hidden=${!this.open} @click="${this._handleBackdropClick}" @keydown="${this._handleBackdropKeydown}"></div>
      <div class="void-drawer-panel" ?hidden=${!this.open}>
        <div class="void-drawer-header">
          ${this.heading ? html`<span class="void-drawer-heading">${this.heading}</span>` : nothing}
          ${this.closable ? html`<button type="button" class="void-drawer-close" aria-label="Close" @click="${this._close}">&times;</button>` : nothing}
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
