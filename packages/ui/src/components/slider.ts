import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';

/** Continuous value selection for volume controls, price range filters, and numeric range settings. */
export class VoidSlider extends NativeFormControl(VoidElement) {
  @property({ type: Number }) value: number = 50;
  @property({ type: Number }) min: number = 0;
  @property({ type: Number }) max: number = 100;
  @property({ type: Number }) step: number = 1;
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: String, reflect: true }) name: string = '';
  @property({ type: Boolean, attribute: 'show-value', reflect: true }) showValue: boolean = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'slider');
    this.setHostAttribute('aria-valuemin', String(this.min));
    this.setHostAttribute('aria-valuemax', String(this.max));
    this.setHostAttribute('aria-valuenow', String(this.value));
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('min')) {
      this.setHostAttribute('aria-valuemin', String(this.min));
    }
    if (changed.has('max')) {
      this.setHostAttribute('aria-valuemax', String(this.max));
    }
    if (changed.has('value') || changed.has('min') || changed.has('max')) {
      this.setHostAttribute('aria-valuenow', String(this.value));
    }
  }

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
    return html`
      <input
        type="range"
        .value=${String(this.value)}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        ?disabled=${this.disabled}
        name=${this.name}
        form=${this.formAttr ?? nothing}
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
