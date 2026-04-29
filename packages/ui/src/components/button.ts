import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidButton extends VoidElement {
  static formAssociated = true;

  @property({ type: String, reflect: true }) variant: 'outline' | 'filled' = 'outline';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) type: 'button' | 'submit' | 'reset' = 'button';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  private _internals: ElementInternals | null = null;

  constructor() {
    super();
    try {
      this._internals = this.attachInternals();
    } catch {
      // attachInternals not supported (e.g., happy-dom).
    }
  }

  /** Return the associated form, via ElementInternals or DOM traversal. */
  private get _form(): HTMLFormElement | null {
    return this._internals?.form ?? this.closest('form');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-disabled', String(this.disabled));
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('disabled')) {
      this.setAttribute('aria-disabled', String(this.disabled));
      this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    }
  }

  private _handleClick = (e: Event): void => {
    if (this.disabled) {
      e.stopImmediatePropagation();
      return;
    }
    if (this.type === 'submit') {
      this._form?.requestSubmit();
    } else if (this.type === 'reset') {
      this._form?.reset();
    }
    this.dispatchEvent(new CustomEvent('void-click', { bubbles: true, composed: true }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !this.disabled) {
      e.preventDefault();
      this._handleClick(e);
    }
  };
}

if (!customElements.get('void-button')) {
  customElements.define('void-button', VoidButton);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-button': VoidButton;
  }
}
