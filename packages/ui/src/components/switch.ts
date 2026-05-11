import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** On/off toggle for feature flags, notification preferences, and settings that take immediate effect. */
export class VoidSwitch extends VoidElement {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'switch');
    this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    this.setAttribute('aria-checked', String(this.checked));
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('checked')) {
      this.setAttribute('aria-checked', String(this.checked));
    }
    if (changed.has('disabled')) {
      this.setAttribute('aria-disabled', String(this.disabled));
      this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    }
  }

  private _handleClick = (): void => {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { checked: this.checked },
    }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if ((e.key === ' ' || e.key === 'Enter') && !this.disabled) {
      e.preventDefault();
      this._handleClick();
    }
  };

  render() {
    return html`<span class="void-switch-track"><span class="void-switch-thumb"></span></span>`;
  }
}

if (!customElements.get('void-switch')) {
  customElements.define('void-switch', VoidSwitch);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-switch': VoidSwitch;
  }
}
