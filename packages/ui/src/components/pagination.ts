import { html, nothing, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { msg } from '../messages.js';
import { useProjection } from '../projection.js';

useProjection();

/**
 * Page navigation for data tables, search result lists, and content archives.
 *
 * It is a `navigation` landmark named "Pagination" by default. Add `landmark="none"` (or place it inside a
 * `<nav>`) when the page keeps one navigation region: it is then a named group of the same buttons.
 */
export class VoidPagination extends VoidElement {
  /** Number of pages. Defaults to 1. */
  @property({ type: Number }) total = 1;
  /**
   * Current page, 1-based. Choosing a page fires a cancelable `void-change` and then updates `value`;
   * cancel the event to keep the page unchanged.
   */
  @property({ type: Number, reflect: true }) value = 1;
  /**
   * Page buttons shown on each side of the current page before the list collapses to ellipses. Defaults
   * to 1.
   */
  @property({ type: Number }) siblings = 1;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Opt-in link mode: URL with a `{page}` placeholder, e.g. `/posts?page={page}`. */
  @property({ type: String, attribute: 'href-template', reflect: true }) hrefTemplate = '';
  /** Opt-in link mode: query parameter rewritten on the current location, e.g. `page`. Ignored when `href-template` is set. */
  @property({ type: String, reflect: true }) param = '';

  /**
   * `none` leaves out the navigation landmark and wraps the buttons in a named group, for a page that keeps a
   * single navigation region. Any other value (the default) is a `navigation` landmark. Inside a `<nav>` or an
   * element with `role="navigation"` it is never a landmark, whatever this says, so landmarks do not nest.
   */
  @property({ type: String, reflect: true }) landmark: 'navigation' | 'none' = 'navigation';

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate(); // the new parent decides whether this is a landmark
  }

  private get _isLandmark(): boolean {
    return this.landmark !== 'none' && !this.parentElement?.closest('nav, [role="navigation"]');
  }

  /** The buttons in a `nav`, or in a labelled `group` when this is not a landmark. */
  private _wrap(inner: TemplateResult) {
    const label = msg(this, 'pagination.label');
    return this._isLandmark
      ? html`<nav role="navigation" aria-label=${label}>${inner}</nav>`
      : html`<div role="group" aria-label=${label}>${inner}</div>`;
  }

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
    return this._wrap(html`
        ${edge(msg(this, 'pagination.previous'), '«', this.value - 1, this.value <= 1)}
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
        ${edge(msg(this, 'pagination.next'), '»', this.value + 1, this.value >= this.total)}
    `);
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

    return this._wrap(html`
        <button
          type="button"
          class="void-pagination-btn"
          ?disabled=${this.value <= 1}
          @click=${() => this._go(this.value - 1)}
          aria-label=${msg(this, 'pagination.previous')}
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
          aria-label=${msg(this, 'pagination.next')}
        >»</button>
    `);
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
