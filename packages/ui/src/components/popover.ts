import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController, triggerRegion } from '../projection.js';

/** Anchored overlay for contextual detail and mini-forms that need more room than a tooltip. */
export class VoidPopover extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  @property({ type: String, reflect: true }) align: 'start' | 'center' | 'end' = 'start';
  @property({ type: String, reflect: true }) trigger: 'click' | 'manual' = 'click';

  // The trigger (slot="trigger", else the first element child) stays the host's first child; everything else goes into the body.
  protected readonly _projection: ProjectionController = new ProjectionController(this, {
    regions: [
      triggerRegion('trigger', 'before', () => this._projection, this),
      { name: 'body', target: () => this.querySelector(':scope > .void-popover-body') },
    ],
  });

  private get _triggerEl(): Element | null {
    return (this._projection.nodes('trigger').find(n => n instanceof Element) as Element | undefined) ?? null;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Delegated on the host so a replaced trigger keeps working and reconnects never stack listeners.
    this.addEventListener('click', this._handleTriggerClick);
    document.addEventListener('mousedown', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleTriggerClick);
    document.removeEventListener('mousedown', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  render() {
    return html`<div class="void-popover-body"></div>`;
  }

  private _handleTriggerClick = (e: Event): void => {
    const trigger = this._triggerEl;
    if (this.trigger !== 'click' || !trigger || !trigger.contains(e.target as Node)) return;
    this.open = !this.open;
    if (!this.open) {
      this._dispatchClose();
    }
  };

  private _handleOutsideClick = (e: MouseEvent): void => {
    if (this.open && !this.contains(e.target as Node)) {
      this._close();
    }
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) {
      this._close();
    }
  };

  private _close(): void {
    this.open = false;
    this._dispatchClose();
  }

  private _dispatchClose(): void {
    this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
  }

}

if (!customElements.get('void-popover')) {
  customElements.define('void-popover', VoidPopover);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-popover': VoidPopover;
  }
}
