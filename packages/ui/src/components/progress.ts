import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { useProjection } from '../projection.js';

useProjection();

/** Visual progress indicator for file uploads, multi-step processes, and loading states. */
export class VoidProgress extends VoidElement {
  /** Current progress, from 0 to `max`. Ignored while `indeterminate`. */
  @property({ type: Number, reflect: true }) value: number = 0;
  /** Value that means complete. Defaults to 100. */
  @property({ type: Number, reflect: true }) max: number = 100;
  /** Status colour of the bar: `default`, `error`, `warning`, `caution`, `success`, `info`, `notice` or `highlight`. */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Thickness step of the bar: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Show an animated bar for work of unknown length. It has no `aria-valuenow` while on. */
  @property({ type: Boolean, reflect: true }) indeterminate: boolean = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'progressbar');
    this.setHostAttribute('aria-valuemin', '0');
    this.setHostAttribute('aria-valuemax', String(this.max));
    if (!this.indeterminate) {
      this.setHostAttribute('aria-valuenow', String(this.value));
    }
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('max')) {
      this.setHostAttribute('aria-valuemax', String(this.max));
    }
    if (changed.has('value') || changed.has('indeterminate')) {
      if (this.indeterminate) {
        this.setHostAttribute('aria-valuenow', null);
      } else {
        this.setHostAttribute('aria-valuenow', String(this.value));
      }
    }
  }

  render() {
    const clampedPercent = Math.min(100, Math.max(0, (this.value / this.max) * 100));
    return html`<div class="void-progress-track"><div class="void-progress-fill" style="--void-progress-fill: ${this.indeterminate ? '0%' : clampedPercent + '%'}"></div></div>`;
  }
}

if (!customElements.get('void-progress')) {
  customElements.define('void-progress', VoidProgress);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-progress': VoidProgress;
  }
}
