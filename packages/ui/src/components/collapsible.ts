import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Simple expand/collapse panel for FAQ sections, spoiler text, and progressive disclosure of secondary content. */
export class VoidCollapsible extends VoidElement {
  @property({ type: String }) heading = '';
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _id = Math.random().toString(36).slice(2);
  // Consumer content is projected into the collapsible content region.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'content', target: () => this.querySelector(':scope > .void-collapsible-content > .void-collapsible-inner') }],
  });

  private _handleClick = (e: Event): void => {
    e.preventDefault();
    if (this.disabled) return;
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('void-toggle', {
      bubbles: true,
      composed: true,
      detail: { open: this.open },
    }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleClick(e);
    }
  };

  render() {
    return html`
      <button
        type="button"
        id="trigger-${this._id}"
        class="void-collapsible-trigger"
        aria-expanded=${String(this.open)}
        aria-controls="content-${this._id}"
        @click=${this._handleClick}
        @keydown=${this._handleKeydown}
      >
        ${this.heading}
        <svg class="void-collapsible-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div
        id="content-${this._id}"
        class="void-collapsible-content"
        role="region"
        aria-labelledby="trigger-${this._id}"
      ><div class="void-collapsible-inner"></div></div>
    `;
  }
}

if (!customElements.get('void-collapsible')) {
  customElements.define('void-collapsible', VoidCollapsible);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-collapsible': VoidCollapsible;
  }
}
