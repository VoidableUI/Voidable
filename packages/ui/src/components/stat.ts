import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidStat extends VoidElement {
  @property({ type: String, reflect: true }) label = '';
  @property({ type: String, reflect: true }) value = '';
  @property({ type: String, reflect: true }) delta = '';
  @property({ type: String, reflect: true }) trend: 'up' | 'down' | 'flat' | 'error' | 'warning' | 'success' | 'info' | 'notice' | 'highlight' | null = null;
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'figure');
  }

  render() {
    return html`
      ${this.label ? html`<span class="void-stat-label">${this.label}</span>` : ''}
      <span class="void-stat-value">${this.value}</span>
      ${this.delta ? html`<span class="void-stat-delta">${this.delta}</span>` : ''}
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
