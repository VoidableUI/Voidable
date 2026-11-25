import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../../src/base.js';
import { ProjectionController } from '../../src/projection.js';

/**
 * Test fixture: the chrome-plus-one-projected-region shape of the collapsible before it moved to explicit parts
 * (#52), kept so the projection tests have a host that renders a trigger and projects consumer nodes into a body.
 */
export class VoidProjectionFixture extends VoidElement {
  /** Text of the button that opens and closes the panel. */
  @property({ type: String }) heading = '';
  /** Whether the content is shown. Add the attribute to start open; it follows the user's toggling. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Stop the panel from toggling. The heading button ignores clicks and Enter or Space. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _id = Math.random().toString(36).slice(2);
  // Consumer content is projected into the collapsible content region.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'content', target: () => this.querySelector(':scope > .void-projection-fixture-content > .void-projection-fixture-inner') }],
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
        class="void-projection-fixture-trigger"
        aria-expanded=${String(this.open)}
        aria-controls="content-${this._id}"
        @click=${this._handleClick}
        @keydown=${this._handleKeydown}
      >
        ${this.heading}
        <svg class="fixture-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div
        id="content-${this._id}"
        class="void-projection-fixture-content"
        role="region"
        aria-labelledby="trigger-${this._id}"
      ><div class="void-projection-fixture-inner"></div></div>
    `;
  }
}

if (!customElements.get('void-projection-fixture')) {
  customElements.define('void-projection-fixture', VoidProjectionFixture);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-projection-fixture': VoidProjectionFixture;
  }
}
