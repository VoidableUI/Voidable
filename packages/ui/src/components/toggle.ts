import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { isInDisabledFieldset, watchDisabledAncestors } from '../form-control.js';

/** Pressable toggle button for toolbar actions and editor formatting controls with binary active/inactive state. */
export class VoidToggle extends VoidElement {
  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, { disabled: () => this.formDisabled });

  /**
   * Whether the toggle is on. It flips on click, Enter or Space and fires `void-change` with `{ pressed
   * }`. Exposed as `aria-pressed`.
   */
  @property({ type: Boolean, reflect: true }) pressed = false;
  /** Ignore clicks and keys, and take the toggle out of the tab order. A `<fieldset disabled>` ancestor does the same. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Status colour of the pressed state: `default`, `error`, `warning`, `caution`, `success`, `info`,
   * `notice` or `highlight`.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * How the pressed state shows: `outline` (default) keeps the border and tints; `filled` fills the
   * toggle.
   */
  @property({ type: String, reflect: true }) variant: 'outline' | 'filled' = 'outline';

  private _unwatch: (() => void) | null = null;

  /** Disabled itself or by a `<fieldset disabled>` ancestor. */
  get formDisabled(): boolean {
    return this.disabled || isInDisabledFieldset(this);
  }

  private _syncDisabled(): void {
    const off = this.formDisabled;
    this.setHostAttribute('aria-disabled', off ? 'true' : null);
    this.setHostAttribute('tabindex', off ? '-1' : '0');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this._syncDisabled();
    this._unwatch = watchDisabledAncestors(this, () => this._syncDisabled());
    // A toggle that connects after its group (a blocking script in the head, a
    // framework rendering children later) takes the group's state now.
    (this.closest('void-toggle-group') as (Element & { _syncToggle?: (t: VoidToggle) => void }) | null)?._syncToggle?.(this);
    this.setHostAttribute('aria-pressed', String(this.pressed));
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this._unwatch?.();
    this._unwatch = null;
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('pressed')) this.setHostAttribute('aria-pressed', String(this.pressed));
    if (changed.has('disabled')) this._syncDisabled();
  }

  private _handleClick = (): void => {
    if (this.formDisabled) return;
    this.pressed = !this.pressed;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { pressed: this.pressed } }));
  };
}

if (!customElements.get('void-toggle')) {
  customElements.define('void-toggle', VoidToggle);
}
