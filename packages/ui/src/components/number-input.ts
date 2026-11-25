import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property, query } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';

/**
 * Precise numeric entry for quantity selectors, price fields, and settings with increment/decrement controls.
 * The host has no role: the native text input is the spinbutton (it carries the value, bounds and the accessible
 * name, which `<void-field>` supplies), and the stepper buttons are its own buttons.
 */
export class VoidNumberInput extends InternalsFormControl(VoidElement) {
  @property({ type: Number, reflect: true }) value: number = 0;
  @property({ type: Number }) min: number = Number.NEGATIVE_INFINITY;
  @property({ type: Number }) max: number = Number.POSITIVE_INFINITY;
  /** Increment applied by the stepper buttons and arrow keys. `any` matches the native
      input: no step constraint on typed values, and the buttons step by 1. */
  @property({
    converter: {
      fromAttribute: (v: string | null): number | 'any' => (v === 'any' ? 'any' : v === null ? 1 : Number(v)),
      toAttribute: (v: number | 'any') => String(v),
    },
  }) step: number | 'any' = 1;
  @property({ type: Number }) precision: number = -1;
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Boolean, reflect: true }) readonly: boolean = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String }) placeholder: string = '';
  @property({ type: String, reflect: true }) controls: 'sides' | 'right' | 'none' = 'sides';
  @property({ type: String }) label: string = '';
  @property({ type: String }) prefix: string = '';
  @property({ type: String }) unit: string = '';

  private _pressTimer: ReturnType<typeof setTimeout> | null = null;
  private _repeatTimer: ReturnType<typeof setInterval> | null = null;
  private _repeatInterval: number = 300;
  private _repeatCount: number = 0;
  /** Text the user typed since the last commit; null when the field shows `value`. */
  private _pendingText: string | null = null;

  @query('.void-number-input-field') private _input!: HTMLInputElement;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopRepeat();
  }

  protected formRestore(state: unknown): void {
    this._pendingText = null;
    this.value = Number(state);
  }

  /**
   * Submits the committed value, or the typed text if it parses (clamped):
   * a submit triggered while the field still has focus (requestSubmit from a
   * shortcut or autosave) must not drop what the user typed.
   */
  protected formSubmission(): FormSubmission {
    const text = this._pendingText;
    if (text !== null) {
      const parsed = parseFloat(text);
      if (!isNaN(parsed)) return String(this._clamp(parsed));
    }
    return String(this.value);
  }

  private _clamp(v: number): number {
    return Math.min(Math.max(v, this.min), this.max);
  }

  private _format(v: number): string {
    return this.precision >= 0 ? v.toFixed(this.precision) : String(v);
  }

  /** Round to `precision` decimals (`precision="0"` gives integers); untouched when precision is unset. */
  private _round(v: number): number {
    return this.precision >= 0 ? Number(v.toFixed(this.precision)) : v;
  }

  private _commit(newVal: number): void {
    const clamped = this._clamp(this._round(newVal));
    if (clamped === this.value) return;
    this._pendingText = null;
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

  /** Numeric step for the stepper buttons; `step="any"` steps by 1. */
  private _stepSize(): number {
    return typeof this.step === 'number' && Number.isFinite(this.step) && this.step > 0 ? this.step : 1;
  }

  private _increment(): void {
    if (this.formDisabled || this.readonly) return;
    this._commit(this.value + this._stepSize());
  }

  private _decrement(): void {
    if (this.formDisabled || this.readonly) return;
    this._commit(this.value - this._stepSize());
  }

  private _canStep(dir: 1 | -1): boolean {
    if (this.formDisabled || this.readonly) return false;
    return dir > 0 ? this.value < this.max : this.value > this.min;
  }

  private _startRepeat(dir: 1 | -1): void {
    this._stopRepeat();
    if (!this._canStep(dir)) return;
    const step = () => {
      // Stop as soon as the button would be disabled (min/max reached, disabled, readonly).
      if (!this._canStep(dir)) {
        this._stopRepeat();
        return false;
      }
      if (dir > 0) this._increment(); else this._decrement();
      if (!this._canStep(dir)) this._stopRepeat();
      return true;
    };
    step();
    if (!this._canStep(dir)) return;
    this._pressTimer = setTimeout(() => {
      this._pressTimer = null;
      this._repeatInterval = 300;
      this._repeatCount = 0;
      const schedule = () => {
        this._repeatTimer = setInterval(() => {
          if (!step()) return;
          this._repeatCount++;
          if (this._repeatCount % 5 === 0 && this._repeatInterval > 50 && this._repeatTimer !== null) {
            const newInterval = Math.max(50, Math.floor(this._repeatInterval / 2));
            if (newInterval !== this._repeatInterval) {
              this._repeatInterval = newInterval;
              clearInterval(this._repeatTimer);
              schedule();
            }
          }
        }, this._repeatInterval);
      };
      schedule();
    }, 400);
  }

  /** Keyboard / assistive-tech activation: a native button click with detail 0 (pointer clicks are handled by pointerdown). */
  private _onStepperClick(e: MouseEvent, dir: 1 | -1): void {
    if (e.detail !== 0) return;
    if (dir > 0) this._increment(); else this._decrement();
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
    if (this.formDisabled || this.readonly) return;
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
    this._pendingText = null;
    const parsed = parseFloat(this._input.value);
    if (isNaN(parsed)) {
      this._input.value = this._format(this.value);
    } else {
      this._commit(parsed);
    }
  }

  /** Keep the form value in step with the typed text. */
  private _onFieldInput(): void {
    this._pendingText = this._input?.value ?? null;
    this.formSync();
  }

  /** Commit on change: browsers fire it before Enter's implicit submission. */
  private _onInputChange(): void {
    this._onBlur();
  }

  render() {
    const decrementBtn = html`
      <button
        class="void-number-input-btn void-number-input-btn-dec"
        type="button"
        ?disabled=${this.disabled || this.readonly || this.value <= this.min}
        aria-label="Decrement"
        @pointerdown=${(e: PointerEvent) => { e.preventDefault(); this._startRepeat(-1); }}
        @pointerup=${() => this._stopRepeat()}
        @pointercancel=${() => this._stopRepeat()}
        @pointerleave=${() => this._stopRepeat()}
        @click=${(e: MouseEvent) => this._onStepperClick(e, -1)}
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
        @pointerdown=${(e: PointerEvent) => { e.preventDefault(); this._startRepeat(1); }}
        @pointerup=${() => this._stopRepeat()}
        @pointercancel=${() => this._stopRepeat()}
        @pointerleave=${() => this._stopRepeat()}
        @click=${(e: MouseEvent) => this._onStepperClick(e, 1)}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em">
          <line x1="8" y1="3" x2="8" y2="13"/>
          <line x1="3" y1="8" x2="13" y2="8"/>
        </svg>
      </button>
    `;

    return html`
      ${this.controls !== 'none' && this.controls !== 'right' ? decrementBtn : ''}
      ${this.prefix ? html`<span class="void-number-input-prefix">${this.prefix}</span>` : nothing}
      <input
        class="void-number-input-field"
        type="text"
        inputmode=${this.precision === 0 ? 'numeric' : 'decimal'}
        .value=${live(this._format(this.value))}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        role="spinbutton"
        aria-valuenow=${this.value}
        aria-valuemin=${isFinite(this.min) ? this.min : nothing}
        aria-valuemax=${isFinite(this.max) ? this.max : nothing}
        aria-label=${this.label || 'Number input'}
        @keydown=${this._onKeydown}
        @blur=${this._onBlur}
        @input=${this._onFieldInput}
        @change=${this._onInputChange}
      />
      ${this.unit ? html`<span class="void-number-input-unit">${this.unit}</span>` : nothing}
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
