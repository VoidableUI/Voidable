import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { ClosedContent } from '../disclosure.js';

/**
 * Simple expand/collapse panel for FAQ sections, spoiler text, and progressive disclosure of secondary content.
 *
 * Written as two parts: a `<void-collapsible-trigger>` (the heading text that toggles it) followed by a
 * `<void-collapsible-content>`. Both are written by the author and never moved. The trigger becomes the button
 * (`role="button"`, a tab stop, Enter and Space, `aria-expanded`, `aria-controls`); the content is the region it
 * names. Closed content is hidden by the theme from the host's `open` attribute, before the script loads as well, and
 * opens and closes with a height animation (a grid row, no measuring; off under `prefers-reduced-motion` and when
 * `--void-anim-scale` is 0). Where the browser supports `hidden="until-found"` the closed content carries it, so it is
 * out of the accessibility tree and find-in-page opens the panel when it finds text inside.
 *
 * @fires {CustomEvent<{ reason: 'trigger' | 'keyboard' | 'find' }>} void-open - The panel opened: a click on the trigger,
 *   Enter or Space on it, or find-in-page found text inside. Does not bubble.
 * @fires {CustomEvent<{ reason: 'trigger' | 'keyboard' }>} void-close - The user is closing the panel. Cancelable:
 *   `preventDefault()` keeps it open. Does not bubble.
 */
export class VoidCollapsible extends VoidElement {
  /** Whether the content is shown. Add the attribute to start open; it follows the user's toggling. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Stop the panel from toggling. The trigger ignores clicks and Enter or Space. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  protected readonly _parts = new PartsController(this, {
    tags: ['void-collapsible-trigger', 'void-collapsible-content'],
    onChange: () => this._wire(),
  });

  private readonly _closed = new ClosedContent(this, this._parts);

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    this.addEventListener('beforematch', this._onBeforeMatch);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('beforematch', this._onBeforeMatch);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('open') || changed.has('disabled')) this._wire();
  }

  private _wire(): void {
    const trigger = this._parts.one('void-collapsible-trigger');
    const content = this._parts.one('void-collapsible-content');
    if (trigger) {
      this._parts.set(trigger, 'role', 'button');
      this._parts.set(trigger, 'tabindex', this.disabled ? '-1' : '0');
      this._parts.set(trigger, 'aria-expanded', String(this.open));
      this._parts.set(trigger, 'aria-disabled', this.disabled ? 'true' : null);
      this._parts.set(trigger, 'aria-controls', content ? this._parts.id(content, 'void-collapsible-content') : null);
    }
    if (content) {
      this._parts.set(content, 'role', 'region');
      this._parts.set(content, 'aria-labelledby', trigger ? this._parts.id(trigger, 'void-collapsible-trigger') : null);
    }
    this._closed.sync(content, this.open);
  }

  /** Find-in-page (or a link, or a text fragment) reached text inside the closed content: open. */
  private _onBeforeMatch = (e: Event): void => {
    if (this.open || e.target !== this._parts.one('void-collapsible-content')) return;
    this.open = true;
    this.dispatchEvent(new CustomEvent('void-open', { bubbles: false, detail: { reason: 'find' } }));
  };

  private _fromTrigger(e: Event): boolean {
    const trigger = this._parts.one('void-collapsible-trigger');
    return !!trigger && e.target instanceof Node && trigger.contains(e.target);
  }

  private _onClick = (e: Event): void => {
    if (!this._fromTrigger(e)) return;
    e.preventDefault();
    this._toggle('trigger');
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!this._fromTrigger(e) || e.defaultPrevented) return;
    // A real control inside the trigger (a link) keeps its own keys.
    if ((e.target as Element).closest('a, button, input, select, textarea')) return;
    e.preventDefault();
    this._toggle('keyboard');
  };

  private _toggle(reason: 'trigger' | 'keyboard'): void {
    if (this.disabled) return;
    if (this.open) {
      const go = this.dispatchEvent(new CustomEvent('void-close', { bubbles: false, cancelable: true, detail: { reason } }));
      if (go) this.open = false;
    } else {
      this.open = true;
      this.dispatchEvent(new CustomEvent('void-open', { bubbles: false, detail: { reason } }));
    }
  }
}

if (!customElements.get('void-collapsible')) {
  customElements.define('void-collapsible', VoidCollapsible);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-collapsible': VoidCollapsible;
  }
}
