import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { isInDisabledFieldset, watchDisabledAncestors } from '../form-control.js';

/** Action trigger for forms, dialogs, and toolbars; supports semantic color variants. */
export class VoidButton extends VoidElement {
  /*
   * Not form-associated. Its form is the one it sits in; `type="submit"` calls
   * form.requestSubmit() (which runs validation and fires `submit`),
   * `type="reset"` calls form.reset(), `type="button"` does nothing to the
   * form, and like a native button it contributes no value. A
   * `<fieldset disabled>` ancestor is observed. A form-associated host would
   * be what holds focus after a click, and LiveView never patches the
   * children of a focused form control, so the label of a clicked button
   * (`Count {@count}`, `Saving…`) would not update while it has focus.
   */

  /**
   * Visual weight. `outline` (default) is a bordered button, `filled` is the
   * primary action, and `ghost` draws no border or fill until hovered: use it
   * for row actions, toolbars and the quiet button beside a primary one.
   */
  @property({ type: String, reflect: true }) variant: 'outline' | 'filled' | 'ghost' = 'outline';
  /**
   * Status colour: `default`, `error`, `warning`, `caution`, `success`, `info`, `notice` or `highlight`. Use `error`
   * for a destructive action such as Delete.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /**
   * Stop the button reacting: clicks and Enter or Space do nothing and it leaves the tab order. A button
   * inside a `<fieldset disabled>` is disabled too.
   */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * What it does to the surrounding form: `button` (default) nothing, `submit` submits the form (running
   * validation), `reset` resets it. Set `submit` on the primary action of a form.
   */
  @property({ type: String, reflect: true }) type: 'button' | 'submit' | 'reset' = 'button';
  /** Size step: `sm`, `md` (default) or `lg`. Controls of the same step share one height. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  /** Watches every ancestor's `disabled` attribute (a `<fieldset disabled>`). */
  private _unwatch: (() => void) | null = null;

  /** The `<a>` of a link button (`<void-button><a href>…</a></void-button>`), which Enter follows. */
  private get _link(): HTMLAnchorElement | null {
    return this.querySelector(':scope > a[href]');
  }

  /**
   * Keyboard activation is a real `click`, as on a native button: Enter on keydown, Space on keyup. A link button
   * follows link semantics: Enter follows the link, Space does nothing.
   */
  protected readonly _activation = new KeyboardActivation(this, {
    disabled: () => this.formDisabled,
    space: () => !this._link,
    activate: () => (this._link ?? this).click(),
  });

  /** The form the button sits in. */
  private get _form(): HTMLFormElement | null {
    return this.closest('form');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this.setHostAttribute('tabindex', '0');
    this.addEventListener('click', this._handleClick);
    this._syncDisabledState(this.formDisabled);
    this._unwatch = watchDisabledAncestors(this, () => this._syncDisabledState(this.formDisabled));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this._unwatch?.();
    this._unwatch = null;
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

  private _syncDisabledState(disabled: boolean): void {
    // Absent when enabled, as on every other control.
    this.setHostAttribute('aria-disabled', disabled ? 'true' : null);
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
}

if (!customElements.get('void-button')) {
  customElements.define('void-button', VoidButton);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-button': VoidButton;
  }
}
