import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidSelect extends VoidElement {
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
    }
  }

  render() {
    return html`
      <select
        ?disabled=${this.disabled}
        ?required=${this.required}
        name=${this.name}
        aria-invalid=${this.error ? 'true' : 'false'}
        @change=${this._onChange}
      ></select>
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
