import { html, nothing, type PropertyDeclaration, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { inlineKeys } from '../keyboard.js';
import { InternalsFormControl } from '../form-control.js';
import { dropReflectedValue, valueReflection } from '../secret-value.js';
import { isFocusParked } from '../projection.js';
import { msg, nameHost } from '../messages.js';

/**
 * Single-character input cells for OTP verification codes, PIN entry, and multi-digit confirmation fields.
 *
 * @fires {CustomEvent<{ value: string }>} void-input - A character was typed, pasted or deleted.
 * @fires {CustomEvent<{ value: string }>} void-change - Focus left the cells with a different value from when it came
 * in (the commit, as a native field's `change`).
 * @fires {CustomEvent<{ value: string }>} void-complete - Every cell is filled.
 */
export class VoidPinInput extends InternalsFormControl(VoidElement) {
  /** While focus is inside, a morph does not apply the server's value over what the user is typing. */
  static override editState = ['value'];
  /** Number of cells, so the number of characters in the code. Defaults to 6. */
  @property({ type: Number }) length: number = 6;
  /**
   * Visual grouping of the cells as comma-separated sizes, such as `3,3` for a code drawn as `123 456`.
   * Display only; the value has no separator.
   */
  @property({ type: String, reflect: true }) groups: string = '';
  /**
   * The characters entered so far, without separators, reflected to the `value` attribute as they
   * change; the form's reset target stays the value the cells started with. A `mask`ed input does not
   * reflect: its attribute is only ever the initial value.
   */
  @property({ type: String, reflect: true }) value: string = '';
  /** Stop the cells accepting input and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  /**
   * Hide the entered characters as dots, like a password field. Use it for a PIN, not for a one-time
   * code.
   */
  @property({ type: Boolean, reflect: true }) mask: boolean = false;
  /** Which characters the cells accept: `numeric` (default, digits only) or `alphanumeric`. */
  @property({ type: String, reflect: true }) type: 'numeric' | 'alphanumeric' = 'numeric';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Status colour of the cells: `default`, `error`, `warning`, `caution`, `success`, `info`, `notice` or `highlight`.
   * Use `error` after a wrong code.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Character shown in every empty cell, such as `-`. */
  @property({ type: String }) placeholder: string = '';

  override requestUpdate(name?: PropertyKey, oldValue?: unknown, options?: PropertyDeclaration): void {
    super.requestUpdate(name, oldValue, valueReflection(this.mask, name, options, () => VoidPinInput.getPropertyOptions('value')));
  }

  private _name(): void {
    nameHost(this, msg(this, 'pinInput.label'), (n, v) => this.setHostAttribute(n, v));
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this._name();
    // An input turned into a masked one takes back the value it reflected as text.
    if (this.mask && changed.get('mask') !== undefined) dropReflectedValue(this);
  }

  private get _effectiveLength(): number {
    const g = this._parsedGroups;
    return g.length > 0 ? g.reduce((a, b) => a + b, 0) : this.length;
  }

  private get _parsedGroups(): number[] {
    if (!this.groups) return [];
    return this.groups.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
  }

  private _separatorIndices(): Set<number> {
    const groups = this._parsedGroups;
    if (groups.length < 2) return new Set();
    const indices = new Set<number>();
    let cumulative = 0;
    for (let i = 0; i < groups.length - 1; i++) {
      cumulative += groups[i];
      indices.add(cumulative);
    }
    return indices;
  }

  /** The value when focus came into the cells (null while focus is elsewhere). */
  private _focusValue: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'group');
    this._name();
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('focusin', this._onFocusIn);
    this.removeEventListener('focusout', this._onFocusOut);
  }

  private _onFocusIn = (): void => {
    this._focusValue ??= this.value;
  };

  /** Focus left the component: commit, as a native field fires `change` on blur. */
  private _onFocusOut = (e: FocusEvent): void => {
    if (e.relatedTarget instanceof Node && this.contains(e.relatedTarget)) return;
    if (isFocusParked(this)) return;
    const before = this._focusValue;
    this._focusValue = null;
    if (before !== null && before !== this.value) {
      this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
    }
  };

  private _getCells(): HTMLInputElement[] {
    return Array.from(this.querySelectorAll<HTMLInputElement>('.void-pin-cell'));
  }

  private _focusCell(index: number): void {
    const cells = this._getCells();
    if (index >= 0 && index < cells.length) {
      cells[index].focus();
      cells[index].select();
    }
  }

  private _collectValue(): string {
    return this._getCells().map((c) => c.value).join('');
  }

  private _syncValue(): void {
    const previous = this.value;
    this.value = this._collectValue();
    if (this.value !== previous) {
      this.dispatchEvent(new CustomEvent('void-input', {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }));
      if (this.value.length === this._effectiveLength) {
        this.dispatchEvent(new CustomEvent('void-complete', {
          bubbles: true,
          composed: true,
          detail: { value: this.value },
        }));
      }
    }
  }

  private _isValidChar(char: string): boolean {
    if (this.type === 'numeric') {
      return /^[0-9]$/.test(char);
    }
    return /^[a-zA-Z0-9]$/.test(char);
  }

  private _onInput(e: Event, index: number): void {
    const input = e.target as HTMLInputElement;
    const char = input.value;
    if (char && !this._isValidChar(char)) {
      input.value = '';
      return;
    }
    this._syncValue();
    if (char && index < this._effectiveLength - 1) {
      this._focusCell(index + 1);
    }
  }

  private _onKeydown(e: KeyboardEvent, index: number): void {
    const input = e.target as HTMLInputElement;

    if (e.key === 'Backspace') {
      if (input.value) {
        input.value = '';
        this._syncValue();
      } else if (index > 0) {
        this._focusCell(index - 1);
        const prev = this._getCells()[index - 1];
        prev.value = '';
        this._syncValue();
      }
      e.preventDefault();
    } else if (e.key === inlineKeys(this).prev) {
      e.preventDefault();
      this._focusCell(index - 1);
    } else if (e.key === inlineKeys(this).next) {
      e.preventDefault();
      this._focusCell(index + 1);
    } else if (e.key === 'Delete') {
      input.value = '';
      this._syncValue();
      e.preventDefault();
    }
  }

  private _onPaste(e: ClipboardEvent): void {
    e.preventDefault();
    const pasted = e.clipboardData?.getData('text') ?? '';
    const cells = this._getCells();
    const target = e.target as HTMLInputElement;
    const startIndex = cells.indexOf(target);

    let offset = 0;
    for (let i = 0; i < pasted.length && startIndex + offset < cells.length; i++) {
      const char = pasted[i];
      if (this._isValidChar(char)) {
        cells[startIndex + offset].value = char;
        offset++;
      }
    }
    this._syncValue();
    const focusIndex = Math.min(startIndex + offset, this._effectiveLength - 1);
    this._focusCell(focusIndex);
  }

  private _onFocus(e: FocusEvent): void {
    const input = e.target as HTMLInputElement;
    input.select();
  }

  render() {
    const items = [];
    const separators = this._separatorIndices();
    for (let i = 0; i < this._effectiveLength; i++) {
      if (separators.has(i)) {
        items.push(html`<span class="void-pin-separator" aria-hidden="true">–</span>`);
      }
      const cellValue = this.value[i] ?? '';
      items.push(html`
        <input
          class="void-pin-cell"
          type=${this.mask ? 'password' : 'text'}
          inputmode=${this.type === 'numeric' ? 'numeric' : 'text'}
          maxlength="1"
          .value=${live(cellValue)}
          placeholder=${this.placeholder || nothing}
          ?disabled=${this.disabled}
          autocomplete="one-time-code"
          aria-label=${msg(this, 'pinInput.digit', { index: i + 1, count: this._effectiveLength })}
          @input=${(e: Event) => this._onInput(e, i)}
          @keydown=${(e: KeyboardEvent) => this._onKeydown(e, i)}
          @paste=${this._onPaste}
          @focus=${this._onFocus}
        />
      `);
    }
    return html`<div class="void-pin-input">${items}</div>`;
  }
}

if (!customElements.get('void-pin-input')) {
  customElements.define('void-pin-input', VoidPinInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-pin-input': VoidPinInput;
  }
}
