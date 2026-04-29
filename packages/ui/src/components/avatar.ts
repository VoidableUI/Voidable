import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidAvatar extends VoidElement {
  @property({ type: String, reflect: true }) src: string = '';
  @property({ type: String, reflect: true }) alt: string = '';
  @property({ type: String, reflect: true }) initials: string = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', this.alt || this.initials);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('alt') || changed.has('initials')) {
      this.setAttribute('aria-label', this.alt || this.initials);
    }
  }

  render() {
    if (this.src) {
      return html`<img src="${this.src}" alt="${this.alt}" @error="${this._onImgError}" />`;
    }
    if (this.initials) {
      return html`<span class="void-avatar-initials">${this.initials}</span>`;
    }
    return html``;
  }

  private _onImgError = (): void => {
    this.src = '';
  };
}

if (!customElements.get('void-avatar')) {
  customElements.define('void-avatar', VoidAvatar);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-avatar': VoidAvatar;
  }
}
