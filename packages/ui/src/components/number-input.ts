import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property, query } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { isFocusParked } from '../projection.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';
import { localeOf, msg } from '../messages.js';
import { actionFor } from '../keyboard.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { numberInputKeys } from '../keymaps/fields.js';

/**
 * Precise numeric entry for quantity selectors, price fields, and settings with increment/decrement controls.
 * The host has no role: the native text input is the spinbutton (it carries the value, bounds and the accessible
 * name, which `<void-field>` supplies), and the stepper buttons are its own buttons.
 */
export class VoidNumberInput extends InternalsFormControl(VoidElement) {
  /** Key bindings for this element's actions, as JSON (`{"increment":["ArrowUp","k"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = numberInputKeys;

  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = 'input[role=spinbutton]';

  /** While focus is inside, a morph does not apply the server's value over what the user is typing. */
  static override editState = ['value'];
  /**
   * The number, or `null` while the field is empty (the default, and after the user clears it). Reflected to
   * the attribute as it changes (absent while empty); an absent or empty attribute is an empty field. It is kept within
   * `min` and `max` once the user commits an edit. An empty field submits an empty string, and with
   * `required` it is invalid (`valueMissing`), as a native number field.
   */
  @property({
    reflect: true,
    converter: {
      fromAttribute: (v: string | null): number | null => (v === null || v.trim() === '' ? null : Number(v)),
      toAttribute: (v: number | null) => (v === null || v === undefined ? null : String(v)),
    },
  }) value: number | null = null;
  /** Lowest allowed value. Unbounded by default. */
  @property({ type: Number }) min: number = Number.NEGATIVE_INFINITY;
  /** Highest allowed value. Unbounded by default. */
  @property({ type: Number }) max: number = Number.POSITIVE_INFINITY;
  /** Increment applied by the stepper buttons and arrow keys. `any` matches the native
      input: no step constraint on typed values, and the buttons step by 1. */
  @property({
    converter: {
      fromAttribute: (v: string | null): number | 'any' => (v === 'any' ? 'any' : v === null ? 1 : Number(v)),
      toAttribute: (v: number | 'any') => String(v),
    },
  }) step: number | 'any' = 1;
  /** Number of decimals to round to; `0` gives integers. Unset (the default) leaves the value as entered. */
  @property({ type: Number }) precision: number = -1;
  /** Stop the field and its stepper buttons reacting and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  /** Show the value but do not let the user change it; the field is still focusable and submitted. */
  @property({ type: Boolean, reflect: true }) readonly: boolean = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Status colour: `default`, `error`, `warning`, `caution`, `success`, `info`, `notice` or `highlight`. */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Hint text shown while the field is empty. */
  @property({ type: String }) placeholder: string = '';
  /**
   * Where the increment and decrement buttons go: `sides` (default, one each side), `right` (stacked at
   * the right) or `none` (arrow keys only).
   */
  @property({ type: String, reflect: true }) controls: 'sides' | 'right' | 'none' = 'sides';
  /**
   * Accessible name of the field when it is not inside a `void-field`. Defaults to the `numberInput.label` message (English: `Number input`), so
   * set it.
   */
  @property({ type: String }) label: string = '';
  /**
   * Text drawn before the number inside the field, such as a currency symbol `$`. Display only; it is
   * not part of the value.
   */
  @property({ type: String }) prefix: string = '';
  /**
   * Text drawn after the number inside the field, such as `kg`. Display only; it is not part of the
   * value.
   */
  @property({ type: String }) unit: string = '';

  private _pressTimer: ReturnType<typeof setTimeout> | null = null;
  private _repeatTimer: ReturnType<typeof setInterval> | null = null;
  private _repeatInterval: number = 300;
  private _repeatCount: number = 0;
  /** Text the user typed since the last commit; null when the field shows `value`. */
  private _pendingText: string | null = null;

  /** Typed text survives re-renders and morphs until committed, unless the server changes `value`. */
  static override clientState = { _pendingText: 'value' };

