import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidCard extends VoidElement {
  @property({ type: String }) heading = '';
  @property({ type: String, reflect: true }) variant: 'default' | 'elevated' | 'outlined' = 'default';
  @property({ type: String, reflect: true }) padding: 'none' | 'sm' | 'md' | 'lg' = 'md';

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
      const body = this.querySelector('.void-card-body')!;
      for (const node of this._userContent) {
        body.appendChild(node);
      }
    }
  }

  render() {
    return html`${this.heading
      ? html`<div class="void-card-header"><span class="void-card-heading">${this.heading}</span></div>`
      : nothing}<div class="void-card-body"></div>`;
  }
}

if (!customElements.get('void-card')) {
  customElements.define('void-card', VoidCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-card': VoidCard;
  }
}
