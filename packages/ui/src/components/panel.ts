import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement, ProjectionController } from '../base.js';

/** Bordered or elevated content region for grouping related settings, dashboard sections, and detail blocks. */
export class VoidPanel extends VoidElement {
  @property({ type: String, reflect: true }) label = '';
  @property({ type: String, reflect: true }) variant: 'default' | 'bordered' | 'elevated' = 'default';

  // Consumer content stays on the host, after the rendered label.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'content', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    if (this.label) {
      this.setAttribute('aria-label', this.label);
    }
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
    return this.label
      ? html`<div class="void-panel-label">${this.label}</div>`
      : nothing;
  }
}

if (!customElements.get('void-panel')) {
  customElements.define('void-panel', VoidPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-panel': VoidPanel;
  }
}
