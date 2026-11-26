import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { useProjection } from '../projection.js';
import { uid } from '../keyboard.js';

useProjection();

/**
 * Key metric display for analytics dashboards and KPI summaries with label, value, delta, and trend.
 *
 * With a `label` it is a `group` named by the label; without one it has no role.
 */
export class VoidStat extends VoidElement {
  /** Small caption above the value, such as `Active users`. */
  @property({ type: String, reflect: true }) label = '';
  /**
   * The headline figure, as text. Format it yourself (`12,480`, `$4.2k`, `99.9%`); the element does not
   * format numbers.
   */
  @property({ type: String, reflect: true }) value = '';
  /** Change shown beside the value, such as `+12%`. Its colour comes from `trend`. */
  @property({ type: String, reflect: true }) delta = '';
  /** Secondary line of text shown under the value, e.g. "vs. last month". */
  @property({ type: String, reflect: true }) description = '';
  /**
   * Colours the `delta`: `up` is success green and `down` is error red, `flat` is neutral, and a status
   * name (`error`, `warning`, `caution`, `success`, `info`, `notice`, `highlight`) uses that colour
   * directly. Use the status names when up is not good (rising errors).
   */
  @property({ type: String, reflect: true }) trend: 'up' | 'down' | 'flat' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' | null = null;
  /**
   * Status colour of the stat itself: `default`, `error`, `warning`, `caution`, `success`, `info`,
   * `notice` or `highlight`. Independent of the delta's `trend` colour.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private readonly _labelId = uid('void-stat-label');

  connectedCallback(): void {
    super.connectedCallback();
    this._syncName();
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label')) this._syncName();
  }

  /**
   * A stat with a `label` is a `group` named by it, so a reader hears "Revenue, group" and then the figures;
   * without a label it is plain text and has no role. A role or name the author wrote is kept.
   */
  private _syncName(): void {
    const role = this.getAttribute('role');
    if (role === null || role === this._writtenRole) {
      this._writtenRole = this.label ? 'group' : null;
      this.setHostAttribute('role', this._writtenRole);
    }
    if (!this.hasAttribute('aria-label') && (!this.hasAttribute('aria-labelledby') || this.getAttribute('aria-labelledby') === this._labelId)) {
      this.setHostAttribute('aria-labelledby', this.label ? this._labelId : null);
    }
  }

  private _writtenRole: string | null = null;

  render() {
    return html`
      ${this.label ? html`<span class="void-stat-label" id=${this._labelId}>${this.label}</span>` : ''}
      <span class="void-stat-value">${this.value}</span>
      ${this.delta ? html`<span class="void-stat-delta">${this.delta}</span>` : ''}
      ${this.description ? html`<span class="void-stat-description">${this.description}</span>` : ''}
    `;
  }
}

if (!customElements.get('void-stat')) {
  customElements.define('void-stat', VoidStat);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-stat': VoidStat;
  }
}
