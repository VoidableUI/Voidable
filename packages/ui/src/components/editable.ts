import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { msg } from '../messages.js';
import { actionFor } from '../keyboard.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { editableFieldKeys, editableKeys, editablePreviewKeys } from '../keymaps/fields.js';
import { InternalsFormControl } from '../form-control.js';
import { isFocusParked } from '../projection.js';

/**
 * Inline editable text for renaming items, editing headings, and click-to-edit table cells.
 *
 * Forms submit the committed `value`, never text still being edited. With
 * `submit-mode="enter"` only Enter commits: leaving the field (blur, including
 * clicking a submit button) cancels the edit by design, so the form submits
 * the previous value. Use `both` (default) or `blur` to commit on blur.
 */
export class VoidEditable extends InternalsFormControl(VoidElement) {
  /** Key bindings for this element's actions, as JSON (`{"cancel":[]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = editableKeys;

  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = '.void-editable-preview, .void-editable-input';

  /** While focus is inside, a morph does not apply the server's value over what the user is typing. */
  static override editState = ['value'];
  /**
   * The committed text. Reflected to the attribute as it changes; the form's reset target stays the value it started with. Text still
   * being edited is not part of it until committed.
   */
  @property({ type: String, reflect: true }) value = '';
  /**
   * Whether the field is in edit mode (an input) rather than showing text. Clicking, Enter or Space
   * starts editing; Escape cancels and `void-cancel` fires.
   */
  @property({ type: Boolean, reflect: true }) editing = false;
  /** Stop the field entering edit mode and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Text shown while the value is empty and the field is not being edited. Defaults to the `editable.placeholder` message (English: `Click to edit`). */
  @property({ type: String }) placeholder = '';
  private get _hint(): string { return this.placeholder || msg(this, 'editable.placeholder'); }
  /**
   * How an edit is committed: `enter` only on Enter (blur cancels), `blur` only when focus leaves, or
   * `both` (default).
   */
  @property({ type: String, reflect: true, attribute: 'submit-mode' }) submitMode: 'blur' | 'enter' | 'both' = 'both';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private _previousValue = '';
  /** Text being edited and not confirmed yet; null when the field shows `value`. */
  private _draft: string | null = null;

  /** The draft survives re-renders and morphs until confirmed or cancelled, unless the server changes `value`. */
  static override clientState = { _draft: 'value' };

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
        role="button"
        tabindex=${this.formDisabled ? nothing : '0'}
        @keydown=${this._handlePreviewKeydown}
      >${this.value || html`<span class="void-editable-placeholder">${this._hint}</span>`}</span>
      <input
        class="void-editable-input"
        .value=${live(this._draft ?? this.value)}
        @input=${this._handleInput}
        @keydown=${this._handleInputKeydown}
        @blur=${this._handleBlur}
      />
    `;
  }

  private _handleClick = (): void => {
    if (this.formDisabled || this.editing) return;
    this._enterEditMode();
  };

  private _handlePreviewKeydown = (e: KeyboardEvent): void => {
    if (this.formDisabled || this.editing) return;
    if (actionFor(this, e, editablePreviewKeys) === 'activate') {
      e.preventDefault();
      this._enterEditMode();
    }
  };

  private _handleInput = (e: Event): void => {
    if (!this.editing) return;
    const value = (e.target as HTMLInputElement).value;
    this._draft = value;
    this.dispatchEvent(new CustomEvent('void-input', { bubbles: true, composed: true, detail: { value } }));
  };

  private _enterEditMode(): void {
    this._previousValue = this.value;
    this._draft = null;
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
    const action = actionFor(this, e, editableFieldKeys);
    if (action === 'cancel') {
      e.preventDefault();
      this._cancel();
      return;
    }
    if (action === 'submit' && (this.submitMode === 'enter' || this.submitMode === 'both')) {
      e.preventDefault();
      this._confirm();
    }
  };

  private _handleBlur = (): void => {
    // A morph moving the field out of the document (browsers without
    // Element.moveBefore) is not the user leaving it: focus comes back.
    if (!this.editing || isFocusParked(this)) return;
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
    this._draft = null;
    this.editing = false;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }

  private _cancel(): void {
    this.value = this._previousValue;
    this._draft = null;
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
