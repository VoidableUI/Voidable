import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/**
 * Top application navigation bar for branding, primary links, and user account controls.
 *
 * The bar is a row: what you write inside it is laid out by the theme as it stands, with no part elements and
 * nothing rendered. Use the patterns beside it for the usual contents: `<void-brand>` for the name or logo,
 * `<void-nav-links>` for the links (mark the current page with `aria-current="page"`) and `<void-spacer>` to
 * push what follows to the far end.
 *
 * The bar has no role. It holds more than links (a search field, an account menu), and a `navigation`
 * landmark is for a group of links, so the landmark belongs on the links: write them in
 * `<nav aria-label="Primary">` (inside `<void-nav-links>` or around it). Give each `<nav>` on the page a
 * different name.
 */
export class VoidNavBar extends VoidElement {
  /** Stay at the top of the viewport while the page scrolls. */
  @property({ type: Boolean, reflect: true }) sticky = false;
  /** Leave out the hairline under the bar (it is drawn by default). */
  @property({ type: Boolean, attribute: 'hide-border', reflect: true }) hideBorder = false;
  /** `default` sits on the page; `elevated` uses the raised surface colour. */
  @property({ type: String, reflect: true }) variant: 'default' | 'elevated' = 'default';
}

if (!customElements.get('void-nav-bar')) {
  customElements.define('void-nav-bar', VoidNavBar);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-nav-bar': VoidNavBar;
  }
}
