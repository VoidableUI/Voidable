import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { VoidOption } from './multiselect.js';

/** Filterable dropdown for long option lists like country selectors, user assignment fields, and tag pickers. */
export class VoidCombobox extends VoidElement {
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = 'Search...';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) name = '';

  private _open = false;
  private _query = '';
  private _options: VoidOption[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    this._options = Array.from(this.querySelectorAll<VoidOption>('void-option'));
    this.setAttribute('role', 'combobox');
    this.setAttribute('aria-autocomplete', 'list');
    document.addEventListener('click', this._onDocumentClick);
    document.addEventListener('keydown', this._onDocumentKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocumentClick);
    document.removeEventListener('keydown', this._onDocumentKeydown);
  }

  updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    this.setAttribute('aria-expanded', String(this._open));
  }

  render() {
    const visible = this._options.filter(
      opt => opt.textContent?.trim().toLowerCase().includes(this._query.toLowerCase())
    );
    const selectedOpt = this._options.find(o => o.value === this.value);

    return html`
      <input
        class="void-combobox-input"
        .value=${this._open ? this._query : (selectedOpt?.textContent?.trim() || this.value || '')}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        autocomplete="off"
        aria-autocomplete="list"
        aria-expanded=${String(this._open)}
        aria-invalid=${this.error ? 'true' : 'false'}
        @focus=${this._onInputFocus}
        @input=${this._onInput}
        @keydown=${this._onInputKeydown}
        @blur=${this._onInputBlur}
      />
      ${this._open ? html`
        <div class="void-combobox-dropdown" role="listbox" aria-label=${this.placeholder}>
          ${visible.length > 0
            ? visible.map(opt => html`
                <div
                  class="void-combobox-option"
                  role="option"
                  aria-selected=${opt.value === this.value ? 'true' : 'false'}
                  @mousedown=${(e: Event) => { e.preventDefault(); this._selectOption(opt); }}
                >${opt.textContent?.trim() || opt.value}</div>
              `)
            : html`<div class="void-combobox-empty">No options found</div>`
          }
        </div>
      ` : nothing}
      ${this.error ? html`<span class="void-combobox-error">${this.error}</span>` : nothing}
    `;
  }

  private _onInputFocus = (): void => {
    if (this.disabled) return;
    this._open = true;
    this._query = '';
    this.requestUpdate();
  };

  private _onInput = (e: Event): void => {
    this._query = (e.target as HTMLInputElement).value;
    this._open = true;
    this.requestUpdate();
  };

  private _onInputKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this._open = false;
      this._query = '';
      this.requestUpdate();
    }
  };

  private _onInputBlur = (): void => {
    setTimeout(() => {
      this._open = false;
      this._query = '';
      this.requestUpdate();
    }, 150);
  };

  private _onDocumentClick = (e: Event): void => {
    if (!this.contains(e.target as Node)) {
      this._open = false;
      this._query = '';
      this.requestUpdate();
    }
  };

  private _onDocumentKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._open) {
      this._open = false;
      this._query = '';
      this.requestUpdate();
    }
  };

  private _selectOption(opt: VoidOption): void {
    this.value = opt.value;
    this._open = false;
    this._query = '';
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
}

if (!customElements.get('void-combobox')) {
  customElements.define('void-combobox', VoidCombobox);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-combobox': VoidCombobox;
  }
}
