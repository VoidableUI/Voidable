import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Inline editable text for renaming items, editing headings, and click-to-edit table cells. */
export class VoidEditable extends VoidElement {
  @property({ type: String, reflect: true }) value = '';
  @property({ type: Boolean, reflect: true }) editing = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String }) placeholder = 'Click to edit';
  @property({ type: String, reflect: true, attribute: 'submit-mode' }) submitMode: 'blur' | 'enter' | 'both' = 'both';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private _previousValue = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._handleClick);
    this.addEventListener('dblclick', this._handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('dblclick', this._handleClick);
  }

  render() {
    return html`
      <span
        class="void-editable-preview"
        tabindex=${this.disabled ? nothing : '0'}
        @keydown=${this._handlePreviewKeydown}
      >${this.value || html`<span class="void-editable-placeholder">${this.placeholder}</span>`}</span>
      <input
        class="void-editable-input"
        .value=${this.value}
        @keydown=${this._handleInputKeydown}
        @blur=${this._handleBlur}
      />
    `;
  }

  private _handleClick = (): void => {
    if (this.disabled || this.editing) return;
    this._enterEditMode();
  };

  private _handlePreviewKeydown = (e: KeyboardEvent): void => {
    if (this.disabled || this.editing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._enterEditMode();
    }
  };

  private _enterEditMode(): void {
    this._previousValue = this.value;
    this.editing = true;
    this.updateComplete.then(() => {
      const input = this.querySelector<HTMLInputElement>('.void-editable-input');
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  private _handleInputKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this._cancel();
      return;
    }
    if (e.key === 'Enter' && (this.submitMode === 'enter' || this.submitMode === 'both')) {
      e.preventDefault();
      this._confirm();
    }
  };

  private _handleBlur = (): void => {
    if (!this.editing) return;
    if (this.submitMode === 'blur' || this.submitMode === 'both') {
      this._confirm();
    } else {
      this._cancel();
    }
  };

  private _confirm(): void {
    const input = this.querySelector<HTMLInputElement>('.void-editable-input');
    if (input) {
      this.value = input.value;
    }
    this.editing = false;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }

  private _cancel(): void {
    this.value = this._previousValue;
    this.editing = false;
    this.dispatchEvent(new CustomEvent('void-cancel', { bubbles: true, composed: true }));
  }
}

if (!customElements.get('void-editable')) {
  customElements.define('void-editable', VoidEditable);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-editable': VoidEditable;
  }
}
