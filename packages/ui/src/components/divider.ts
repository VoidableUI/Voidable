import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Visual separator between sections in forms, sidebars, and content layouts; supports optional label text. */
export class VoidDivider extends VoidElement {
  /**
   * Optional text drawn in the line, for a labelled break such as `or`. Also the separator's accessible
   * name.
   */
  @property({ type: String, reflect: true }) label: string | undefined = undefined;
  /**
   * `horizontal` (default) draws a rule across the available width; `vertical` draws one the height of
   * its container, for use between inline items.
   */
  @property({ type: String, reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'separator');
    this.setHostAttribute('aria-orientation', this.orientation);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('orientation')) {
      this.setHostAttribute('aria-orientation', this.orientation);
    }
  }

  render() {
    if (!this.label) {
      return nothing;
    }
    return html`${this.label}`;
  }
}

if (!customElements.get('void-divider')) {
  customElements.define('void-divider', VoidDivider);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-divider': VoidDivider;
  }
}
