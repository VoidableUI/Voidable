import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Color selection control with spectrum area, hue slider, hex input, and preset swatches for theme customization and design tools. */
export class VoidColorPicker extends VoidElement {
  @property({ type: String, reflect: true }) value: string = '#000000'; // token-ok: default color value
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Array }) swatches: string[] = [];
  @property({ type: Boolean, reflect: true }) showInput: boolean = true;
  @property({ type: String, reflect: true }) variant: 'default' | 'compact' = 'default';
  @property({ type: Boolean, reflect: true }) open: boolean = false;

  private _hue: number = 0;
  private _saturation: number = 0;
  private _brightness: number = 0;
  private _dragging: 'area' | 'hue' | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this._syncFromHex(this.value);
    this._boundPointerMove = this._onPointerMove.bind(this);
    this._boundPointerUp = this._onPointerUp.bind(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('pointermove', this._boundPointerMove!);
    document.removeEventListener('pointerup', this._boundPointerUp!);
  }

  private _boundPointerMove: ((e: PointerEvent) => void) | null = null;
  private _boundPointerUp: ((e: PointerEvent) => void) | null = null;

  private _applyCustomProperties(): void {
    const hueColor = this._hsvToHex(this._hue, 100, 100);
    this.style.setProperty('--void-cp-hue', hueColor); // style-ok
    this.style.setProperty('--void-cp-current', this.value); // style-ok
    this.style.setProperty('--void-cp-area-x', `${this._saturation}%`); // style-ok
    this.style.setProperty('--void-cp-area-y', `${100 - this._brightness}%`); // style-ok
    this.style.setProperty('--void-cp-hue-x', `${(this._hue / 360) * 100}%`); // style-ok
  }

  // ── HSV ↔ Hex conversion ──

  private _hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const sn = s / 100;
    const vn = v / 100;
    const c = vn * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vn - c;
    let r = 0, g = 0, b = 0;

    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }

  private _hsvToHex(h: number, s: number, v: number): string {
    const [r, g, b] = this._hsvToRgb(h, s, v);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private _hexToRgb(hex: string): [number, number, number] | null {
    const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!match) return null;
    return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
  }

  private _rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      if (max === rn) h = ((gn - bn) / d) % 6;
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : Math.round((d / max) * 100);
    const v = Math.round(max * 100);
    return [h, s, v];
  }

  private _syncFromHex(hex: string): void {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return;
    const [h, s, v] = this._rgbToHsv(...rgb);
    this._hue = h;
    this._saturation = s;
    this._brightness = v;
  }

  static isValidHex(hex: string): boolean {
    return /^#[a-f\d]{6}$/i.test(hex);
  }

  private _updateValue(): void {
    const newValue = this._hsvToHex(this._hue, this._saturation, this._brightness);
    this.value = newValue;
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }

  // ── Pointer interaction ──

  private _onAreaPointerDown(e: PointerEvent): void {
    if (this.disabled) return;
    this._dragging = 'area';
    this._updateAreaFromPointer(e);
    document.addEventListener('pointermove', this._boundPointerMove!);
    document.addEventListener('pointerup', this._boundPointerUp!);
  }

  private _onHuePointerDown(e: PointerEvent): void {
    if (this.disabled) return;
    this._dragging = 'hue';
    this._updateHueFromPointer(e);
    document.addEventListener('pointermove', this._boundPointerMove!);
    document.addEventListener('pointerup', this._boundPointerUp!);
  }

  private _onPointerMove(e: PointerEvent): void {
    if (this._dragging === 'area') {
      this._updateAreaFromPointer(e);
    } else if (this._dragging === 'hue') {
      this._updateHueFromPointer(e);
    }
  }

  private _onPointerUp(): void {
    this._dragging = null;
    document.removeEventListener('pointermove', this._boundPointerMove!);
    document.removeEventListener('pointerup', this._boundPointerUp!);
  }

  private _updateAreaFromPointer(e: PointerEvent): void {
    const area = this.querySelector('.void-color-picker-area') as HTMLElement;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    this._saturation = Math.round(x * 100);
    this._brightness = Math.round((1 - y) * 100);
    this._updateValue();
  }

  private _updateHueFromPointer(e: PointerEvent): void {
    const hueEl = this.querySelector('.void-color-picker-hue') as HTMLElement;
    if (!hueEl) return;
    const rect = hueEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this._hue = Math.round(x * 360);
    this._updateValue();
  }

  // ── Input handling ──

  private _onHexInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    let hex = input.value.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (VoidColorPicker.isValidHex(hex)) {
      this._syncFromHex(hex);
      this.value = hex.toLowerCase();
      this.dispatchEvent(new CustomEvent('void-change', {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }));
    }
  }

  private _onSwatchClick(hex: string): void {
    if (this.disabled) return;
    this._syncFromHex(hex);
    this.value = hex.toLowerCase();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }

  private _onCompactTriggerClick(): void {
    if (this.disabled) return;
    this.open = !this.open;
  }

  private _onCompactHexInput(e: Event): void {
    this._onHexInput(e);
  }

  private _onDocumentClick = (e: MouseEvent): void => {
    if (!this.open) return;
    if (!this.contains(e.target as Node)) {
      this.open = false;
    }
  };

  protected override updated(changed: Map<string, unknown>): void {
    if (changed.has('value') && !this._dragging) {
      this._syncFromHex(this.value);
    }
    this._applyCustomProperties();

    if (changed.has('open')) {
      if (this.open) {
        document.addEventListener('click', this._onDocumentClick, true);
      } else {
        document.removeEventListener('click', this._onDocumentClick, true);
      }
    }
  }

  private _renderPicker() {
    return html`
      <div class="void-color-picker">
        <div
          class="void-color-picker-area"
          @pointerdown=${this._onAreaPointerDown}
        >
          <div class="void-color-picker-area-thumb"></div>
        </div>
        <div
          class="void-color-picker-hue"
          @pointerdown=${this._onHuePointerDown}
        >
          <div class="void-color-picker-hue-thumb"></div>
        </div>
        ${this.showInput ? html`
          <div class="void-color-picker-field">
            <span class="void-color-picker-field-swatch"></span>
            <span class="void-color-picker-field-separator"></span>
            <input
              class="void-color-picker-input"
              type="text"
              .value=${this.value}
              ?disabled=${this.disabled}
              maxlength="7"
              @change=${this._onHexInput}
            />
          </div>
        ` : html`
          <div class="void-color-picker-preview"></div>
        `}
        ${this.swatches.length > 0 ? html`
          <div class="void-color-picker-swatches">
            ${this.swatches.map(swatch => html`
              <button
                class="void-color-picker-swatch"
                style="--void-cp-swatch:${swatch}"
                aria-label=${swatch}
                ?disabled=${this.disabled}
                @click=${() => this._onSwatchClick(swatch)}
              ></button>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  render() {
    if (this.variant === 'compact') {
      return html`
        <div class="void-color-picker-compact">
          <button
            class="void-color-picker-compact-trigger"
            @click=${this._onCompactTriggerClick}
            ?disabled=${this.disabled}
            aria-expanded=${String(this.open)}
            aria-haspopup="dialog"
          >
            <span class="void-color-picker-compact-swatch"></span>
            <span class="void-color-picker-field-separator"></span>
            <input
              class="void-color-picker-compact-input"
              type="text"
              .value=${this.value}
              ?disabled=${this.disabled}
              maxlength="7"
              @click=${(e: Event) => e.stopPropagation()}
              @change=${this._onCompactHexInput}
            />
          </button>
          ${this.open ? html`
            <div class="void-color-picker-compact-dropdown" role="dialog" aria-label="Color picker">
              ${this._renderPicker()}
            </div>
          ` : nothing}
        </div>
      `;
    }
    return this._renderPicker();
  }
}

if (!customElements.get('void-color-picker')) {
  customElements.define('void-color-picker', VoidColorPicker);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-color-picker': VoidColorPicker;
  }
}
