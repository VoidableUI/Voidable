import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Pressable toggle button for toolbar actions and editor formatting controls with binary active/inactive state. */
export class VoidToggle extends VoidElement {
  /**
   * Whether the toggle is on. It flips on click, Enter or Space and fires `void-change` with `{ pressed
   * }`. Exposed as `aria-pressed`.
   */
  @property({ type: Boolean, reflect: true }) pressed = false;
  /** Ignore clicks and keys, and take the toggle out of the tab order. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Status colour of the pressed state: `default`, `error`, `warning`, `caution`, `success`, `info` or
   * `notice`.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' = 'default';
  /** Size step: `sm`, `md` (default), `lg`, `xl` or `xxl`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  /**
   * How the pressed state shows: `outline` (default) keeps the border and tints; `filled` fills the
   * toggle.
   */
  @property({ type: String, reflect: true }) variant: 'outline' | 'filled' = 'outline';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this.setHostAttribute('tabindex', this.disabled ? '-1' : '0');
    // A toggle that connects after its group (a blocking script in the head, a
    // framework rendering children later) takes the group's state now.
    (this.closest('void-toggle-group') as (Element & { _syncToggle?: (t: VoidToggle) => void }) | null)?._syncToggle?.(this);
    this.setHostAttribute('aria-pressed', String(this.pressed));
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('pressed')) this.setHostAttribute('aria-pressed', String(this.pressed));
    if (changed.has('disabled')) {
      this.setHostAttribute('aria-disabled', String(this.disabled));
      this.setHostAttribute('tabindex', this.disabled ? '-1' : '0');
    }
  }

  private _handleClick = (): void => {
    if (this.disabled) return;
    this.pressed = !this.pressed;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { pressed: this.pressed } }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if ((e.key === ' ' || e.key === 'Enter') && !this.disabled) {
      e.preventDefault();
      this._handleClick();
    }
  };
}

if (!customElements.get('void-toggle')) {
  customElements.define('void-toggle', VoidToggle);
}
