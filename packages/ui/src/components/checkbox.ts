import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { pressKeys } from '../keymaps/activation.js';
import { NativeFormControl } from '../form-control.js';
import { ProjectionController } from '../projection.js';

/** Binary or indeterminate selection for form fields, data table row selection, and toggle-able settings. */
export class VoidCheckbox extends NativeFormControl(VoidElement) {
  /** Key bindings for this element's actions, as JSON (`{"activate":["Space"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = pressKeys;

  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, { disabled: () => this.formDisabled });

  /**
   * Whether the box is checked. Reflected to the attribute as the user toggles it or a script sets it;
   * the form's reset target stays the state it started with.
   */
  @property({ type: Boolean, reflect: true }) checked = false;
  /**
   * Stop the box reacting and exclude it from the form submission. Also disabled by a `<fieldset
   * disabled>` or a disabled `void-checkbox-group` around it.
   */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Show the mixed state (a dash) for a parent box whose children are partly checked. It is purely
   * visual and cleared when the user toggles the box.
   */
  @property({ type: Boolean, reflect: true }) indeterminate = false;
  /**
   * Key the value is submitted under while the box is checked. Within a `void-checkbox-group` the
   * group's `name` is used.
   */
  @property({ type: String, reflect: true }) name = '';
  /** Submitted under `name` while checked; defaults to "on" like a native checkbox. */
  @property({ type: String, reflect: true }) value = 'on';
  /**
   * Must be checked. Forwarded to the native checkbox, which the browser
   * validates; when it focuses that (aria-hidden) input, focus moves to the host.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  /**
   * Status colour of the checked box: `default`, `error`, `warning`, `caution`, `success`, `info`,
   * `notice` or `highlight`.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  // Consumer label content stays on the host, after the rendered control.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'label', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'checkbox');
    this.setHostAttribute('tabindex', '0');
    this.setHostAttribute('aria-checked', String(this.checked));
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('checked') || changed.has('indeterminate')) {
      if (this.indeterminate) {
        this.setHostAttribute('aria-checked', 'mixed');
      } else {
        this.setHostAttribute('aria-checked', String(this.checked));
      }
    }
    if (changed.has('disabled') || changed.has('ancestorDisabled')) {
      const disabled = this.formDisabled;
      this.setHostAttribute('aria-disabled', disabled ? 'true' : null);
      this.setHostAttribute('tabindex', disabled ? '-1' : '0');
    }
  }

  render() {
    return html`
      <input type="checkbox" .checked=${this.checked} .indeterminate=${this.indeterminate} ?disabled=${this.formDisabled} ?required=${this.required} name=${this.name} value=${this.value} form=${this.formAttr ?? nothing} tabindex="-1" aria-hidden="true" inert @invalid=${this._onNativeInvalid} @focus=${this._onNativeFocus} />
      <span class="void-checkbox-box">
        ${this.checked ? html`<svg viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
        ${this.indeterminate && !this.checked ? html`<svg viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round"/></svg>` : ''}
      </span>
    `;
  }

  /** Form reset target is the checked state; the native checkbox submits. */
  protected formSnapshot(): unknown {
    return this.checked;
  }

  /** A disabled void-checkbox-group disables its checkboxes like a fieldset. */
  protected formAncestorDisabled(): boolean {
    return super.formAncestorDisabled() || Boolean(this.closest('void-checkbox-group')?.hasAttribute('disabled'));
  }

  protected formWriteNativeDefault(state: unknown): void {
    const input = this.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (input) input.defaultChecked = Boolean(state);
  }

  protected formReadNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (input) this.checked = input.checked;
  }

  /** The browser focuses the native input to report validity; hand focus to the host. */
  private _onNativeFocus = (): void => {
    this.focus();
  };

  /**
   * The native input is `inert`, so assistive technology and axe see one widget (the host)
   * rather than a focusable input nested in it. An inert input cannot be focused, which
   * would silently block submission of a required control, so it is made focusable for the
   * moment the browser reports validity.
   */
  private _onNativeInvalid = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    input.inert = false;
    setTimeout(() => { input.inert = true; });
  };

  protected formSyncNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (input && input.checked !== this.checked) input.checked = this.checked;
    // A containing group derives its validity from its checkboxes.
    this.closest('void-checkbox-group')?.requestUpdate();
  }

  private _handleClick = (e: Event): void => {
    if (this.formDisabled) {
      e.stopImmediatePropagation();
      return;
    }
    this.indeterminate = false;
    this.checked = !this.checked;
    const input = this.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    if (input) input.checked = this.checked;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value, checked: this.checked } }));
  };
}

if (!customElements.get('void-checkbox')) {
  customElements.define('void-checkbox', VoidCheckbox);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-checkbox': VoidCheckbox;
  }
}
