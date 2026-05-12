import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Single-character input cells for OTP verification codes, PIN entry, and multi-digit confirmation fields. */
export class VoidPinInput extends VoidElement {
  @property({ type: Number }) length: number = 6;
  @property({ type: String, reflect: true }) groups: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Boolean, reflect: true }) mask: boolean = false;
  @property({ type: String, reflect: true }) type: 'numeric' | 'alphanumeric' = 'numeric';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String }) placeholder: string = '';

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

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', 'PIN input');
  }

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
      this.dispatchEvent(new CustomEvent('void-change', {
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
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._focusCell(index - 1);
    } else if (e.key === 'ArrowRight') {
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
          .value=${cellValue}
          placeholder=${this.placeholder || nothing}
          ?disabled=${this.disabled}
          autocomplete="one-time-code"
          aria-label=${`Digit ${i + 1} of ${this._effectiveLength}`}
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
