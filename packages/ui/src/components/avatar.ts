import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { useProjection } from '../projection.js';

useProjection();

/** User identity display for comment threads, user lists, and profile cards; falls back to initials when no image is provided. */
export class VoidAvatar extends VoidElement {
  /** URL of the image. When it is empty, or the image fails to load, the avatar shows `initials` instead. */
  @property({ type: String, reflect: true }) src: string = '';
  /**
   * Accessible name of the avatar, normally the person's name. Without it the name falls back to
   * `initials`.
   */
  @property({ type: String, reflect: true }) alt: string = '';
  /** One to three letters shown when there is no image. Used as the accessible name when `alt` is empty. */
  @property({ type: String, reflect: true }) initials: string = '';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'img');
    this.setHostAttribute('aria-label', this.alt || this.initials);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('alt') || changed.has('initials')) {
      this.setHostAttribute('aria-label', this.alt || this.initials);
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
