import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';

/** Single-line text entry for login forms, search fields, and structured data capture. */
export class VoidInput extends NativeFormControl(VoidElement) {
  @property({ type: String, reflect: true }) type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' = 'text';
  @property({ type: String }) value = '';
  @property({ type: String, reflect: true }) placeholder = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: String, reflect: true }) name = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) error = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'textbox');
  }

  render() {
    return html`
      <input
        type=${this.type}
        .value=${this.value}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        name=${this.name}
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
