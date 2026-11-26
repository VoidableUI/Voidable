import { property } from 'lit/decorators.js';
import { VoidModal } from '../modal.js';

/**
 * Slide-out overlay panel for filters, detail views, and navigation menus; opens from any screen edge.
 *
 * A modal like `<void-dialog>`, with the same parts: `<void-drawer-title>` (required: it names the drawer), then
 * optionally `<void-drawer-description>`, `<void-drawer-body>` and `<void-drawer-actions>`. The parts are the final
 * DOM; the native `<dialog>` opened with `showModal()` (top layer, inert page, counted scroll lock) is internal to
 * the drawer. Focus moves in on open and returns on close.
 *
 * @attr {string} aria-label - Accessible name when there is no `<void-drawer-title>` (prefer the title).
 * @csspart surface - The native `<dialog>` that holds the parts (style its `::backdrop` through it).
 * @csspart close - The close button.
 * @fires {CustomEvent<{ reason: 'api' }>} void-open - The drawer opened.
 * @fires {CustomEvent<{ reason: 'escape' | 'outside' | 'close-button' | 'form' | 'parent' | 'api' }>} void-close - The
 * drawer is closing. Cancelable when the user caused it (`escape`, `outside`, `close-button`).
 */
export class VoidDrawer extends VoidModal {
  /** Edge the drawer slides in from: `right` (default), `left`, `top` or `bottom` (the screen edges), or `start` or `end` (the side the text starts or ends on, so they swap in right-to-left). */
  @property({ type: String, reflect: true }) side: 'left' | 'right' | 'start' | 'end' | 'top' | 'bottom' = 'right';
  /** Width of a side drawer, or height of a top or bottom one: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
}

if (!customElements.get('void-drawer')) {
  customElements.define('void-drawer', VoidDrawer);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-drawer': VoidDrawer;
  }
}
