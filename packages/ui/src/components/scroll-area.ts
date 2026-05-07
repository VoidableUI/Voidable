import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidScrollArea extends VoidElement {
  @property({ type: String }) maxHeight = '';
  @property({ type: String, reflect: true }) direction: 'vertical' | 'horizontal' | 'both' = 'vertical';

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
      const viewport = this.querySelector('.void-scroll-area-viewport')!;
      for (const node of this._userContent) {
        viewport.appendChild(node);
      }
    }
    this.style.setProperty('--void-scroll-area-max-height', this.maxHeight || '');
  }

  render() {
    return html`<div class="void-scroll-area-viewport"></div>`;
  }
}

if (!customElements.get('void-scroll-area')) {
  customElements.define('void-scroll-area', VoidScrollArea);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-scroll-area': VoidScrollArea;
  }
}
