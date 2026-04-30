import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidField extends VoidElement {
  @property({ type: String, reflect: true }) label = '';
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) helper = '';
  @property({ type: Boolean, reflect: true }) required = false;

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSetup) {
      this._didSetup = true;
      const control = this.querySelector('.void-field-control');
      if (control) {
        for (const node of this._userContent) {
          control.appendChild(node);
        }
      }
    }
  }

  render() {
    return html`
      ${this.label ? html`<label class="void-field-label">${this.label}${this.required ? html`<span class="void-field-required" aria-hidden="true"> *</span>` : ''}</label>` : nothing}
      <div class="void-field-control"></div>
      ${this.error ? html`<span class="void-field-error">${this.error}</span>` : this.helper ? html`<span class="void-field-helper">${this.helper}</span>` : nothing}
    `;
  }
}

if (!customElements.get('void-field')) {
  customElements.define('void-field', VoidField);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-field': VoidField;
  }
}