  @query('.void-number-input-field') private _input!: HTMLInputElement;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopRepeat();
  }

  protected formRestore(state: unknown): void {
    this._pendingText = null;
    this.value = state === null || state === undefined || state === '' ? null : Number(state);
  }

  /**
   * Submits the committed value, or the typed text if it parses (clamped):
   * a submit triggered while the field still has focus (requestSubmit from a
   * shortcut or autosave) must not drop what the user typed.
   */
  protected formSubmission(): FormSubmission {
    const text = this._pendingText;
    if (text !== null) {
      const parsed = this._parse(text);
      if (!isNaN(parsed)) return String(this._clamp(parsed));
      if (!text.trim()) return '';
    }
    return this.value === null ? '' : String(this.value);
  }

  private _clamp(v: number): number {
    return Math.min(Math.max(v, this.min), this.max);
  }

  /** The value as the reader's language writes it (decimal separator, digits), without grouping, with `precision` decimals when set. */
  private _format(v: number): string {
    const locale = localeOf(this);
    const digits = this.precision >= 0 ? { minimumFractionDigits: this.precision, maximumFractionDigits: this.precision } : { maximumFractionDigits: 20 };
    try {
      return new Intl.NumberFormat(locale, { useGrouping: false, ...digits }).format(v);
    } catch {
      return this.precision >= 0 ? v.toFixed(this.precision) : String(v);
    }
  }

  /**
   * Reads typed text the way the language writes numbers: its digits, decimal and grouping separators and minus
   * sign. `NaN` when it is not a number. A plain `1.5` still reads as 1.5 where the decimal separator is a comma.
   */
  private _parse(text: string): number {
    let nf: Intl.NumberFormat;
    try {
      nf = new Intl.NumberFormat(localeOf(this));
    } catch {
      return parseFloat(text);
    }
    const parts = nf.formatToParts(-12345.6);
    const symbol = (type: string, fallback: string) => parts.find(p => p.type === type)?.value ?? fallback;
    const group = symbol('group', ',');
    const decimal = symbol('decimal', '.');
    const digits = new Map<string, string>();
    for (let d = 0; d < 10; d++) digits.set(nf.format(d), String(d));
    let s = Array.from(text.trim()).map(ch => digits.get(ch) ?? ch).join('');
    s = s.split(group).join('').replace(/[\s  ]/g, '');
    s = decimal === '.' ? s : s.split(decimal).join('.');
    s = s.replace(/[−؜‎‏]/g, c => (c === '−' ? '-' : ''));
    return parseFloat(s);
  }

  /** Round to `precision` decimals (`precision="0"` gives integers); untouched when precision is unset. */
  private _round(v: number): number {
    return this.precision >= 0 ? Number(v.toFixed(this.precision)) : v;
  }

  private _commit(newVal: number | null): void {
    const clamped = newVal === null ? null : this._clamp(this._round(newVal));
    if (clamped === this.value) return;
    this._pendingText = null;
    const previous = this.value;
    this.value = clamped;
    if (this._input) {
      this._input.value = clamped === null ? '' : this._format(clamped);
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

  /**
   * Stepping from an empty field starts where a native number field does: up
   * to `min` (or one step above zero without a minimum), down to `max` (or one
   * step below zero).
   */
  private _increment(): void {
    if (this.formDisabled || this.readonly) return;
    const step = this._stepSize();
    this._commit((this.value ?? (Number.isFinite(this.min) ? this.min - step : 0)) + step);
  }

  private _decrement(): void {
    if (this.formDisabled || this.readonly) return;
    const step = this._stepSize();
    this._commit((this.value ?? (Number.isFinite(this.max) ? this.max + step : 0)) - step);
  }

  private _canStep(dir: 1 | -1): boolean {
    if (this.formDisabled || this.readonly) return false;
    if (this.value === null) return true;
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
    const action = actionFor(this, e);
    if (action === 'increment') {
      e.preventDefault();
      this._increment();
    } else if (action === 'decrement') {
      e.preventDefault();
      this._decrement();
    }
  }

  private _onBlur(): void {
    // A morph moving the focused field out and back (no Element.moveBefore)
    // blurs it and fires change: the user is still typing, commit nothing.
    if (!this._input || this.readonly || isFocusParked(this)) return;
    this._pendingText = null;
    const parsed = this._parse(this._input.value);
    if (!this._input.value.trim()) {
      // Cleared: the field is empty again.
      this._commit(null);
    } else if (isNaN(parsed)) {
      this._input.value = this.value === null ? '' : this._format(this.value);
    } else {
      this._commit(parsed);
    }
  }

  /** Keep the form value in step with the typed text. */
  private _onFieldInput(): void {
    this._pendingText = this._input?.value ?? null;
    this.formSync();
    // The typed number so far (null while the text is empty or not a number); the commit is void-change.
    const typed = this._parse(this._pendingText ?? '');
    const value: number | null = Number.isNaN(typed) ? null : typed;
    this.dispatchEvent(new CustomEvent('void-input', { bubbles: true, composed: true, detail: { value } }));
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
        ?disabled=${this.disabled || this.readonly || (this.value !== null && this.value <= this.min)}
        aria-label=${msg(this, 'numberInput.decrement')}
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
        ?disabled=${this.disabled || this.readonly || (this.value !== null && this.value >= this.max)}
        aria-label=${msg(this, 'numberInput.increment')}
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
        .value=${live(this._pendingText ?? (this.value === null ? '' : this._format(this.value)))}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        role="spinbutton"
        aria-valuenow=${this.value ?? nothing}
        aria-valuetext=${this.value === null ? nothing : this._format(this.value)}
        aria-required=${this.required ? 'true' : nothing}
        aria-valuemin=${isFinite(this.min) ? this.min : nothing}
        aria-valuemax=${isFinite(this.max) ? this.max : nothing}
        aria-label=${this.label || msg(this, 'numberInput.label')}
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
