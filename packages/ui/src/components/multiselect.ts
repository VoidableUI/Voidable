import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidOption extends VoidElement {
  @property({ type: String, reflect: true }) value = '';
  @property({ type: Boolean, reflect: true }) selected = false;

}

if (!customElements.get('void-option')) {
  customElements.define('void-option', VoidOption);
}

export class VoidMultiselect extends VoidElement {
  @property({ type: String }) placeholder = 'Select...';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) name = '';

  private _open = false;
  private _options: VoidOption[] = [];
  private _didSetup = false;

  get value(): string[] {
    return this._options.filter(o => o.selected).map(o => o.value);
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._didSetup) {
      this._options = Array.from(this.querySelectorAll('void-option')) as VoidOption[];
    }
    this.setAttribute('role', 'combobox');
    this.setAttribute('aria-haspopup', 'listbox');
    document.addEventListener('click', this._onDocumentClick);
    document.addEventListener('keydown', this._onDocumentKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocumentClick);
    document.removeEventListener('keydown', this._onDocumentKeydown);
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSetup) {
      this._didSetup = true;
    }
    this.setAttribute('aria-expanded', String(this._open));
  }

  render() {
    const selectedOpts = this._options.filter(o => o.selected);
    return html`
      <div
        class="void-multiselect-trigger"
        tabindex=${this.disabled ? '-1' : '0'}
        @click=${this._onTriggerClick}
        @keydown=${this._onTriggerKeydown}
      >
        ${selectedOpts.length > 0
          ? selectedOpts.map(opt => html`
              <span class="void-multiselect-pill">
                <span class="void-multiselect-pill-label">${opt.textContent?.trim() || opt.value}</span>
                <button
                  class="void-multiselect-pill-remove"
                  aria-label="Remove ${opt.textContent?.trim() || opt.value}"
                  @click=${(e: Event) => { e.stopPropagation(); this._deselect(opt); }}
                >×</button>
              </span>
            `)
          : html`<span class="void-multiselect-placeholder">${this.placeholder}</span>`
        }
      </div>
      ${this._open ? html`
        <div class="void-multiselect-dropdown" role="listbox" aria-label=${this.placeholder} aria-multiselectable="true">
          ${this._options.map(opt => html`
            <div
              class="void-multiselect-option"
              role="option"
              tabindex="0"
              aria-selected=${opt.selected ? 'true' : 'false'}
              @click=${() => this._toggleOption(opt)}
              @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggleOption(opt); } }}
            >
              <span class="void-multiselect-checkbox">
                ${opt.selected ? html`<svg viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/></svg>` : nothing}
              </span>
              <span class="void-multiselect-option-label">${opt.textContent?.trim() || opt.value}</span>
            </div>
          `)}
        </div>
      ` : nothing}
      ${this.error ? html`<span class="void-multiselect-error">${this.error}</span>` : nothing}
    `;
  }

  private _onTriggerClick = (e: Event): void => {
    if (this.disabled) return;
    e.stopPropagation();
    this._open = !this._open;
    this.requestUpdate();
  };

  private _onTriggerKeydown = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._open = !this._open;
      this.requestUpdate();
    } else if (e.key === 'Escape') {
      this._open = false;
      this.requestUpdate();
    }
  };

  private _onDocumentClick = (e: Event): void => {
    if (!this.contains(e.target as Node)) {
      this._open = false;
      this.requestUpdate();
    }
  };

  private _onDocumentKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._open) {
      this._open = false;
      this.requestUpdate();
    }
  };

  private _toggleOption(opt: VoidOption): void {
    opt.selected = !opt.selected;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { values: this.value },
    }));
  }

  private _deselect(opt: VoidOption): void {
    opt.selected = false;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { values: this.value },
    }));
  }
}

if (!customElements.get('void-multiselect')) {
  customElements.define('void-multiselect', VoidMultiselect);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-option': VoidOption;
    'void-multiselect': VoidMultiselect;
  }
}
