import { property } from 'lit/decorators.js';
import { VoidModal } from '../modal.js';

/**
 * Modal overlay for confirmations, detail views, and multi-step forms that require user attention before continuing.
 *
 * Write its regions as parts: `<void-dialog-title>` (required: it names the dialog), then optionally
 * `<void-dialog-description>`, `<void-dialog-body>` and `<void-dialog-actions>`. The parts are the final DOM: the
 * dialog never moves them. It opens as a native modal dialog (`showModal()`): in the top layer above everything, the
 * page behind it inert (Tab and assistive technology cannot reach it), scrolling locked while any modal is open.
 * Focus moves to the first `[autofocus]` element, else the first focusable element of its parts, else the close
 * button, and returns to the element that had it when the dialog closes. A `<form method="dialog">` inside closes
 * it; the parts may sit inside such a form.
 *
 * @attr {string} aria-label - Accessible name when there is no `<void-dialog-title>` (prefer the title).
 * @csspart surface - The native `<dialog>` that holds the parts (style its `::backdrop` through it).
 * @csspart close - The close button.
 * @fires {CustomEvent<{ reason: 'api' }>} void-open - The dialog opened. `detail.reason` is `api` (attribute or property).
 * @fires {CustomEvent<{ reason: 'escape' | 'outside' | 'close-button' | 'form' | 'parent' | 'api' }>} void-close - The
 * dialog is closing. Cancelable (`preventDefault()` keeps it open) when the user caused it: `escape`, `outside` (a
 * press on the backdrop) or `close-button`. Not cancelable for `form` (a `method="dialog"` form), `parent` (an
 * enclosing overlay closed) or `api` (the `open` attribute or property changed, including a server re-render).
 */
export class VoidDialog extends VoidModal {
  /** Width of the dialog panel: `sm`, `md` (default), `lg` or `xl`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
}

if (!customElements.get('void-dialog')) {
  customElements.define('void-dialog', VoidDialog);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-dialog': VoidDialog;
  }
}
