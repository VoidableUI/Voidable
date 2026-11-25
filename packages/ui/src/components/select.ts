import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';

/** Native dropdown for small option sets in forms where a simple pick-one is sufficient. */
export class VoidSelect extends NativeFormControl(VoidElement) {
  @property({ type: String }) value = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: String, reflect: true }) name = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) placeholder = '';

  private _options: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._didSetup) {
      this._options = Array.from(this.childNodes);
    }
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSetup) {
      this._didSetup = true;
      const select = this.querySelector('select');
      if (select) {
        for (const node of this._options) {
          select.appendChild(node);
        }
        if (this.value) {
          select.value = this.value;
        }
      }
      this._adoptNativeValue();
      this.formCaptureDefault();
    } else if (_changed.has('value')) {
      this._applyValue();
    }
  }

  /** With no explicit value and no placeholder, the native select shows (and submits) its first option. */
  private _adoptNativeValue(): void {
    const select = this.querySelector('select');
    if (select && !this.value && !this.placeholder && select.value) {
      this.value = select.value;
    }
  }

  /** Push a programmatic value into the native select without firing void-change. */
  private _applyValue(): void {
    const select = this.querySelector('select');
    if (select && select.value !== this.value) {
      select.value = this.value;
    }
  }

  formRestore(state: unknown): void {
    this.value = String(state ?? '');
    const select = this.querySelector('select');
    if (!select) return;
    // Make the restored option the native default so the browser's own reset agrees.
    const options = Array.from(select.options);
    if (options.some((o) => o.value === this.value)) {
      for (const option of options) option.defaultSelected = option.value === this.value;
    }
    select.value = this.value;
  }

  render() {
    return html`
      <select
        ?disabled=${this.disabled}
        ?required=${this.required}
        name=${this.name}
        aria-invalid=${this.error ? 'true' : 'false'}
        @change=${this._onChange}
      >${this.placeholder
        ? html`<option class="void-select-placeholder" value="" disabled hidden selected>${this.placeholder}</option>`
        : nothing}</select>
      ${this.error ? html`<span class="void-select-error">${this.error}</span>` : ''}
    `;
  }

  private _onChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.value = select.value;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
}

if (!customElements.get('void-select')) {
  customElements.define('void-select', VoidSelect);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-select': VoidSelect;
  }
}
