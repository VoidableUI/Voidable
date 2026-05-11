import { html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Precise numeric entry for quantity selectors, price fields, and settings with increment/decrement controls. */
export class VoidNumberInput extends VoidElement {
  @property({ type: Number, reflect: true }) value: number = 0;
  @property({ type: Number }) min: number = Number.NEGATIVE_INFINITY;
  @property({ type: Number }) max: number = Number.POSITIVE_INFINITY;
  @property({ type: Number }) step: number = 1;
  @property({ type: Number }) precision: number = -1;
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Boolean, reflect: true }) readonly: boolean = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String }) placeholder: string = '';
  @property({ type: String, reflect: true }) controls: 'sides' | 'right' | 'none' = 'sides';
  @property({ type: String }) label: string = '';

  private _pressTimer: ReturnType<typeof setTimeout> | null = null;
  private _repeatTimer: ReturnType<typeof setInterval> | null = null;
  private _repeatInterval: number = 300;
  private _repeatCount: number = 0;

  @query('.void-number-input-field') private _input!: HTMLInputElement;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'spinbutton');
    if (this.label) {
      this.setAttribute('aria-label', this.label);
    }
    if (isFinite(this.min)) {
      this.setAttribute('aria-valuemin', String(this.min));
    }
    if (isFinite(this.max)) {
      this.setAttribute('aria-valuemax', String(this.max));
    }
    this.setAttribute('aria-valuenow', String(this.value));
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('value')) {
      this.setAttribute('aria-valuenow', String(this.value));
    }
    if (changed.has('min') && isFinite(this.min)) {
      this.setAttribute('aria-valuemin', String(this.min));
    }
    if (changed.has('max') && isFinite(this.max)) {
      this.setAttribute('aria-valuemax', String(this.max));
    }
    if (changed.has('label')) {
      this.setAttribute('aria-label', this.label);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopRepeat();
  }

  private _clamp(v: number): number {
    return Math.min(Math.max(v, this.min), this.max);
  }

  private _format(v: number): string {
    return this.precision >= 0 ? v.toFixed(this.precision) : String(v);
  }

  private _commit(newVal: number): void {
    const clamped = this._clamp(newVal);
    if (clamped === this.value) return;
    const previous = this.value;
    this.value = clamped;
    if (this._input) {
      this._input.value = this._format(clamped);
    }
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: clamped, previous },
    }));
  }

  private _increment(): void {
    if (this.disabled || this.readonly) return;
    this._commit(this.value + this.step);
  }

  private _decrement(): void {
    if (this.disabled || this.readonly) return;
    this._commit(this.value - this.step);
  }

  private _startRepeat(fn: () => void): void {
    fn();
    this._pressTimer = setTimeout(() => {
      this._repeatInterval = 300;
      this._repeatCount = 0;
      this._repeatTimer = setInterval(() => {
        fn();
        this._repeatCount++;
        if (this._repeatCount % 5 === 0 && this._repeatInterval > 50) {
          const newInterval = Math.max(50, Math.floor(this._repeatInterval / 2));
          if (newInterval !== this._repeatInterval) {
            this._repeatInterval = newInterval;
            clearInterval(this._repeatTimer!);
            this._repeatTimer = setInterval(() => {
              fn();
              this._repeatCount++;
            }, this._repeatInterval);
          }
        }
      }, this._repeatInterval);
    }, 400);
  }

  private _stopRepeat(): void {
    if (this._pressTimer !== null) {
      clearTimeout(this._pressTimer);
      this._pressTimer = null;
    }
    if (this._repeatTimer !== null) {
      clearInterval(this._repeatTimer);
      this._repeatTimer = null;
    }
    this._repeatCount = 0;
  }

  private _onKeydown(e: KeyboardEvent): void {
    if (this.disabled || this.readonly) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._decrement();
    }
  }

  private _onBlur(): void {
    if (!this._input || this.readonly) return;
    const parsed = parseFloat(this._input.value);
    if (isNaN(parsed)) {
      this._input.value = this._format(this.value);
    } else {
      this._commit(parsed);
    }
  }

  private _onInputChange(): void {
    // Handled on blur
  }

  render() {
    const decrementBtn = html`
      <button
        class="void-number-input-btn void-number-input-btn-dec"
        type="button"
        ?disabled=${this.disabled || this.readonly || this.value <= this.min}
        aria-label="Decrement"
        @pointerdown=${(e: PointerEvent) => { e.preventDefault(); this._startRepeat(() => this._decrement()); }}
        @pointerup=${() => this._stopRepeat()}
        @pointerleave=${() => this._stopRepeat()}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em">
          <line x1="3" y1="8" x2="13" y2="8"/>
        </svg>
      </button>
    `;

    const incrementBtn = html`
      <button
        class="void-number-input-btn void-number-input-btn-inc"
        type="button"
        ?disabled=${this.disabled || this.readonly || this.value >= this.max}
        aria-label="Increment"
        @pointerdown=${(e: PointerEvent) => { e.preventDefault(); this._startRepeat(() => this._increment()); }}
        @pointerup=${() => this._stopRepeat()}
        @pointerleave=${() => this._stopRepeat()}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em">
          <line x1="8" y1="3" x2="8" y2="13"/>
          <line x1="3" y1="8" x2="13" y2="8"/>
        </svg>
      </button>
    `;

    return html`
      ${this.controls !== 'none' && this.controls !== 'right' ? decrementBtn : ''}
      <input
        class="void-number-input-field"
        type="text"
        inputmode="numeric"
        .value=${this._format(this.value)}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        aria-label=${this.label || 'Number input'}
        @keydown=${this._onKeydown}
        @blur=${this._onBlur}
        @change=${this._onInputChange}
      />
      ${this.controls === 'right'
        ? html`<div class="void-number-input-btn-group">${incrementBtn}${decrementBtn}</div>`
        : ''}
      ${this.controls === 'sides' ? incrementBtn : ''}
    `;
  }
}

if (!customElements.get('void-number-input')) {
  customElements.define('void-number-input', VoidNumberInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-number-input': VoidNumberInput;
  }
}
