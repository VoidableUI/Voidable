import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Bordered or elevated content region for grouping related settings, dashboard sections, and detail blocks. */
export class VoidPanel extends VoidElement {
  /**
   * Title drawn at the top of the panel. It is also the region's accessible name; without a label the
   * region is unnamed.
   */
  @property({ type: String, reflect: true }) label = '';
  /**
   * `default` is a quiet filled region, `bordered` draws a visible border, `elevated` lifts it with a
   * shadow.
   */
  @property({ type: String, reflect: true }) variant: 'default' | 'bordered' | 'elevated' = 'default';

  // Consumer content stays on the host, after the rendered label.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'content', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'region');
    if (this.label) {
      this.setHostAttribute('aria-label', this.label);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label')) {
      if (this.label) {
        this.setHostAttribute('aria-label', this.label);
      } else {
        this.setHostAttribute('aria-label', null);
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
