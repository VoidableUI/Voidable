import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { OverlayController } from '../overlay.js';
import { PartsController, triggerControl } from '../parts.js';

/**
 * Rich content preview card that appears on hover for user profiles, link previews, and contextual information panels.
 *
 * Two parts: `<void-hover-card-trigger>` around the element that shows the card (one element: a link, a
 * `<void-button>`), and `<void-hover-card-content>`, the card. The parts are the final DOM. The card opens after
 * `open-delay` when the pointer rests on the trigger, or at once when the trigger receives keyboard focus, and
 * closes after `close-delay` once pointer and focus have left both trigger and card, or on Escape. The card is
 * supplementary: put nothing in it that is not also reachable without it. It is shown in the top layer and placed
 * with CSS anchor positioning; while closed it is not rendered, so links inside it are neither visible nor tabbable.
 *
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

  protected readonly _parts = new PartsController(this, {
    tags: ['void-hover-card-trigger', 'void-hover-card-content'],
    onChange: () => {
      this._wire();
      this.requestUpdate();
    },
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'hover',
    surface: () => this._parts.one('void-hover-card-content'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => triggerControl(this._parts.one('void-hover-card-trigger')),
    anchor: () => this,
    hostStyle: (p, v) => this.setHostStyle(p, v),
    placement: () => ({ side: this.position, align: this.align }),
    attr: (el, name, value) => this._parts.set(el, name, value),
    style: (el, p, v) => this._parts.style(el, p, v),
  });

  private _openTimerId: ReturnType<typeof setTimeout> | undefined;
  private _closeTimerId: ReturnType<typeof setTimeout> | undefined;
  /**
   * Closed with Escape while focus was inside: the focus that returns to the
   * trigger must not reopen it. Only that one focus; keyboard focus that
   * arrives later (the card was closed from hover) opens it as usual.
   */
  private _dismissed = false;

  private _wire(): void {
    const content = this._parts.one('void-hover-card-content');
    if (!content) return;
    this._parts.set(content, 'popover', 'manual');
    this._parts.id(content, 'void-hover-card-content');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('void-close', this._onClose);
    this.addEventListener('mouseover', this._onOver);
    this.addEventListener('mouseout', this._onOut);
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback(): void {
    this.removeEventListener('void-close', this._onClose);
    this.removeEventListener('mouseover', this._onOver);
    this.removeEventListener('mouseout', this._onOut);
    this.removeEventListener('focusin', this._onFocusIn);
    this.removeEventListener('focusout', this._onFocusOut);
    super.disconnectedCallback();
    clearTimeout(this._openTimerId);
    clearTimeout(this._closeTimerId);
  }

  /** Which part `node` is in: the trigger, the card, or neither. */
  private _zone(node: EventTarget | null): 'trigger' | 'content' | null {
    if (!(node instanceof Node)) return null;
    if (this._parts.one('void-hover-card-trigger')?.contains(node)) return 'trigger';
    if (this._parts.one('void-hover-card-content')?.contains(node)) return 'content';
    return null;
  }

  private _onClose = (e: Event): void => {
    if (e.target !== this || (e as CustomEvent<{ reason: string }>).detail?.reason !== 'escape') return;
    const active = this.ownerDocument.activeElement;
    this._dismissed = !!active && active !== this.ownerDocument.body && this.contains(active);
  };

  /** The pointer moved onto the trigger or the card (from somewhere that was neither, or from the other). */
  private _onOver = (e: MouseEvent): void => {
    const to = this._zone(e.target);
    const from = this._zone(e.relatedTarget);
    if (!to || to === from) return;
    if (to === 'content') {
      clearTimeout(this._closeTimerId);
      return;
    }
    this._dismissed = false;
    clearTimeout(this._closeTimerId);
    clearTimeout(this._openTimerId);
    this._openTimerId = setTimeout(() => this._overlay.requestOpen('hover'), this.openDelay);
  };

  /** The pointer left the trigger or the card for something that is neither. */
  private _onOut = (e: MouseEvent): void => {
    const from = this._zone(e.target);
    const to = this._zone(e.relatedTarget);
    if (!from || to === from) return;
    if (from === 'trigger' && to === 'content') return;
    if (from === 'content' && to === 'trigger') return;
    clearTimeout(this._openTimerId);
    this._scheduleClose('hover');
  };

  private _onFocusIn = (e: FocusEvent): void => {
    const zone = this._zone(e.target);
    if (!zone) return;
    clearTimeout(this._closeTimerId);
    if (zone === 'content') return;
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
