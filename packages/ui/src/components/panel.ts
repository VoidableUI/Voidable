import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';

/**
 * Bordered or elevated content region for grouping related settings, dashboard sections, and detail blocks.
 *
 * Its regions are parts, in this order: an optional `<void-panel-header>` (holding a `<void-panel-title>` and an
 * optional `<void-panel-description>`) and the `<void-panel-body>`. The parts are CSS-only and never moved. The panel
 * is a `region` named by its title part; without a title it is unnamed unless the author gives it an `aria-label`.
 */
export class VoidPanel extends VoidElement {
  /**
   * `default` is a quiet filled region, `bordered` draws a visible border, `elevated` lifts it with a
   * shadow.
   */
  @property({ type: String, reflect: true }) variant: 'default' | 'bordered' | 'elevated' = 'default';

  /** The `aria-labelledby` this panel wrote itself, so an author's own name is never replaced. */
  private _labelledBy: string | null = null;

  protected readonly _parts = new PartsController(this, {
    tags: ['void-panel-header', 'void-panel-title', 'void-panel-description', 'void-panel-body'],
    onChange: () => this._wire(),
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'region');
  }

  private _wire(): void {
    const title = this._parts.one('void-panel-title');
    const current = this.getAttribute('aria-labelledby');
    const ours = this._labelledBy !== null && current === this._labelledBy;
    // The title names the region, unless the author named the panel themselves.
    if (title && !this.hasAttribute('aria-label') && (current === null || ours)) {
      this._labelledBy = this._parts.id(title, 'void-panel-title');
      this.setHostAttribute('aria-labelledby', this._labelledBy);
    } else if (ours) {
      this._labelledBy = null;
      this.setHostAttribute('aria-labelledby', null);
    }
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
