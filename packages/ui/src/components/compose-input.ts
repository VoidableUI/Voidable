import { html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { useProjection } from '../projection.js';

useProjection();

/** Rich text entry area for messaging UIs, comment boxes, and social post composers. */
export class VoidComposeInput extends VoidElement {
  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = 'textarea';

  /** While focus is inside, a morph does not apply the server's value over what the user is typing. */
  static override editState = ['value'];
  /** The draft text, reflected to the `value` attribute as it changes. It is cleared after each send. */
  @property({ type: String, reflect: true }) value = '';
  /** Hint shown while the box is empty. Defaults to `Type a message...`. */
  @property({ type: String, reflect: true }) placeholder = 'Type a message...';
  /** Stop the box and the send button reacting. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Maximum number of characters. 0 (the default) means no limit. */
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
            <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;
  }

  private _onInput(e: Event): void {
    const ta = e.target as HTMLTextAreaElement;
    this.value = ta.value;
    ta.style.height = 'auto';
    const scrollHeight = ta.scrollHeight;
    ta.style.height = '';
    this.setHostStyle('--void-compose-input-height', `${scrollHeight}px`);
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
      this._textarea.style.height = '';
      this.setHostStyle('--void-compose-input-height', null);
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
