import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidPagination extends VoidElement {
  @property({ type: Number }) total = 1;
  @property({ type: Number, reflect: true }) value = 1;
  @property({ type: Number }) siblings = 1;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private _pages(): Array<number | 'ellipsis'> {
    const { total, value, siblings } = this;
    const items: Array<number | 'ellipsis'> = [];

    const rangeStart = Math.max(2, value - siblings);
    const rangeEnd = Math.min(total - 1, value + siblings);

    items.push(1);

    if (rangeStart > 2) {
      items.push('ellipsis');
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      items.push(i);
    }

    if (rangeEnd < total - 1) {
      items.push('ellipsis');
    }

    if (total > 1) {
      items.push(total);
    }

    return items;
  }

  private _go(page: number): void {
    if (page < 1 || page > this.total || page === this.value) return;
    this.value = page;
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: page },
    }));
  }

  render() {
    const pages = this._pages();
    let ellipsisCount = 0;

    return html`
      <nav role="navigation" aria-label="Pagination">
        <button
          class="void-pagination-btn"
          ?disabled=${this.value <= 1}
          @click=${() => this._go(this.value - 1)}
          aria-label="Previous page"
        >«</button>
        ${pages.map((p) => {
          if (p === 'ellipsis') {
            ellipsisCount++;
            return html`<span class="void-pagination-ellipsis" aria-hidden="true" data-key=${ellipsisCount}>…</span>`;
          }
          return html`
            <button
              class="void-pagination-btn"
              ?disabled=${p === this.value}
              aria-current=${p === this.value ? 'page' : nothing}
              @click=${() => this._go(p as number)}
            >${p}</button>
          `;
        })}
        <button
          class="void-pagination-btn"
          ?disabled=${this.value >= this.total}
          @click=${() => this._go(this.value + 1)}
          aria-label="Next page"
        >»</button>
      </nav>
    `;
  }
}

if (!customElements.get('void-pagination')) {
  customElements.define('void-pagination', VoidPagination);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-pagination': VoidPagination;
  }
}
