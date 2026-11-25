import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';

/** Multi-line text entry for comment fields, description inputs, and freeform text that needs more than one line. */
export class VoidTextarea extends NativeFormControl(VoidElement) {
  @property({ type: String }) value = '';
  @property({ type: String, reflect: true }) placeholder = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: String, reflect: true }) name = '';
  @property({ type: Number, reflect: true }) rows = 3;
  @property({ type: String, reflect: true }) resize: 'none' | 'vertical' | 'both' = 'vertical';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) error = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'textbox');
    this.setHostAttribute('aria-multiline', 'true');
  }

  render() {
    return html`
      <textarea
        .value=${this.value}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        name=${this.name}
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
