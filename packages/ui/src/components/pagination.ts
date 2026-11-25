import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Page navigation for data tables, search result lists, and content archives. */
export class VoidPagination extends VoidElement {
  @property({ type: Number }) total = 1;
  @property({ type: Number, reflect: true }) value = 1;
  @property({ type: Number }) siblings = 1;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Opt-in link mode: URL with a `{page}` placeholder, e.g. `/posts?page={page}`. */
  @property({ type: String, attribute: 'href-template', reflect: true }) hrefTemplate = '';
  /** Opt-in link mode: query parameter rewritten on the current location, e.g. `page`. Ignored when `href-template` is set. */
  @property({ type: String, reflect: true }) param = '';

  private get _linkMode(): boolean {
    return this.hrefTemplate !== '' || this.param !== '';
  }

  private _href(page: number): string {
    if (this.hrefTemplate) return this.hrefTemplate.split('{page}').join(String(page));
    if (typeof location === 'undefined') return '#';
    const url = new URL(location.href);
    url.searchParams.set(this.param, String(page));
    return url.pathname + url.search + url.hash;
  }

  private _onLinkClick(e: MouseEvent, page: number): void {
    // Let the browser handle new-tab / download style clicks untouched.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (page === this.value) {
      e.preventDefault();
      return;
    }
    if (page < 1 || page > this.total) {
      e.preventDefault();
      return;
    }
    // Do not touch `value` here: Lit would re-render in the microtask and rewrite this
    // anchor's href before the browser follows it, sending the user to the wrong page.
    const ev = new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { value: page },
    });
    this.dispatchEvent(ev);
    if (ev.defaultPrevented) {
      e.preventDefault();
      return;
    }
    // Once the click has been fully dispatched the browser has already read the href and
    // started navigating. If a router or Turbo Drive intercepted the click (defaultPrevented)
    // the element survives the navigation, so catch `value` up in a later task. After a real
    // navigation the new document sets its own value (and a bfcache restore keeps this page).
    setTimeout(() => {
      if (e.defaultPrevented && this.isConnected) this.value = page;
    }, 0);
  }

  private _renderLinks(pages: Array<number | 'ellipsis'>) {
    let ellipsisCount = 0;
    const edge = (label: string, glyph: string, target: number, disabled: boolean) => disabled
      ? html`<span class="void-pagination-btn" aria-disabled="true" aria-label=${label}>${glyph}</span>`
      : html`<a class="void-pagination-btn" href=${this._href(target)} aria-label=${label}
          @click=${(e: MouseEvent) => this._onLinkClick(e, target)}>${glyph}</a>`;
    return html`
      <nav role="navigation" aria-label="Pagination">
        ${edge('Previous page', '«', this.value - 1, this.value <= 1)}
        ${pages.map((p) => {
          if (p === 'ellipsis') {
            ellipsisCount++;
            return html`<span class="void-pagination-ellipsis" aria-hidden="true" data-key=${ellipsisCount}>…</span>`;
          }
          return html`<a
            class="void-pagination-btn"
            href=${this._href(p)}
            aria-current=${p === this.value ? 'page' : nothing}
            @click=${(e: MouseEvent) => this._onLinkClick(e, p)}
          >${p}</a>`;
        })}
        ${edge('Next page', '»', this.value + 1, this.value >= this.total)}
      </nav>
    `;
  }

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

  /** Returns false when a cancelable void-change was cancelled. */
  private _go(page: number, cancelable = false): boolean {
    if (page < 1 || page > this.total || page === this.value) return true;
    const ev = new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      cancelable,
      detail: { value: page },
    });
    if (cancelable) {
      this.dispatchEvent(ev);
      if (ev.defaultPrevented) return false;
      this.value = page;
      return true;
    }
    this.value = page;
    this.dispatchEvent(ev);
    return true;
  }

  render() {
    const pages = this._pages();
    if (this._linkMode) return this._renderLinks(pages);
    let ellipsisCount = 0;

    return html`
      <nav role="navigation" aria-label="Pagination">
        <button
          type="button"
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
              type="button"
              class="void-pagination-btn"
              ?disabled=${p === this.value}
              aria-current=${p === this.value ? 'page' : nothing}
              @click=${() => this._go(p as number)}
            >${p}</button>
          `;
        })}
        <button
          type="button"
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
