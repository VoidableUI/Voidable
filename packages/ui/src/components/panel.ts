import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidPanel extends VoidElement {
  @property({ type: String, reflect: true }) label = '';
  @property({ type: String, reflect: true }) variant: 'default' | 'bordered' | 'elevated' = 'default';

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    if (this.label) {
      this.setAttribute('aria-label', this.label);
    }
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label')) {
      if (this.label) {
        this.setAttribute('aria-label', this.label);
      } else {
        this.removeAttribute('aria-label');
      }
    }
    if (!this._didSetup) {
      this._didSetup = true;
      for (const node of this._userContent) {
        this.appendChild(node);
      }
    }
  }

  render() {
    return this.label
      ? html`<div class="void-panel-label">${this.label}</div>`
      : nothing;
  }
}

if (!customElements.get('void-panel')) {
  customElements.define('void-panel', VoidPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-panel': VoidPanel;
  }
}
