import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { OverlayController } from '../overlay.js';
import { ProjectionController, triggerRegion } from '../projection.js';

/**
 * Anchored overlay for contextual detail and mini-forms that need more room than a tooltip.
 *
 * A non-modal dialog shown in the top layer (the Popover API), so no `overflow` or `transform` of an ancestor clips
 * it, placed next to its trigger with CSS anchor positioning (flipping at viewport edges; a JavaScript positioner
 * where anchor positioning is missing). Opening it from the trigger moves focus to its first focusable element;
 * Escape, a press outside it, or focus leaving it closes it and focus returns to the trigger. The trigger gets
 * `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.
 *
 * @slot trigger - The element that toggles the popover. Mark it with `slot="trigger"`; without one, the first child element is used.
 * @slot - Popover content.
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

  // The trigger (slot="trigger", else the first element child) stays the host's first child; everything else goes into the body.
  protected readonly _projection: ProjectionController = new ProjectionController(this, {
    regions: [
      triggerRegion('trigger', 'before', () => this._projection, this),
      { name: 'body', target: () => this.querySelector(':scope > .void-popover-body') },
    ],
    // Trigger ARIA follows the trigger, including one the parser adds after the first render.
    onChange: () => this.requestUpdate(),
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'dialog',
    surface: () => this.querySelector<HTMLElement>(':scope > .void-popover-body'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => this._triggerEl,
    haspopup: 'dialog',
    anchor: () => this,
    hostStyle: (p, v) => this.setHostStyle(p, v),
    placement: () => ({ side: this.position, align: this.align }),
  });

  /** Given to a trigger without an id, so the body can be named by it (re-applied after a morph strips it). */
  private readonly _triggerId = `void-popover-trigger-${Math.random().toString(36).slice(2, 10)}`;

  private get _triggerEl(): HTMLElement | null {
    return (this._projection.nodes('trigger').find(n => n instanceof HTMLElement) as HTMLElement | undefined) ?? null;
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

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    // The body is a non-modal dialog named by its trigger.
    const body = this.querySelector(':scope > .void-popover-body');
    const trigger = this._triggerEl;
    if (body && trigger) {
      if (!trigger.id) trigger.id = this._triggerId;
      if (body.getAttribute('aria-labelledby') !== trigger.id) body.setAttribute('aria-labelledby', trigger.id);
    }
  }

  render() {
    // The body carries its accessible name (aria-labelledby the trigger) from updated().
    // eslint-disable-next-line lit-a11y/accessible-name
    return html`<div class="void-popover-body" popover="manual" role="dialog"></div>`;
  }

  private _handleTriggerClick = (e: Event): void => {
    const trigger = this._triggerEl;
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
