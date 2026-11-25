import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { isInDisabledFieldset } from '../form-control.js';

/** Action trigger for forms, dialogs, and toolbars; supports loading states and semantic color variants. */
export class VoidButton extends VoidElement {
  /**
   * Form-associated so the button knows its form owner (including the `form`
   * attribute, via ElementInternals) and is told about `<fieldset disabled>`
   * ancestors. It never calls setFormValue: like a native button it
   * contributes no value. `type="submit"` calls form.requestSubmit() (which
   * runs validation and fires `submit`), `type="reset"` calls form.reset(),
   * `type="button"` does nothing to the form.
   */
  static formAssociated = true;

  /**
   * Visual weight. `outline` (default) is a bordered button, `filled` is the
   * primary action, and `ghost` draws no border or fill until hovered: use it
   * for row actions, toolbars and the quiet button beside a primary one.
   */
  @property({ type: String, reflect: true }) variant: 'outline' | 'filled' | 'ghost' = 'outline';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) type: 'button' | 'submit' | 'reset' = 'button';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  private _internals: ElementInternals | null = null;

  constructor() {
    super();
    try {
      this._internals = this.attachInternals();
    } catch {
      // attachInternals not supported (e.g., happy-dom).
    }
  }

  /** Return the associated form, via ElementInternals or DOM traversal. */
  private get _form(): HTMLFormElement | null {
    return this._internals?.form ?? this.closest('form');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this.setHostAttribute('tabindex', '0');
    this.setHostAttribute('aria-disabled', String(this.disabled));
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('disabled')) {
      this._syncDisabledState(this.formDisabled);
    }
  }

  /** True when disabled directly or via an ancestor `<fieldset disabled>`. */
  get formDisabled(): boolean {
    return this.disabled || isInDisabledFieldset(this);
  }

  /** Called by the browser when an ancestor fieldset's disabled state changes. */
  formDisabledCallback(disabled: boolean): void {
    this._syncDisabledState(disabled || this.formDisabled);
  }

  private _syncDisabledState(disabled: boolean): void {
    this.setHostAttribute('aria-disabled', String(disabled));
    this.setHostAttribute('tabindex', disabled ? '-1' : '0');
  }

  private _handleClick = (e: Event): void => {
    if (this.formDisabled) {
      e.stopImmediatePropagation();
      return;
    }
    if (this.type === 'submit') {
      this._form?.requestSubmit();
    } else if (this.type === 'reset') {
      this._form?.reset();
    }
    this.dispatchEvent(new CustomEvent('void-click', { bubbles: true, composed: true }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !this.formDisabled) {
      e.preventDefault();
      this._handleClick(e);
    }
  };
}

if (!customElements.get('void-button')) {
  customElements.define('void-button', VoidButton);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-button': VoidButton;
  }
}
