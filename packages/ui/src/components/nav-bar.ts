import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/**
 * Top application navigation bar for branding, primary links, and user account controls.
 *
 * The bar is a row: what you write inside it is laid out by the theme as it stands, with no part elements and
 * nothing rendered. Use the patterns beside it for the usual contents: `<void-brand>` for the name or logo,
 * `<void-nav-links>` for the links (mark the current page with `aria-current="page"`) and `<void-spacer>` to
 * push what follows to the far end.
 */
export class VoidNavBar extends VoidElement {
  /** Stay at the top of the viewport while the page scrolls. */
  @property({ type: Boolean, reflect: true }) sticky = false;
  /** Leave out the hairline under the bar (it is drawn by default). */
  @property({ type: Boolean, attribute: 'hide-border', reflect: true }) hideBorder = false;
  /** `default` sits on the page; `elevated` uses the raised surface colour. */
  @property({ type: String, reflect: true }) variant: 'default' | 'elevated' = 'default';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'navigation');
  }
}

if (!customElements.get('void-nav-bar')) {
  customElements.define('void-nav-bar', VoidNavBar);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-nav-bar': VoidNavBar;
  }
}
