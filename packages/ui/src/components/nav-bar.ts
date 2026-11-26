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
 * The bar is a `navigation` landmark. Where the page already has one around it (the bar sits inside a `<nav>`
 * or an element with a navigation or other role of its own) or inside it (the links are already in a `<nav>`),
 * it adds nothing, so landmarks never nest; a role you write on it is kept. When a page has more than one
 * navigation landmark, give each an `aria-label` (`<void-nav-bar aria-label="Primary">`); with one, a name is optional.
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
    this._syncRole();
  }

  protected override firstUpdated(changed: Map<string, unknown>): void {
    super.firstUpdated(changed);
    this._syncRole(); // the links are parsed by now
  }

  /** `navigation`, unless the author wrote a role or a navigation landmark already encloses or fills the bar. */
  private _syncRole(): void {
    const current = this.getAttribute('role');
    const nested = !!this.parentElement?.closest('nav, [role]') || !!this.querySelector('nav, [role="navigation"]');
    if (current !== null && current !== this._writtenRole) return;
    if (nested) {
      if (current !== null) { this.removeAttribute('role'); this._writtenRole = null; }
      return;
    }
    this._writtenRole = 'navigation';
    this.setHostAttribute('role', 'navigation');
  }

  private _writtenRole: string | null = null;
}

if (!customElements.get('void-nav-bar')) {
  customElements.define('void-nav-bar', VoidNavBar);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-nav-bar': VoidNavBar;
  }
}
