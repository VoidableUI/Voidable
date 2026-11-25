import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { OverlayController } from '../overlay.js';
import { PartsController, triggerControl } from '../parts.js';

/**
 * Anchored overlay for contextual detail and mini-forms that need more room than a tooltip.
 *
 * Two parts: `<void-popover-trigger>` around the control that toggles it (one element: a `<void-button>`, a
 * `<button>`), and `<void-popover-content>`, the panel. The parts are the final DOM; the popover only adds
 * behaviour. The content is a non-modal dialog shown in the top layer (the Popover API), so no `overflow` or
 * `transform` of an ancestor clips it, placed next to the trigger with CSS anchor positioning (flipping at
 * viewport edges; a JavaScript positioner where anchor positioning is missing). Opening it from the trigger moves
 * focus to its first focusable element; Escape, a press outside it, or focus leaving it closes it and focus
 * returns to the trigger. The trigger's control gets `aria-haspopup="dialog"`, `aria-expanded` and
 * `aria-controls`, and names the content.
 *
 * @fires {CustomEvent<{ reason: 'trigger' | 'api' }>} void-open - The popover opened.
 * @fires {CustomEvent<{ reason: 'trigger' | 'escape' | 'outside' | 'blur' | 'parent' | 'api' }>} void-close - The
 * popover is closing. Cancelable when the user caused it (every reason but `parent` and `api`).
 */
export class VoidPopover extends VoidElement {
  /** Whether the popover is open. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Side of the trigger it opens on; it flips to the opposite side when there is no room. */
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  /** Alignment with the trigger along that side. */
  @property({ type: String, reflect: true }) align: 'start' | 'center' | 'end' = 'start';
  /** `click` toggles on trigger clicks; `manual` leaves opening to the `open` attribute or property. */
  @property({ type: String, reflect: true }) trigger: 'click' | 'manual' = 'click';

  protected readonly _parts = new PartsController(this, {
    tags: ['void-popover-trigger', 'void-popover-content'],
    onChange: () => {
      this._wire();
      this.requestUpdate();
    },
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'dialog',
    surface: () => this._parts.one('void-popover-content'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => this._control(),
    haspopup: 'dialog',
    anchor: () => this,
    hostStyle: (p, v) => this.setHostStyle(p, v),
    placement: () => ({ side: this.position, align: this.align }),
    attr: (el, name, value) => this._parts.set(el, name, value),
    style: (el, p, v) => this._parts.style(el, p, v),
  });

  private _control(): HTMLElement | null {
    return triggerControl(this._parts.one('void-popover-trigger'));
  }

  /** The content is a non-modal dialog in the top layer, named by the trigger's control. */
  private _wire(): void {
    const content = this._parts.one('void-popover-content');
    const control = this._control();
    if (!content) return;
    this._parts.set(content, 'popover', 'manual');
    this._parts.set(content, 'role', 'dialog');
    this._parts.id(content, 'void-popover-content');
    this._parts.set(content, 'aria-labelledby', control ? this._parts.id(control, 'void-popover-trigger') : null);
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Delegated on the host so a replaced trigger keeps working and reconnects never stack listeners.
    this.addEventListener('click', this._handleTriggerClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleTriggerClick);
  }

  private _handleTriggerClick = (e: Event): void => {
    const trigger = this._parts.one('void-popover-trigger');
    if (this.trigger !== 'click' || !trigger || !trigger.contains(e.target as Node)) return;
    this._overlay.toggle('trigger');
  };
}

if (!customElements.get('void-popover')) {
  customElements.define('void-popover', VoidPopover);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-popover': VoidPopover;
  }
}
