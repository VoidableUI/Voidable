import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';
import type { VoidCheckbox } from './checkbox.js';

/** Grouped multi-option selection for preference forms, filter panels, and permission editors. */
export class VoidCheckboxGroup extends VoidElement {
  @property({ type: String, reflect: true }) label = '';
  @property({ type: String, reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';

  // Consumer checkboxes are projected into the items container.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'items', target: () => this.querySelector(':scope > .void-checkbox-group-items') }],
  });
  get value(): string[] {
    return Array.from(this.querySelectorAll('void-checkbox')).filter((el) => (el as VoidCheckbox).checked).map((el) => (el as VoidCheckbox).value);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    if (this.label) this.setAttribute('aria-label', this.label);
    this.addEventListener('void-change', this._handleChildChange);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('void-change', this._handleChildChange);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label')) {
      if (this.label) {
        this.setAttribute('aria-label', this.label);
      } else {
        this.removeAttribute('aria-label');
      }
    }
  }

  render() {
    return html`
      ${this.label ? html`<span class="void-checkbox-group-label">${this.label}</span>` : nothing}
      <div class="void-checkbox-group-items"></div>
    `;
  }

  private _handleChildChange = (e: Event): void => {
    const target = e.target as Element;
    if (!target.closest('void-checkbox') || target.closest('void-checkbox')?.closest('void-checkbox-group') !== this) return;
    e.stopImmediatePropagation();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { values: this.value },
    }));
  };
}

if (!customElements.get('void-checkbox-group')) {
  customElements.define('void-checkbox-group', VoidCheckboxGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-checkbox-group': VoidCheckboxGroup;
  }
}
