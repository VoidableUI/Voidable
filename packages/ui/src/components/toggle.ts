import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Pressable toggle button for toolbar actions and editor formatting controls with binary active/inactive state. */
export class VoidToggle extends VoidElement {
  @property({ type: Boolean, reflect: true }) pressed = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String, reflect: true }) variant: 'outline' | 'filled' = 'outline';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this.setHostAttribute('tabindex', this.disabled ? '-1' : '0');
    this.setHostAttribute('aria-pressed', String(this.pressed));
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('pressed')) this.setHostAttribute('aria-pressed', String(this.pressed));
    if (changed.has('disabled')) {
      this.setHostAttribute('aria-disabled', String(this.disabled));
      this.setHostAttribute('tabindex', this.disabled ? '-1' : '0');
    }
  }

  private _handleClick = (): void => {
    if (this.disabled) return;
    this.pressed = !this.pressed;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { pressed: this.pressed } }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if ((e.key === ' ' || e.key === 'Enter') && !this.disabled) {
      e.preventDefault();
      this._handleClick();
    }
  };
}

if (!customElements.get('void-toggle')) {
  customElements.define('void-toggle', VoidToggle);
}
