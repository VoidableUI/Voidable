import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Native dropdown for small option sets in forms where a simple pick-one is sufficient. */
export class VoidSelect extends VoidElement {
  @property({ type: String }) value = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: String, reflect: true }) name = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) placeholder = '';

  // Consumer <option>/<optgroup> children are projected into the native <select>.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'options', target: () => this.querySelector(':scope > select') }],
    onChange: () => this._syncOptions(),
  });
  private _didSyncOptions = false;

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSyncOptions) {
      this._didSyncOptions = true;
      this._syncOptions();
    }
  }

  /**
   * Single sync point between the projected options and the native select. Runs
   * after the first render, whenever options are added, removed or reordered, and
   * after the projection recovers from a morph or clone (a fresh native select).
   */
  private _syncOptions(): void {
    const select = this.querySelector<HTMLSelectElement>(':scope > select');
    if (select && this.value) {
      select.value = this.value;
    }
  }

  render() {
    return html`
      <select
        ?disabled=${this.disabled}
        ?required=${this.required}
        name=${this.name}
        aria-invalid=${this.error ? 'true' : 'false'}
        @change=${this._onChange}
      ></select>
      ${this.error ? html`<span class="void-select-error">${this.error}</span>` : ''}
    `;
  }

  private _onChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.value = select.value;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
}

if (!customElements.get('void-select')) {
  customElements.define('void-select', VoidSelect);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-select': VoidSelect;
  }
}
