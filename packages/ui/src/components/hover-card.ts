import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Rich content preview card that appears on hover for user profiles, link previews, and contextual information panels. */
export class VoidHoverCard extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  @property({ type: Number, attribute: 'open-delay' }) openDelay = 300;
  @property({ type: Number, attribute: 'close-delay' }) closeDelay = 300;

  private _triggerEl: Element | null = null;
  private _contentNodes: Node[] = [];
  private _didSetup = false;
  private _openTimerId: ReturnType<typeof setTimeout> | undefined;
  private _closeTimerId: ReturnType<typeof setTimeout> | undefined;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._didSetup) {
      this._triggerEl = this.children[0] ?? null;
      this._contentNodes = Array.from(this.childNodes).filter(n => n !== this._triggerEl);
    }
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._openTimerId);
    clearTimeout(this._closeTimerId);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (!this._didSetup) {
      this._didSetup = true;

      if (this._triggerEl) {
        const wrapper = document.createElement('div');
        wrapper.className = 'void-hover-card-trigger';
        wrapper.setAttribute('aria-haspopup', 'dialog');
        wrapper.setAttribute('aria-expanded', String(this.open));
        wrapper.appendChild(this._triggerEl);
        wrapper.addEventListener('mouseenter', this._onTriggerEnter);
        wrapper.addEventListener('mouseleave', this._onTriggerLeave);
        wrapper.addEventListener('focusin', this._onFocusIn);
        wrapper.addEventListener('focusout', this._onFocusOut);
        this.appendChild(wrapper);
      }

      const body = document.createElement('div');
      body.className = 'void-hover-card-body';
      body.setAttribute('role', 'dialog');
      body.addEventListener('mouseenter', this._onBodyEnter);
      body.addEventListener('mouseleave', this._onBodyLeave);
      for (const node of this._contentNodes) {
        body.appendChild(node);
      }
      this.appendChild(body);
    }

    if (changed.has('open')) {
      const wrapper = this.querySelector('.void-hover-card-trigger');
      if (wrapper) {
        wrapper.setAttribute('aria-expanded', String(this.open));
      }
    }
  }

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
