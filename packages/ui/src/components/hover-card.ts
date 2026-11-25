import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { OverlayController } from '../overlay.js';
import { ProjectionController, triggerRegion } from '../projection.js';

/**
 * Rich content preview card that appears on hover for user profiles, link previews, and contextual information panels.
 *
 * Opens after `open-delay` when the pointer rests on the trigger, or at once when the trigger receives keyboard focus,
 * and closes after `close-delay` once pointer and focus have left both trigger and card, or on Escape. The card is
 * supplementary: put nothing in it that is not also reachable without it. It is shown in the top layer and placed
 * with CSS anchor positioning; while closed it is not rendered, so links inside it are neither visible nor tabbable.
 *
 * @slot trigger - The element that shows the card on hover or focus. Mark it with `slot="trigger"`; without one, the first child element is used.
 * @slot - Card content.
 * @fires {CustomEvent<{ reason: 'hover' | 'focus' | 'api' }>} void-open - The card opened.
 * @fires {CustomEvent<{ reason: 'hover' | 'blur' | 'escape' | 'parent' | 'api' }>} void-close - The card is closing.
 * Cancelable when the user caused it.
 */
export class VoidHoverCard extends VoidElement {
  /** Whether the card is shown. It opens and closes itself from hover, focus and Escape; set it to drive it from script. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Side of the trigger the card opens on; it flips to the opposite side when there is no room. */
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  /** Alignment with the trigger along that side. */
  @property({ type: String, reflect: true }) align: 'start' | 'center' | 'end' = 'center';
  /** Milliseconds the pointer rests on the trigger before the card opens (keyboard focus opens it at once). Defaults to 300. */
  @property({ type: Number, attribute: 'open-delay' }) openDelay = 300;
  /** Milliseconds after pointer and focus have left the trigger and card before it closes. Defaults to 300. */
  @property({ type: Number, attribute: 'close-delay' }) closeDelay = 300;

  // The trigger (slot="trigger", else the first element child) goes into the trigger wrapper; everything else goes into the body.
  protected readonly _projection: ProjectionController = new ProjectionController(this, {
    regions: [
      triggerRegion('trigger', () => this.querySelector(':scope > .void-hover-card-trigger'), () => this._projection, this),
      { name: 'body', target: () => this.querySelector(':scope > .void-hover-card-body') },
    ],
    // Trigger ARIA follows the trigger, including one the parser adds after the first render.
    onChange: () => this.requestUpdate(),
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'hover',
    surface: () => this.querySelector<HTMLElement>(':scope > .void-hover-card-body'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => (this._projection.nodes('trigger').find(n => n instanceof HTMLElement) as HTMLElement | undefined) ?? null,
    anchor: () => this.querySelector(':scope > .void-hover-card-trigger'),
    placement: () => ({ side: this.position, align: this.align }),
  });

  private _openTimerId: ReturnType<typeof setTimeout> | undefined;
  private _closeTimerId: ReturnType<typeof setTimeout> | undefined;
  /**
   * Closed with Escape while focus was inside: the focus that returns to the
   * trigger must not reopen it. Only that one focus; keyboard focus that
   * arrives later (the card was closed from hover) opens it as usual.
   */
  private _dismissed = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('void-close', this._onClose);
  }

  disconnectedCallback(): void {
    this.removeEventListener('void-close', this._onClose);
    super.disconnectedCallback();
    clearTimeout(this._openTimerId);
    clearTimeout(this._closeTimerId);
  }

  render() {
    return html`
      <div
        class="void-hover-card-trigger"
        @mouseenter=${this._onEnter}
        @mouseleave=${this._onLeave}
        @focusin=${this._onFocusIn}
        @focusout=${this._onFocusOut}
      ></div>
      <div
        class="void-hover-card-body"
        popover="manual"
        @mouseenter=${this._onBodyEnter}
        @mouseleave=${this._onLeave}
        @focusin=${this._onBodyEnter}
        @focusout=${this._onFocusOut}
      ></div>
    `;
  }

  private _onClose = (e: Event): void => {
    if (e.target !== this || (e as CustomEvent<{ reason: string }>).detail?.reason !== 'escape') return;
    const active = this.ownerDocument.activeElement;
    this._dismissed = !!active && active !== this.ownerDocument.body && this.contains(active);
  };

  private _onEnter = (): void => {
    this._dismissed = false;
    clearTimeout(this._closeTimerId);
    clearTimeout(this._openTimerId);
    this._openTimerId = setTimeout(() => this._overlay.requestOpen('hover'), this.openDelay);
  };

  private _onLeave = (): void => {
    clearTimeout(this._openTimerId);
    this._scheduleClose('hover');
  };

  private _onBodyEnter = (): void => {
    clearTimeout(this._closeTimerId);
  };

  private _onFocusIn = (): void => {
    clearTimeout(this._closeTimerId);
    clearTimeout(this._openTimerId);
    if (this._dismissed) {
      this._dismissed = false;
      return;
    }
    this._overlay.requestOpen('focus');
  };

  private _onFocusOut = (e: FocusEvent): void => {
    const next = e.relatedTarget as Node | null;
    if (next && this.contains(next)) return;
    this._dismissed = false;
    this._scheduleClose('blur');
  };

  private _scheduleClose(reason: 'hover' | 'blur'): void {
    clearTimeout(this._closeTimerId);
    this._closeTimerId = setTimeout(() => {
      // Stay open while focus is still inside (the pointer left, the keyboard did not).
      const active = this.ownerDocument.activeElement;
      if (reason === 'hover' && active && active !== this.ownerDocument.body && this.contains(active)) return;
      this._overlay.requestClose(reason);
    }, this.closeDelay);
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
