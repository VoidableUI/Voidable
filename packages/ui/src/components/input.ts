import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean, forwardedSpellcheck } from '../converters.js';
import { NativeFormControl } from '../form-control.js';

/** Single-line text entry for login forms, search fields, and structured data capture. */
export class VoidInput extends NativeFormControl(VoidElement) {
  /** Native input type. Every text-like type is forwarded to the native control. */
  @property({ type: String, reflect: true }) type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'month' | 'time' | 'week' = 'text';
  /**
   * The text in the field. As an attribute it is the initial value (and the form's reset target); read
   * or set the `value` property for the current text.
   */
  @property({ type: String }) value = '';
  /**
   * Hint text shown while the field is empty. It is not a label: wrap the input in `void-field
   * label="..."`.
   */
  @property({ type: String, reflect: true }) placeholder = '';
  /**
   * Stop the field accepting input and exclude it from the form submission. Also disabled by an
   * enclosing `<fieldset disabled>`.
   */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Show the value but do not let the user edit it. Unlike `disabled`, a readonly field is focusable,
   * selectable and still submitted.
   */
  @property({ type: Boolean, reflect: true }) readonly = false;
  /**
   * The control must have a value before its form can be submitted. An empty control is invalid
   * (`valueMissing`) and the browser reports it, as for a native field.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  /** Key the value is submitted under in the form's `FormData`. Without a name the field submits nothing. */
  @property({ type: String, reflect: true }) name = '';
  /**
   * Size step: `sm`, `md` (default), `lg`, `xl` or `xxl`. Buttons and selects of the same step share its
   * height.
   */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  /**
   * Mark the field invalid: it gets the error styling and `aria-invalid`. The message itself is shown by
   * the wrapping `void-field`, whose own `error` attribute sets this one, so set `error` on the field
   * rather than here.
   */
  @property({ type: String, reflect: true }) error = '';

  /** Autofill hint forwarded to the native control (`autocomplete`), e.g. `current-password`, `one-time-code`, `email`. */
  @property({ type: String, reflect: true }) autocomplete = '';
  /** Minimum number of characters, enforced by the native control (`minlength`) and reported through validity. */
  @property({ type: Number }) minlength: number | undefined = undefined;
  /** Maximum number of characters accepted by the native control (`maxlength`). */
  @property({ type: Number }) maxlength: number | undefined = undefined;
  /** Regular expression the value must match (`pattern`), reported through validity. */
  @property({ type: String }) pattern = '';
  /** Virtual keyboard hint forwarded to the native control (`inputmode`). */
  @property({ type: String, attribute: 'inputmode' }) override inputMode: '' | 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url' = '';
  /** Label of the mobile keyboard's enter key (`enterkeyhint`). */
  @property({ type: String, attribute: 'enterkeyhint' }) override enterKeyHint: '' | 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' = '';
  /** Capitalisation behaviour of virtual keyboards (`autocapitalize`). */
  @property({ type: String }) override autocapitalize: '' | 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters' = '';
  /** Spell checking of the native control (`spellcheck`). Defaults to true; `spellcheck="false"` turns it off from markup. */
  @property({ converter: defaultTrueBoolean }) override spellcheck = true;

  render() {
    return html`
      <input
        type=${this.type}
        .value=${live(this.value)}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        name=${this.name}
        autocomplete=${this.autocomplete || nothing}
        minlength=${this.minlength ?? nothing}
        maxlength=${this.maxlength ?? nothing}
        pattern=${this.pattern || nothing}
        inputmode=${this.inputMode || nothing}
        enterkeyhint=${this.enterKeyHint || nothing}
        autocapitalize=${this.autocapitalize || nothing}
        spellcheck=${forwardedSpellcheck(this) ?? nothing}
        form=${this.formAttr ?? nothing}
        aria-invalid=${this.error ? 'true' : 'false'}
        @input=${this._onInput}
        @change=${this._onChange}
        @keydown=${this._onKeydown}
      />
      ${this.error ? html`<span class="void-input-error">${this.error}</span>` : ''}
    `;
  }

  protected formWriteNativeDefault(state: unknown): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('input');
    if (control) control.defaultValue = String(state ?? '');
  }

  protected formReadNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('input');
    if (control) this.value = control.value;
  }

  protected formSyncNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('input');
    if (control && control.value !== this.value) control.value = this.value;
  }

  /**
   * Implicit submission with a void-button as the default button. Browsers
   * only treat native buttons as a form's default button; with none, Enter
   * submits only when the form has exactly one text-like field (and then the
   * browser does it). So act only when there is no native submit button, more
   * than one blocking field, and an enabled void-button[type=submit].
   */
  private _onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
    const input = e.target as HTMLInputElement;
    const form = input.form;
    if (!form) return;
    const controls = Array.from(form.elements);
    const nativeSubmit = controls.some((c) =>
      (c instanceof HTMLButtonElement && c.type === 'submit') ||
      (c instanceof HTMLInputElement && (c.type === 'submit' || c.type === 'image')));
    if (nativeSubmit) return;
    const blocking = controls.filter((c) => c instanceof HTMLInputElement && IMPLICIT_SUBMIT_BLOCKING.has(c.type));
    if (blocking.length <= 1) return;
    // form.elements lists void-button only where it is form-associated; also look inside the form.
    const candidates = [...controls, ...Array.from(form.querySelectorAll('void-button'))];
    const voidSubmit = candidates.find((c) => c.tagName === 'VOID-BUTTON' && c.getAttribute('type') === 'submit') as
      (HTMLElement & { formDisabled?: boolean }) | undefined;
    if (!voidSubmit || voidSubmit.formDisabled) return;
    e.preventDefault();
    form.requestSubmit();
  }

  private _onInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('void-input', { bubbles: true, composed: true, detail: { value: this.value } }));
  }

  private _onChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
}

/** Input types that count as "fields that block implicit submission" (HTML spec). */
const IMPLICIT_SUBMIT_BLOCKING = new Set([
  'text', 'search', 'url', 'tel', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number',
]);

if (!customElements.get('void-input')) {
  customElements.define('void-input', VoidInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-input': VoidInput;
  }
}
