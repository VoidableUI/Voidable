import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { isInDisabledFieldset, watchDisabledAncestors } from '../form-control.js';

/**
 * Action trigger for forms, dialogs, and toolbars; supports semantic color variants.
 *
 * Holding a link or a native button (`<void-button><a href="/docs">Docs</a></void-button>`) makes it a link
 * button: the inner element is then the one control, so the host is presentational (no role, no tab stop, no key
 * handling) and the theme draws the button's focus ring when the inner element has focus. `disabled` on a link
 * button sets `aria-disabled="true"` and `tabindex="-1"` on the link and stops it navigating (a link cannot be
 * disabled); on an inner `<button>` it disables that button.
 */
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

  /**
   * The control of a link button: a direct child `<a href>` or `<button>` (`<void-button><a href>…</a></void-button>`).
   * While there is one it is the only interactive element and the host is presentational.
   */
  private get _control(): HTMLAnchorElement | HTMLButtonElement | null {
    return this.querySelector(':scope > a[href], :scope > button');
  }

  /** What the button wrote on the control while disabled, to take back off when it is enabled or replaced. */
  private _inert: { el: HTMLAnchorElement | HTMLButtonElement; aria: boolean; tabindex: boolean; disabled: boolean } | null = null;
  private _observer: MutationObserver | null = null;
  private _syncQueued = false;

  /**
   * Keyboard activation is a real `click`, as on a native button: Enter on keydown, Space on keyup. A link button
   * has no keyboard handling of its own: the inner link or button takes the keys (Enter follows the link, Space
   * does nothing on a link), as it does when the key's target is not the host.
   */
  protected readonly _activation = new KeyboardActivation(this, {
    disabled: () => this.formDisabled,
    enter: () => !this._control,
    space: () => !this._control,
  });

  /** The form the button sits in. */
  private get _form(): HTMLFormElement | null {
    return this.closest('form');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._handleClick);
    this.addEventListener('click', this._blockDisabledControl, true);
    this._syncDisabledState(this.formDisabled);
    this._unwatch = watchDisabledAncestors(this, () => this._syncDisabledState(this.formDisabled));
    // A link or button arriving, leaving or changing after first render (a framework render, a morph).
    // Attributes of the host itself (an author's `aria-disabled`) are not a reason to re-sync.
    this._observer ??= new MutationObserver((records) => {
      if (records.some((r) => r.type === 'childList' || r.target !== this)) this._requestSync();
    });
    this._observer.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'aria-disabled', 'tabindex', 'disabled'] });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('click', this._blockDisabledControl, true);
    this._unwatch?.();
    this._unwatch = null;
    this._observer?.disconnect();
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

  private _requestSync(): void {
    if (this._syncQueued) return;
    this._syncQueued = true;
    queueMicrotask(() => {
      this._syncQueued = false;
      if (this.isConnected) this._syncDisabledState(this.formDisabled);
    });
  }

  /** Writes the host's button semantics, or, for a link button, none and the disabled state of its control. */
  private _syncDisabledState(disabled: boolean): void {
    const control = this._control;
    if (control) {
      // The inner element is the one control: the host is presentational.
      this.setHostAttribute('role', null);
      this.setHostAttribute('tabindex', null);
      this.setHostAttribute('aria-disabled', null);
      if (!disabled || this._inert?.el !== control) this._release();
      if (disabled) this._disableControl(control);
      return;
    }
    this._release();
    this.setHostAttribute('role', 'button');
    // Absent when enabled, as on every other control.
    this.setHostAttribute('aria-disabled', disabled ? 'true' : null);
    this.setHostAttribute('tabindex', disabled ? '-1' : '0');
  }

  /**
   * A link cannot be disabled: it is announced as disabled (`aria-disabled`), leaves the tab order, and
   * `_handleClick` stops it navigating. A native button is disabled for real. Only what is not already there is
   * written, and remembered so enabling takes back exactly that.
   */
  private _disableControl(control: HTMLAnchorElement | HTMLButtonElement): void {
    const mine = this._inert?.el === control ? this._inert : { el: control, aria: false, tabindex: false, disabled: false };
    if (control instanceof HTMLButtonElement) {
      if (!control.disabled) {
        control.disabled = true;
        mine.disabled = true;
      }
    } else {
      if (!control.hasAttribute('aria-disabled')) {
        control.setAttribute('aria-disabled', 'true');
        mine.aria = true;
      }
      if (!control.hasAttribute('tabindex')) {
        control.setAttribute('tabindex', '-1');
        mine.tabindex = true;
      }
    }
    this._inert = mine;
  }

  /** Takes back what a disabled state wrote on a control that is enabled now (or no longer the control). */
  private _release(): void {
    const mine = this._inert;
    if (!mine) return;
    this._inert = null;
    if (mine.el instanceof HTMLButtonElement) {
      if (mine.disabled) mine.el.disabled = false;
    } else {
      if (mine.aria) mine.el.removeAttribute('aria-disabled');
      if (mine.tabindex) mine.el.removeAttribute('tabindex');
    }
  }

  /** A click on the link or button inside a disabled button goes nowhere: not to its own listeners, not to the page. */
  private _blockDisabledControl = (e: Event): void => {
    if (e.target === this || !this.formDisabled || !this._control) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  private _handleClick = (e: Event): void => {
    if (this.formDisabled) {
      // Also stops a disabled link button's link from navigating.
      e.preventDefault();
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
