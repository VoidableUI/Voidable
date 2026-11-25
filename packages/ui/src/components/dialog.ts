import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean } from '../converters.js';
import { OverlayController } from '../overlay.js';
import { ProjectionController } from '../projection.js';

/**
 * Modal overlay for confirmations, detail views, and multi-step forms that require user attention before continuing.
 *
 * Renders a native `<dialog>` opened with `showModal()`: it sits in the top layer above everything, the page behind
 * it is inert (Tab and assistive technology cannot reach it) and scrolling is locked while any modal is open. Focus
 * moves to the first `[autofocus]` element, else the first focusable element of the content, else the close button,
 * and returns to the element that had it when the dialog closes. A `<form method="dialog">` inside closes it.
 *
 * Name the dialog with `heading`; without one, set `aria-label` on the element and it is passed to the native dialog.
 *
 * @attr {string} aria-label - Accessible name of the dialog when there is no `heading`; it is passed to the native `<dialog>`. Ignored while `heading` is set.
 * @fires {CustomEvent<{ reason: 'api' }>} void-open - The dialog opened. `detail.reason` is `api` (attribute or property).
 * @fires {CustomEvent<{ reason: 'escape' | 'outside' | 'close-button' | 'form' | 'parent' | 'api' }>} void-close - The
 * dialog is closing. Cancelable (`preventDefault()` keeps it open) when the user caused it: `escape`, `outside` (a
 * press on the backdrop) or `close-button`. Not cancelable for `form` (a `method="dialog"` form), `parent` (an
 * enclosing overlay closed) or `api` (the `open` attribute or property changed, including a server re-render).
 */
export class VoidDialog extends VoidElement {
  /** Whether the dialog is open. Set or remove the attribute (or property) to open and close it; the server may do the same through a morph. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Visible title; also the dialog's accessible name. */
  @property({ type: String }) heading = '';
  /** Width of the dialog panel: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Set `closable="false"` in markup to hide the close button and ignore Escape and backdrop presses. */
  @property({ type: Boolean, converter: defaultTrueBoolean }) closable = true;

  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'body', target: () => this.querySelector(':scope > .void-dialog-panel > .void-dialog-body') }],
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'modal',
    surface: () => this.querySelector<HTMLElement>(':scope > dialog.void-dialog-panel'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    closable: () => this.closable,
  });

  private readonly _headingId = `void-dialog-heading-${Math.random().toString(36).slice(2, 10)}`;

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
        class="void-dialog-panel"
        aria-labelledby=${this.heading ? this._headingId : nothing}
        aria-label=${label}
      >
        <div class="void-dialog-header">
          <h2 class="void-dialog-heading" id=${this._headingId} ?hidden=${!this.heading}>${this.heading}</h2>
          ${this.closable
            ? html`<button type="button" class="void-dialog-close" aria-label="Close" @click="${this._close}">&times;</button>`
            : nothing}
        </div>
        <div class="void-dialog-body"></div>
      </dialog>
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
