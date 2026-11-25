import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean } from '../converters.js';
import { OverlayController } from '../overlay.js';
import { ProjectionController } from '../projection.js';

/**
 * Slide-out overlay panel for filters, detail views, and navigation menus; opens from any screen edge.
 *
 * A modal like `<void-dialog>`: a native `<dialog>` opened with `showModal()` (top layer, inert page, counted
 * scroll lock), focus moved in on open and returned on close.
 *
 * Name the drawer with `heading`; without one, set `aria-label` on the element and it is passed to the native dialog.
 *
 * @attr {string} aria-label - Accessible name of the drawer when there is no `heading`; it is passed to the native `<dialog>`. Ignored while `heading` is set.
 * @fires {CustomEvent<{ reason: 'api' }>} void-open - The drawer opened.
 * @fires {CustomEvent<{ reason: 'escape' | 'outside' | 'close-button' | 'form' | 'parent' | 'api' }>} void-close - The
 * drawer is closing. Cancelable when the user caused it (`escape`, `outside`, `close-button`).
 */
export class VoidDrawer extends VoidElement {
  /** Whether the drawer is open. Set or remove the attribute (or property) to open and close it. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Screen edge the drawer slides in from: `right` (default), `left`, `top` or `bottom`. */
  @property({ type: String, reflect: true }) side: 'left' | 'right' | 'top' | 'bottom' = 'right';
  /** Width of a side drawer, or height of a top or bottom one: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Visible title; also the drawer's accessible name. */
  @property({ type: String }) heading = '';
  /** Set `closable="false"` in markup to hide the close button and ignore Escape and backdrop presses. */
  @property({ type: Boolean, reflect: true, converter: defaultTrueBoolean }) closable = true;

  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'body', target: () => this.querySelector(':scope > .void-drawer-panel > .void-drawer-body') }],
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'modal',
    surface: () => this.querySelector<HTMLElement>(':scope > dialog.void-drawer-panel'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    closable: () => this.closable,
  });

  private readonly _headingId = `void-drawer-heading-${Math.random().toString(36).slice(2, 10)}`;

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'aria-label'];
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);
    if (name === 'aria-label' && old !== value) this.requestUpdate();
  }

  private _close = (): void => {
    this._overlay.requestClose('close-button');
  };

  render() {
    // Always rendered so the projected body survives close/reopen; the native dialog is hidden while closed.
    const label = this.heading ? nothing : (this.getAttribute('aria-label') ?? nothing);
    return html`
      <dialog
        class="void-drawer-panel"
        aria-labelledby=${this.heading ? this._headingId : nothing}
        aria-label=${label}
      >
        <div class="void-drawer-header">
          <h2 class="void-drawer-heading" id=${this._headingId} ?hidden=${!this.heading}>${this.heading}</h2>
          ${this.closable ? html`<button type="button" class="void-drawer-close" aria-label="Close" @click="${this._close}">&times;</button>` : nothing}
        </div>
        <div class="void-drawer-body"></div>
      </dialog>
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
