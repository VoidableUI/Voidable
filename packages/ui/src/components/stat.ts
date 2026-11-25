import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Key metric display for analytics dashboards and KPI summaries with label, value, delta, and trend. */
export class VoidStat extends VoidElement {
  @property({ type: String, reflect: true }) label = '';
  @property({ type: String, reflect: true }) value = '';
  @property({ type: String, reflect: true }) delta = '';
  /** Secondary line of text shown under the value, e.g. "vs. last month". */
  @property({ type: String, reflect: true }) description = '';
  @property({ type: String, reflect: true }) trend: 'up' | 'down' | 'flat' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' | null = null;
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
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
