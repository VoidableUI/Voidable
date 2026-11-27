import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';
import { useProjection } from '../projection.js';

useProjection();

/**
 * Continuous value selection for volume controls, price range filters, and numeric range settings.
 * The host has no role: the native range input is the slider (value, min and max included) and carries
 * the accessible name, which `<void-field>` supplies.
 */
export class VoidSlider extends NativeFormControl(VoidElement) {
  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = 'input';

  /**
   * Current position, between `min` and `max`. Defaults to 50. Reflected to the `value` attribute as it
   * moves; the form's reset target stays the value the slider started with.
   */
  @property({ type: Number, reflect: true }) value: number = 50;
  /** Lowest value. Defaults to 0. */
  @property({ type: Number }) min: number = 0;
  /** Highest value. Defaults to 100. */
  @property({ type: Number }) max: number = 100;
  /** Granularity: the value moves in multiples of `step` from `min`. Defaults to 1. */
  @property({ type: Number }) step: number = 1;
  /** Stop the slider reacting and exclude it from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  /**
   * Key the value is submitted under in the form's `FormData`. Without a name the slider submits
   * nothing.
   */
  @property({ type: String, reflect: true }) name: string = '';
  /** Show the current number beside the slider. */
  @property({ type: Boolean, attribute: 'show-value', reflect: true }) showValue: boolean = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private _fill(): number {
    return ((this.value - this.min) / (this.max - this.min)) * 100;
  }

  protected formWriteNativeDefault(state: unknown): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('input[type="range"]');
    if (control) control.defaultValue = String(state ?? '');
  }

  protected formReadNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('input[type="range"]');
    if (control) this.value = Number(control.value);
  }

  protected formSyncNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('input[type="range"]');
    if (control && control.value !== String(this.value)) control.value = String(this.value);
  }

  private _onInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.value = Number(input.value);
    this.dispatchEvent(new CustomEvent('void-input', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }

  private _onChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.value = Number(input.value);
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }

  render() {
    const fill = this._fill();
    // min, max and step come before .value: a range input clamps a value to the bounds it has at
    // that moment, so a value set first is clamped to the default 0-100 range (#140).
    return html`
      <input
        type="range"
        min=${this.min}
        max=${this.max}
        step=${this.step}
        ?disabled=${this.disabled}
        name=${this.name}
        form=${this.formAttr ?? nothing}
        .value=${String(this.value)}
        style="--void-slider-fill: ${fill}%"
        @input=${this._onInput}
        @change=${this._onChange}
      />
      ${this.showValue ? html`<span class="void-slider-value">${this.value}</span>` : ''}
    `;
  }
}

if (!customElements.get('void-slider')) {
  customElements.define('void-slider', VoidSlider);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-slider': VoidSlider;
  }
}
