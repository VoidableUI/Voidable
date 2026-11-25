import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';

export type TagValue = string | { text: string; color?: string };

/** Multi-tag input field for email recipients, category labels, keyword tagging, and comma-separated value entry. */
export class VoidTagsInput extends InternalsFormControl(VoidElement) {
  @property({ type: Array }) value: TagValue[] = [];
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Number }) max = Infinity;
  @property({ type: String }) placeholder = 'Add tag...';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) variant: 'filled' | 'outline' = 'outline';
  @property({ type: Boolean, attribute: 'allow-duplicates' }) allowDuplicates = false;

  private _tagText(tag: TagValue): string {
    return typeof tag === 'string' ? tag : tag.text;
  }

  private _tagColor(tag: TagValue): string | undefined {
    return typeof tag === 'string' ? undefined : tag.color;
  }

  /**
   * One entry per tag (its text), plus text still in the entry field that
   * would be accepted as a tag: a submit must not silently drop what the user
   * typed but has not confirmed with Enter or a comma.
   */
  protected formSubmission(): FormSubmission {
    const tags = this.value.map((t) => this._tagText(t));
    const pending = this.querySelector<HTMLInputElement>('.void-tags-input-field')?.value.trim() ?? '';
    if (pending && tags.length < this.max && (this.allowDuplicates || !tags.includes(pending))) {
      tags.push(pending);
    }
    return tags;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'listbox');
  }

  render() {
    const atMax = this.value.length >= this.max;

    return html`
      <div class="void-tags-input" @click=${this._focusInput} @keydown=${this._onContainerKeydown}>
        ${this.value.map(
          (tag, i) => {
            const text = this._tagText(tag);
            const color = this._tagColor(tag);
            return html`
              <span
                class="void-tags-input-tag"
                role="option"
                aria-selected="true"
                data-color=${color || nothing}
              >
                <span class="void-tags-input-tag-text">${text}</span>
                ${!this.disabled && !this.readonly
                  ? html`<button
                      type="button"
                      class="void-tags-input-tag-remove"
                      aria-label="Remove ${text}"
                      @click=${(e: Event) => { e.stopPropagation(); this._removeTag(i); }}
                    >×</button>`
                  : nothing}
              </span>
            `;
          },
        )}
        ${!atMax && !this.readonly
          ? html`<input
              class="void-tags-input-field"
              type="text"
              placeholder=${this.value.length === 0 ? this.placeholder : ''}
              ?disabled=${this.disabled}
              @keydown=${this._onKeydown}
              @input=${this._onFieldInput}
              @paste=${this._onPaste}
            />`
          : nothing}
      </div>
    `;
  }

  private _focusInput(): void {
    const input = this.querySelector<HTMLInputElement>('.void-tags-input-field');
    input?.focus();
  }

  private _onContainerKeydown(e: KeyboardEvent): void {
    if (e.target === this.querySelector('.void-tags-input')) {
      this._focusInput();
    }
  }

  private _addTag(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!this.allowDuplicates && this.value.some(t => this._tagText(t) === trimmed)) return;
    if (this.value.length >= this.max) return;

    this.value = [...this.value, trimmed];
    this._dispatchChange();
  }

  private _removeTag(index: number): void {
    if (this.disabled || this.readonly) return;
    this.value = this.value.filter((_, i) => i !== index);
    this._dispatchChange();
  }

  private _onKeydown(e: KeyboardEvent): void {
    const input = e.target as HTMLInputElement;

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const raw = input.value;
      // Clear first so the form value never counts the text twice.
      input.value = '';
      this._addTag(raw);
      this.formSync();
    } else if (e.key === 'Backspace' && input.value === '' && this.value.length > 0) {
      this._removeTag(this.value.length - 1);
    }
  }

  private _onFieldInput(): void {
    this.formSync();
  }

  private _onPaste(e: ClipboardEvent): void {
    const text = e.clipboardData?.getData('text') ?? '';
    if (text.includes(',')) {
      e.preventDefault();
      const parts = text.split(',');
      for (const part of parts) {
        this._addTag(part);
      }
    }
  }

  private _dispatchChange(): void {
    this.dispatchEvent(
      new CustomEvent('void-change', {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  }
}

if (!customElements.get('void-tags-input')) {
  customElements.define('void-tags-input', VoidTagsInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-tags-input': VoidTagsInput;
  }
}
