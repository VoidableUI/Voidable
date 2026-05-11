import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Anchored overlay for contextual detail and mini-forms that need more room than a tooltip. */
export class VoidPopover extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  @property({ type: String, reflect: true }) trigger: 'click' | 'manual' = 'click';

  private _triggerEl: Element | null = null;
  private _contentNodes: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._didSetup) {
      this._triggerEl = this.children[0] ?? null;
      this._contentNodes = Array.from(this.childNodes).filter(n => n !== this._triggerEl);
    }
    document.addEventListener('mousedown', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('mousedown', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (!this._didSetup) {
      this._didSetup = true;
      if (this._triggerEl) {
        this.appendChild(this._triggerEl);
        if (this.trigger === 'click') {
          this._triggerEl.addEventListener('click', this._handleTriggerClick);
        }
      }
      const body = document.createElement('div');
      body.className = 'void-popover-body';
      for (const node of this._contentNodes) {
        body.appendChild(node);
      }
      this.appendChild(body);
    }

    if (changed.has('trigger') && this._triggerEl) {
      this._triggerEl.removeEventListener('click', this._handleTriggerClick);
      if (this.trigger === 'click') {
        this._triggerEl.addEventListener('click', this._handleTriggerClick);
      }
    }
  }

  private _handleTriggerClick = (): void => {
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
