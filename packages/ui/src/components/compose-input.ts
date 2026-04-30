import { html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidComposeInput extends VoidElement {
  @property({ type: String }) value = '';
  @property({ type: String, reflect: true }) placeholder = 'Type a message...';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Number, reflect: true }) maxlength = 0;

  @query('.void-compose-input-textarea') private _textarea!: HTMLTextAreaElement;

  render() {
    return html`
      <div class="void-compose-input-wrapper">
        <textarea
          class="void-compose-input-textarea"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          maxlength=${this.maxlength > 0 ? this.maxlength : ''}
          rows="1"
          @input=${this._onInput}
          @keydown=${this._onKeydown}
        ></textarea>
        <button
          class="void-compose-input-send"
          type="button"
          ?disabled=${this.disabled || !this.value}
          @click=${this._onSend}
          aria-label="Send"
        >
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;
  }

  private _onInput(e: Event): void {
    const ta = e.target as HTMLTextAreaElement;
    this.value = ta.value;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
    this.dispatchEvent(new CustomEvent('void-input', { bubbles: true, composed: true, detail: { value: this.value } }));
  }

  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._onSend();
    }
  }

  private _onSend(): void {
    if (this.disabled || !this.value) return;
    const value = this.value;
    this.value = '';
    if (this._textarea) {
      this._textarea.style.height = 'auto';
    }
    this.dispatchEvent(new CustomEvent('void-submit', { bubbles: true, composed: true, detail: { value } }));
  }
}

if (!customElements.get('void-compose-input')) {
  customElements.define('void-compose-input', VoidComposeInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-compose-input': VoidComposeInput;
  }
}
