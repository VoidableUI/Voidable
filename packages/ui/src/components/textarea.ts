import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean, forwardedSpellcheck } from '../converters.js';
import { NativeFormControl } from '../form-control.js';

/**
 * Multi-line text entry for comment fields, description inputs, and freeform text that needs more than one line.
 * The host has no role: the native textarea is the (multi-line) textbox and carries the accessible name,
 * which `<void-field>` supplies.
 */
export class VoidTextarea extends NativeFormControl(VoidElement) {
  /**
   * The text in the box. As an attribute it is the initial value (and the form's reset target); read or
   * set the `value` property for the current text.
   */
  @property({ type: String }) value = '';
  /**
   * Hint text shown while the box is empty. It is not a label: wrap the textarea in `void-field
   * label="..."`.
   */
  @property({ type: String, reflect: true }) placeholder = '';
  /**
   * Stop the box accepting input and exclude it from the form submission. Also disabled by an enclosing
   * `<fieldset disabled>`.
   */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Show the value but do not let the user edit it. Unlike `disabled`, a readonly box is focusable,
   * selectable and still submitted.
   */
  @property({ type: Boolean, reflect: true }) readonly = false;
  /**
   * The control must have a value before its form can be submitted. An empty control is invalid
   * (`valueMissing`) and the browser reports it, as for a native field.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  /** Key the value is submitted under in the form's `FormData`. Without a name the box submits nothing. */
  @property({ type: String, reflect: true }) name = '';
  /** Visible height in lines of text. Defaults to 3. */
  @property({ type: Number, reflect: true }) rows = 3;
  /** Which way the user may drag the corner handle: `vertical` (default), `both` or `none`. */
  @property({ type: String, reflect: true }) resize: 'none' | 'vertical' | 'both' = 'vertical';
  /** Size step: `sm`, `md` (default), `lg`, `xl` or `xxl`; sets the text size and padding. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  /**
   * Mark the box invalid: it gets the error styling and `aria-invalid`. The message itself is shown by
   * the wrapping `void-field`, whose own `error` attribute sets this one.
   */
  @property({ type: String, reflect: true }) error = '';

  /** Autofill hint forwarded to the native control (`autocomplete`), e.g. `current-password`, `one-time-code`, `email`. */
  @property({ type: String, reflect: true }) autocomplete = '';
  /** Minimum number of characters, enforced by the native control (`minlength`) and reported through validity. */
  @property({ type: Number }) minlength: number | undefined = undefined;
  /** Maximum number of characters accepted by the native control (`maxlength`). */
  @property({ type: Number }) maxlength: number | undefined = undefined;
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
      <textarea
        .value=${live(this.value)}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        name=${this.name}
        autocomplete=${this.autocomplete || nothing}
        minlength=${this.minlength ?? nothing}
        maxlength=${this.maxlength ?? nothing}
        inputmode=${this.inputMode || nothing}
        enterkeyhint=${this.enterKeyHint || nothing}
        autocapitalize=${this.autocapitalize || nothing}
        spellcheck=${forwardedSpellcheck(this) ?? nothing}
        form=${this.formAttr ?? nothing}
        rows=${this.rows}
        style="--void-textarea-resize: ${this.resize}"
        aria-invalid=${this.error ? 'true' : 'false'}
        @input=${this._onInput}
        @change=${this._onChange}
      ></textarea>
      ${this.error ? html`<span class="void-textarea-error">${this.error}</span>` : ''}
    `;
  }

  protected formWriteNativeDefault(state: unknown): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('textarea');
    if (control) control.defaultValue = String(state ?? '');
  }

  protected formReadNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('textarea');
    if (control) this.value = control.value;
  }

  protected formSyncNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('textarea');
    if (control && control.value !== this.value) control.value = this.value;
  }

  private _onInput(e: Event): void {
    const ta = e.target as HTMLTextAreaElement;
    this.value = ta.value;
    this.dispatchEvent(new CustomEvent('void-input', { bubbles: true, composed: true, detail: { value: this.value } }));
  }

  private _onChange(e: Event): void {
    const ta = e.target as HTMLTextAreaElement;
    this.value = ta.value;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
}

if (!customElements.get('void-textarea')) {
  customElements.define('void-textarea', VoidTextarea);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-textarea': VoidTextarea;
  }
}
