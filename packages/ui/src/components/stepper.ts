import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidStepper extends VoidElement {
  @property({ type: Number, reflect: true }) value: number = 0;
  @property({ reflect: true }) steps: string = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Progress');
  }

  render() {
    const labels = this.steps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return html`${labels.map((label, i) => {
      const state =
        i < this.value ? 'completed' : i === this.value ? 'active' : 'upcoming';

      return html`${i > 0
          ? html`<div class="void-stepper-connector" data-state=${i <= this.value ? 'completed' : 'upcoming'}></div>`
          : null}<div
          class="void-stepper-step"
          data-state=${state}
          aria-current=${i === this.value ? 'step' : nothing}
        >
          <span class="void-stepper-circle"
            >${state === 'completed'
              ? html`<svg
                  viewBox="0 0 12 12"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="2,6 5,9 10,3"></polyline>
                </svg>`
              : i + 1}</span
          >
          <span class="void-stepper-label">${label}</span>
        </div>`;
    })}`;
  }
}

if (!customElements.get('void-stepper')) {
  customElements.define('void-stepper', VoidStepper);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-stepper': VoidStepper;
  }
}
