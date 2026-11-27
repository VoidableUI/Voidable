import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';

/**
 * Content grouping container for dashboard widgets, product listings, and media previews.
 *
 * Its regions are parts, in this order: an optional `<void-card-header>` (holding a `<void-card-title>` and an
 * optional `<void-card-description>`), the `<void-card-body>`, and an optional `<void-card-footer>`. The parts are
 * CSS-only and never moved, so the markup looks the same before and after the script loads and survives any morph
 * or re-render.
 *
 * A card is static, or it is one link, or it is one button; never a card holding a second control. To make the
 * whole card a destination, write one real `<a href>` or `<button>` inside `<void-card-title>`: the theme stretches
 * it over the card, so a click anywhere on the card follows the link or presses the button, Tab stops once on the
 * card, and the control's text is the card's accessible name. Do not wrap the card in `<a>` or `<button>` (block
 * content inside one is invalid HTML and announces badly). The card points the control's `aria-describedby` at the
 * `<void-card-description>`, so the description is announced after the name. Text inside a linked card cannot be
 * selected.
 */
export class VoidCard extends VoidElement {
  /** Surface style: `default`, `elevated` (lifted, with a shadow) or `bordered` (a visible border). */
  @property({ type: String, reflect: true }) variant: 'default' | 'elevated' | 'bordered' = 'default';
  /**
   * Space around the card's parts: `none`, `sm`, `md` (default) or `lg`. Use `none` for edge-to-edge
   * content such as a table or an image.
   */
  @property({ type: String, reflect: true }) padding: 'none' | 'sm' | 'md' | 'lg' = 'md';

  protected readonly _parts = new PartsController(this, {
    tags: ['void-card-header', 'void-card-title', 'void-card-description', 'void-card-body', 'void-card-footer'],
    onChange: () => this._wire(),
  });

  /** Re-wires when the author turns `aria-disabled` on or off (it is not a declared attribute). */
  private _watch: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._onClick, true);
    this._watch ??= new MutationObserver(() => this._parts.requestSync());
    this._watch.observe(this, { attributes: true, attributeFilter: ['aria-disabled'] });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick, true);
    this._watch?.disconnect();
  }

  /** An unavailable card (`aria-disabled="true"`) does nothing when its link or button is activated. */
  private _onClick = (e: Event): void => {
    if (this.getAttribute('aria-disabled') !== 'true') return;
    const control = this._control();
    if (control && e.target instanceof Node && control.contains(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };

  private _control(): Element | null {
    return this._parts.one('void-card-title')?.querySelector('a[href], button') ?? null;
  }

  /**
   * A linked card: its title holds the one link or button, which the description describes. An unavailable
   * card (`aria-disabled="true"`) gives its control `aria-disabled` too; the control stays focusable, so the
   * reason in the description is reachable.
   */
  private _wire(): void {
    const control = this._control();
    const description = this._parts.one('void-card-description');
    const disabled = this.getAttribute('aria-disabled') === 'true';
    const describedby = description ? this._parts.id(description, 'void-card-description') : null;
    if (control) {
      if (disabled) this._parts.provide(control, 'aria-disabled', 'true');
      if (describedby) this._parts.token(control, 'aria-describedby', describedby);
    } else if (disabled && describedby) {
      // A static card: the reason is reachable from the card itself.
      this._parts.token(this, 'aria-describedby', describedby);
    }
  }
}

if (!customElements.get('void-card')) {
  customElements.define('void-card', VoidCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-card': VoidCard;
  }
}
