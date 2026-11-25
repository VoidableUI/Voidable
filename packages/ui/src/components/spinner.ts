import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Indeterminate loading indicator for async operations, button loading states, and inline fetching. */
export class VoidSpinner extends VoidElement {
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Text announced to screen readers while loading, and the spinner's accessible name. Defaults to
   * `Loading`; say what is loading (`Loading orders`).
   */
  @property({ type: String, reflect: true }) label: string = 'Loading';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'status');
    this.setHostAttribute('aria-label', this.label);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('label')) {
      this.setHostAttribute('aria-label', this.label);
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
