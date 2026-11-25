import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';

/**
 * Collapsible section container for FAQs, settings panels, and long-form content organized into expandable items.
 *
 * Holds `<void-accordion-item>`s; each item holds a `<void-accordion-trigger>` (the heading text that toggles it)
 * and a `<void-accordion-content>`. All of them are written by the author and never moved.
 */
export class VoidAccordion extends VoidElement {
  /** Let several items stay open at once. Without it, opening an item closes the others in the accordion. */
  @property({ type: Boolean, reflect: true }) multiple = false;
}

if (!customElements.get('void-accordion')) {
  customElements.define('void-accordion', VoidAccordion);
}

/**
 * One collapsible item of a `<void-accordion>`: a `<void-accordion-trigger>` followed by a
 * `<void-accordion-content>`. The trigger becomes the button that toggles the item (`role="button"`, a tab stop,
 * Enter and Space, `aria-expanded`, `aria-controls`); the content is the region it names. Closed content is hidden
 * by the theme from the item's `open` attribute, before the script loads as well.
 *
 * @fires {CustomEvent<{ open: boolean }>} void-toggle - The user opened or closed the item.
 */
export class VoidAccordionItem extends VoidElement {
  /**
   * Whether the content is shown. Add the attribute to start open; it is updated when the user toggles
   * the item.
   */
  @property({ type: Boolean, reflect: true }) open = false;

  protected readonly _parts = new PartsController(this, {
    tags: ['void-accordion-trigger', 'void-accordion-content'],
    onChange: () => this._wire(),
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('open')) this._wire();
  }

  private _wire(): void {
    const trigger = this._parts.one('void-accordion-trigger');
    const content = this._parts.one('void-accordion-content');
    if (trigger) {
      this._parts.set(trigger, 'role', 'button');
      this._parts.set(trigger, 'tabindex', '0');
      this._parts.set(trigger, 'aria-expanded', String(this.open));
      this._parts.set(trigger, 'aria-controls', content ? this._parts.id(content, 'void-accordion-content') : null);
    }
    if (content) {
      this._parts.set(content, 'role', 'region');
      this._parts.set(content, 'aria-labelledby', trigger ? this._parts.id(trigger, 'void-accordion-trigger') : null);
    }
  }

  private _fromTrigger(e: Event): boolean {
    const trigger = this._parts.one('void-accordion-trigger');
    return !!trigger && e.target instanceof Node && trigger.contains(e.target);
  }

  private _onClick = (e: Event): void => {
    if (!this._fromTrigger(e)) return;
    e.preventDefault();
    this._toggle();
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!this._fromTrigger(e) || e.defaultPrevented) return;
    // A real control inside the trigger (a link) keeps its own keys.
    if ((e.target as Element).closest('a, button, input, select, textarea') ) return;
    e.preventDefault();
    this._toggle();
  };

  private _toggle(): void {
    this.open = !this.open;
    const parent = this.parentElement;
    if (this.open && parent instanceof VoidAccordion && !parent.multiple) {
      for (const sib of Array.from(parent.children)) {
        if (sib !== this && sib instanceof VoidAccordionItem) sib.open = false;
      }
    }
    this.dispatchEvent(new CustomEvent('void-toggle', { bubbles: true, composed: true, detail: { open: this.open } }));
  }
}

if (!customElements.get('void-accordion-item')) {
  customElements.define('void-accordion-item', VoidAccordionItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-accordion': VoidAccordion;
    'void-accordion-item': VoidAccordionItem;
  }
}
