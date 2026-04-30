import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import type { VoidRadio } from './radio.js';

export class VoidRadioGroup extends VoidElement {
  @property({ type: String }) label = '';
  @property({ type: String }) value = '';
  @property({ type: String }) name = '';
  @property({ type: String, reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'radiogroup');
    if (this.label) this.setAttribute('aria-label', this.label);
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
    this.addEventListener('void-change', this._handleChildChange as EventListener);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('void-change', this._handleChildChange as EventListener);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label') && this.label) {
      this.setAttribute('aria-label', this.label);
    }
    if (changed.has('name')) {
      this._syncNames();
    }
    if (!this._didSetup) {
      this._didSetup = true;
      const group = this.querySelector('.void-radio-group-options');
      if (group) {
        for (const node of this._userContent) {
          group.appendChild(node);
        }
      }
      this._syncNames();
      this._syncChecked();
    }
  }

  private _radios(): VoidRadio[] {
    return Array.from(this.querySelectorAll('void-radio')) as VoidRadio[];
  }

  private _syncNames(): void {
    if (!this.name) return;
    for (const radio of this._radios()) {
      radio.name = this.name;
    }
  }

  private _syncChecked(): void {
    for (const radio of this._radios()) {
      radio.checked = radio.value === this.value;
    }
  }

  private _handleChildChange = (e: CustomEvent): void => {
    const target = e.target as VoidRadio;
    if (!target || target.tagName.toLowerCase() !== 'void-radio') return;
    if (!e.detail?.checked) return;
    e.stopImmediatePropagation();
    this.value = target.value;
    for (const radio of this._radios()) {
      if (radio !== target) radio.checked = false;
    }
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  };

  render() {
    return html`
      ${this.label ? html`<span class="void-radio-group-label">${this.label}</span>` : nothing}
      <div class="void-radio-group-options"></div>
    `;
  }
}

if (!customElements.get('void-radio-group')) {
  customElements.define('void-radio-group', VoidRadioGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-radio-group': VoidRadioGroup;
  }
}
