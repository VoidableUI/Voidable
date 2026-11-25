import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Single mutually exclusive option for forms and surveys; typically used inside VoidRadioGroup. */
export class VoidRadio extends VoidElement {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) name = '';
  @property({ type: String, reflect: true }) value = '';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  // Consumer label content stays on the host, after the rendered control.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'label', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'radio');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-checked', String(this.checked));
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('checked')) {
      this.setAttribute('aria-checked', String(this.checked));
    }
    if (changed.has('disabled')) {
      this.setAttribute('aria-disabled', String(this.disabled));
      this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    }
  }

  render() {
    return html`
      <input type="radio" .checked=${this.checked} ?disabled=${this.disabled} name=${this.name} value=${this.value} tabindex="-1" aria-hidden="true" />
      <span class="void-radio-circle">
        ${this.checked ? html`<span class="void-radio-dot"></span>` : ''}
      </span>
    `;
  }

  private _handleClick = (e: Event): void => {
    if (this.disabled || this.checked) {
      if (this.disabled) e.stopImmediatePropagation();
      return;
    }
    this.checked = true;
    const input = this.querySelector('input[type="radio"]') as HTMLInputElement | null;
    if (input) input.checked = true;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value, checked: true } }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === ' ' && !this.disabled) {
      e.preventDefault();
      this._handleClick(e);
    }
  };
}

if (!customElements.get('void-radio')) {
  customElements.define('void-radio', VoidRadio);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-radio': VoidRadio;
  }
}
