import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { defaultTrueBoolean, forwardedSpellcheck } from '../converters.js';
import { NativeFormControl } from '../form-control.js';

/** Input field with an attached icon button — used for copy-to-clipboard inputs, search boxes, and similar patterns. */
export class VoidActionInput extends NativeFormControl(VoidElement) {
  /**
   * The text in the field. As an attribute it is the initial value; read or set the `value` property for
   * the current text.
   */
  @property({ type: String }) value = '';
  /**
   * Hint text shown while the field is empty. It also names the field for assistive technology when
   * there is no `aria-label`.
   */
  @property({ type: String, reflect: true }) placeholder = '';
  /** Stop the field and its button reacting and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Show the value but do not let the user edit it; the field is still focusable and submitted. The
   * action button still works, which is what a copy-to-clipboard field wants.
   */
  @property({ type: Boolean, reflect: true }) readonly = false;
  /**
   * The control must have a value before its form can be submitted. An empty control is invalid
   * (`valueMissing`) and the browser reports it, as for a native field.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  /** Key the value is submitted under in the form's `FormData`. Without a name the field submits nothing. */
  @property({ type: String, reflect: true }) name = '';
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
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Status colour of the action button: `default`, `error`, `warning`, `caution`, `success`, `info` or
   * `notice`.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' = 'default';
  /** Native input type; any text-like type is forwarded to the native control. */
  @property({ type: String, reflect: true }) type: 'text' | 'password' | 'search' | 'email' | 'tel' | 'url' = 'text';
  /**
   * Icon on the button: `search` (default), `copy`, `clipboard`, `send`, `eye`, `eye-off`, `check`, `x`
   * or `arrow-right`. Any other value draws the search icon.
   */
  @property({ type: String, reflect: true }) icon: string = 'search';
  /** Accessible name of the button and its tooltip. Defaults to `Action`; say what it does (`Copy link`). */
  @property({ type: String, attribute: 'action-label' }) actionLabel = 'Action';
  /** Which side of the field the button sits on: `right` (default) or `left`. */
  @property({ type: String, reflect: true }) position: 'left' | 'right' = 'right';
  /** Where the button's tooltip appears: `top` (default), `bottom`, `left` or `right`. */
  @property({ type: String, reflect: true, attribute: 'tooltip-position' }) tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  private _renderIcon() {
    switch (this.icon) {
      case 'copy':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666"/><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/></svg>`;
      case 'search':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/></svg>`;
      case 'send':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 14l11 -11"/><path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5"/></svg>`;
      case 'eye':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/></svg>`;
      case 'eye-off':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.585 10.587a2 2 0 0 0 2.829 2.828"/><path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87"/><path d="M3 3l18 18"/></svg>`;
      case 'check':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>`;
      case 'x':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>`;
      case 'arrow-right':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>`;
      case 'clipboard':
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"/><path d="M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2"/></svg>`;
      default:
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/></svg>`;
    }
  }

  protected formWriteNativeDefault(state: unknown): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('.void-action-input-field');
    if (control) control.defaultValue = String(state ?? '');
  }

  protected formReadNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('.void-action-input-field');
    if (control) this.value = control.value;
  }

  protected formSyncNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('.void-action-input-field');
    if (control && control.value !== this.value) control.value = this.value;
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

  private _onAction(): void {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('void-action', { bubbles: true, composed: true, detail: { value: this.value } }));
  }

  render() {
    const btn = html`
      <void-tooltip text=${this.actionLabel} position=${this.tooltipPosition}>
        <button
          class="void-action-input-btn"
          type="button"
          ?disabled=${this.disabled}
          aria-label=${this.actionLabel}
          @click=${this._onAction}
        >${this._renderIcon()}</button>
      </void-tooltip>
    `;

    return html`
      ${this.position === 'left' ? btn : ''}
      <input
        class="void-action-input-field"
        type=${this.type}
        .value=${live(this.value)}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        name=${this.name}
        form=${this.formAttr ?? nothing}
        autocomplete=${this.autocomplete || nothing}
        minlength=${this.minlength ?? nothing}
        maxlength=${this.maxlength ?? nothing}
        pattern=${this.pattern || nothing}
        inputmode=${this.inputMode || nothing}
        enterkeyhint=${this.enterKeyHint || nothing}
        autocapitalize=${this.autocapitalize || nothing}
        spellcheck=${forwardedSpellcheck(this) ?? nothing}
        aria-label=${this.getAttribute('aria-label') || this.placeholder || nothing}
        @input=${this._onInput}
        @change=${this._onChange}
      />
      ${this.position === 'right' ? btn : ''}
    `;
  }
}

if (!customElements.get('void-action-input')) {
  customElements.define('void-action-input', VoidActionInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-action-input': VoidActionInput;
  }
}
