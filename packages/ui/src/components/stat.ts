import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { useProjection } from '../projection.js';

useProjection();

/** Key metric display for analytics dashboards and KPI summaries with label, value, delta, and trend. */
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

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'figure');
  }

  render() {
    return html`
      ${this.label ? html`<span class="void-stat-label">${this.label}</span>` : ''}
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
