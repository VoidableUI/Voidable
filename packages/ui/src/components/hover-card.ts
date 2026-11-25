import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController, triggerRegion } from '../projection.js';

/**
 * Rich content preview card that appears on hover for user profiles, link previews, and contextual information panels.
 *
 * @slot trigger - The element that shows the card on hover or focus. Mark it with `slot="trigger"`; without one, the first child element is used.
 * @slot - Card content.
 */
export class VoidHoverCard extends VoidElement {
  /**
   * Whether the card is showing. It opens after `open-delay` when the pointer or focus reaches the
   * trigger and closes after `close-delay`, or on Escape; set it to drive it from script.
   */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Which side of the trigger the card appears on: `bottom` (default), `top`, `left` or `right`. */
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  /** Milliseconds the pointer rests on the trigger before the card opens. Defaults to 300. */
  @property({ type: Number, attribute: 'open-delay' }) openDelay = 300;
  /** Milliseconds after the pointer leaves before the card closes. Defaults to 300. */
  @property({ type: Number, attribute: 'close-delay' }) closeDelay = 300;

  // The trigger (slot="trigger", else the first element child) goes into the trigger wrapper; everything else goes into the body.
  protected readonly _projection: ProjectionController = new ProjectionController(this, {
    regions: [
      triggerRegion('trigger', () => this.querySelector(':scope > .void-hover-card-trigger'), () => this._projection, this),
      { name: 'body', target: () => this.querySelector(':scope > .void-hover-card-body') },
    ],
  });
  private _openTimerId: ReturnType<typeof setTimeout> | undefined;
  private _closeTimerId: ReturnType<typeof setTimeout> | undefined;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._openTimerId);
    clearTimeout(this._closeTimerId);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  // The body carried role="dialog" without a name before it moved into this template; naming it is
  // ARIA work tracked separately (#7), so the rule is suspended here rather than changing semantics.
  /* eslint-disable lit-a11y/accessible-name */
  render() {
    return html`
      <div
        class="void-hover-card-trigger"
        aria-haspopup="dialog"
        aria-expanded=${String(this.open)}
        @mouseenter=${this._onTriggerEnter}
        @mouseleave=${this._onTriggerLeave}
        @focusin=${this._onFocusIn}
        @focusout=${this._onFocusOut}
      ></div>
      <div class="void-hover-card-body" role="dialog" @mouseenter=${this._onBodyEnter} @mouseleave=${this._onBodyLeave}></div>
    `;
  }
  /* eslint-enable lit-a11y/accessible-name */

  private _onTriggerEnter = (): void => {
    clearTimeout(this._closeTimerId);
    this._openTimerId = setTimeout(() => {
      this._openCard();
    }, this.openDelay);
  };

  private _onTriggerLeave = (): void => {
    clearTimeout(this._openTimerId);
    this._closeTimerId = setTimeout(() => {
      this._closeCard();
    }, this.closeDelay);
  };

  private _onBodyEnter = (): void => {
    clearTimeout(this._closeTimerId);
  };

  private _onBodyLeave = (): void => {
    this._closeTimerId = setTimeout(() => {
      this._closeCard();
    }, this.closeDelay);
  };

  private _onFocusIn = (): void => {
    clearTimeout(this._closeTimerId);
    this._openCard();
  };

  private _onFocusOut = (): void => {
    this._closeTimerId = setTimeout(() => {
      this._closeCard();
    }, this.closeDelay);
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) {
      this._closeCard();
    }
  };

  private _openCard(): void {
    if (!this.open) {
      this.open = true;
      this.dispatchEvent(new CustomEvent('void-open', { bubbles: true, composed: true }));
    }
  }

  private _closeCard(): void {
    if (this.open) {
      this.open = false;
      this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
    }
  }
}

if (!customElements.get('void-hover-card')) {
  customElements.define('void-hover-card', VoidHoverCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-hover-card': VoidHoverCard;
  }
}
