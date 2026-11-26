import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { msg, nameHost } from '../messages.js';
import { useProjection } from '../projection.js';

useProjection();

/** Indeterminate loading indicator for async operations, button loading states, and inline fetching. */
export class VoidSpinner extends VoidElement {
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Text announced to screen readers while loading, and the spinner's accessible name. Defaults to the `spinner.label` message (English:
   * `Loading`); say what is loading (`Loading orders`).
   */
  @property({ type: String, reflect: true }) label: string = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'status');
    this._name();
  }

  private _text(): string {
    return this.label || msg(this, 'spinner.label');
  }

  private _name(): void {
    nameHost(this, this._text(), (n, v) => this.setHostAttribute(n, v));
  }

  updated(): void {
    this._name();
  }

  render() {
    return html`<span data-void-sr>${this._text()}</span>`;
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
