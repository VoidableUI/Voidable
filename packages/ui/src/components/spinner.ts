import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidSpinner extends VoidElement {
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String, reflect: true }) label: string = 'Loading';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', this.label);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('label')) {
      this.setAttribute('aria-label', this.label);
    }
  }

  render() {
    return html`<span data-void-sr>${this.label}</span>`;
  }
}

if (!customElements.get('void-spinner')) {
  customElements.define('void-spinner', VoidSpinner);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-spinner': VoidSpinner;
  }
}
