import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Overlays whose panels are absolutely positioned inside their host (see {@link VoidTable}`#revealOverlays`). */
const OPEN_OVERLAY = '[open], void-tooltip[visible]';

/** Table row groups, rows and cells, with the roles a browser may drop once their `display` changes. */
/** What marks a header cell as something to use (select all, sort) rather than only a column name. */
const CONTROLS = 'button, a[href], input, select, textarea, [tabindex], [role="checkbox"], [role="button"], [role="switch"]';

/** Rows above which a stacked table skips layout of rows that are out of view. */
const LONG_TABLE = 100;

const ROLES: Record<string, string> = {
  TABLE: 'table',
  THEAD: 'rowgroup',
  TBODY: 'rowgroup',
  TFOOT: 'rowgroup',
  TR: 'row',
  TD: 'cell',
  CAPTION: 'caption',
};

/** The cells of a row (`row.cells` is missing in some DOM implementations). */
function cellsOf(row: Element): Element[] {
  return Array.from(row.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH');
}

function span(cell: Element): number {
  return Math.max(1, Number.parseInt(cell.getAttribute('colspan') ?? '1', 10) || 1);
}

interface Column {
  label: string;
  stack: string | null;
  align: string | null;
}

/**
 * Data table around a native `<table>`: sets how it looks (`striped`, `hoverable`, `compact`,
 * `bordered`, `inset`), how it behaves when the container is narrow (`stack`) and when it is wider
 * than its container (`scrollable`, `sticky-header`, `sticky-column`).
 *
 * **Stacked presentation.** `stack` turns each row into a block of label and value pairs while the
 * table's container (not the viewport) is narrower than a breakpoint (`stack="48rem"`, `stack="always"`). The label of a cell is the
 * text of the header cell of its column; it is copied to the cell as `data-label` (a `data-label`
 * written on a cell is kept). `data-stack` on a header cell sets the role of a column in the block:
 * `title` (the block's heading, no label), `select` (a row checkbox, beside the title), `actions`
 * (buttons, grouped at the end) or `hide` (left out). It is copied to the cells of the column.
 * `data-align="end"` on a header cell right-aligns a numeric column. Because browsers can drop table
 * semantics when `display` changes, a table with `stack` carries explicit table, row and cell roles.
 *
 * **Overflow.** Nothing is clipped by default, so a menu, popover or tooltip opened from a cell is
 * always fully visible. `scrollable` makes the table its own horizontal scroll region: it is
 * focusable and labelled (`label`, else the `<caption>`, else `aria-label`) only while it actually
 * overflows, and fades its edges while there is more to scroll to. `max-height` makes the region
 * scroll vertically too, which is what `sticky-header` needs; without it a sticky header sticks to
 * the page. A scroll region clips what is opened in a cell, so while an overlay is open the region
 * makes room for it (and scrolls it into view).
 *
 * @cssprop --void-table-max-height - Height at which a scrollable table starts scrolling vertically.
 */
export class VoidTable extends VoidElement {
  @property({ type: Boolean, reflect: true }) striped = false;
  @property({ type: Boolean, reflect: true }) hoverable = false;
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ type: Boolean, reflect: true }) bordered = false;
  /** For a table placed in a card or panel: its dividers and stripes run to the container's edge and its text stays aligned with the container's content. */
  @property({ type: Boolean, reflect: true }) inset = false;
  /**
   * Presents each row as a block of label and value pairs while the table's container is narrow.
   * Present without a value: stack below the theme's breakpoint (`--void-table-stack-at`, 40rem).
   * A CSS length (`48rem`, `600px`) sets the breakpoint for this table, `always` stacks at every
   * width. Absent: always a table.
   */
  @property({ type: String, reflect: true }) stack: string | null = null;
  /** Makes the table a horizontal scroll region (focusable and labelled while it overflows) with faded edges. */
  @property({ type: Boolean, reflect: true }) scrollable = false;
  /** Keeps the header row in view: against the table's own scroll (with `max-height`) or against the page. */
  @property({ type: Boolean, reflect: true, attribute: 'sticky-header' }) stickyHeader = false;
  /** Keeps the first column in view while the table scrolls horizontally. */
  @property({ type: Boolean, reflect: true, attribute: 'sticky-column' }) stickyColumn = false;
  /** Height (a CSS length) at which a scrollable table scrolls vertically. */
  @property({ type: String, reflect: true, attribute: 'max-height' }) maxHeight: string | null = null;
  /** Accessible name of the scroll region (default: the table's caption, then `aria-label`). */
  @property({ type: String, reflect: true }) label: string | null = null;

  #mutations: MutationObserver | null = null;
  #resize: ResizeObserver | null = null;
  #raf = 0;
  #queued = false;
  #autoLabels = new WeakMap<Element, string>();
  #autoStack = new WeakMap<Element, string>();
  #autoAlign = new WeakMap<Element, string>();
  #writtenLabel: string | null = null;
  #warned = false;
  #stackStyled = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#mutations ??= new MutationObserver((records) => this.#onMutations(records));
    this.#mutations.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-label', 'data-stack', 'data-align', 'role', 'colspan', 'open', 'visible', 'aria-expanded'],
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.#resize ??= new ResizeObserver(() => this.#schedule());
      this.#resize.observe(this);
    }
    this.addEventListener('scroll', this.#onScroll, { passive: true });
    this.#schedule();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#mutations?.disconnect();
    this.#resize?.disconnect();
    this.removeEventListener('scroll', this.#onScroll);
    if (this.#raf) cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.setHostStyle('--void-table-max-height', this.maxHeight || '');
    const at = (this.stack ?? '').trim();
    if (/^\d*\.?\d+(px|rem|em)$/.test(at)) {
      this.setHostStyle('--void-table-stack-at', at);
      this.#stackStyled = true;
    } else if (this.#stackStyled) {
      this.setHostStyle('--void-table-stack-at', null);
      this.#stackStyled = false;
    }
    this.#schedule();
  }

  #onScroll = (): void => this.#syncEdges();

  #onMutations(records: MutationRecord[]): void {
    const isOpenState = (r: MutationRecord) =>
      r.type === 'attributes' && ['open', 'visible', 'aria-expanded'].includes(r.attributeName ?? '');
    if (records.some(isOpenState)) this.#scheduleOverlays();
    // Open state alone does not change what the table's cells say.
    if (records.some((r) => !isOpenState(r))) this.#schedule();
  }

  /** Coalesces every trigger (mutations, resizes, property changes) into one pass after layout. */
  #schedule(): void {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (!this.isConnected) return;
      this.#syncCells(this.stack !== null);
      this.#syncRegion();
      // Writing labels and roles is not news to the observer.
      this.#mutations?.takeRecords();
    });
  }

  // ── Stacked presentation ──────────────────────────────────────────────────

  /** Copies each column's label, role and alignment from its header cell to the cells under it. */
  #syncCells(stacked: boolean): void {
    let title = false;
    let select = false;
    let rowCount = 0;
    for (const table of this.querySelectorAll('table')) {
      if (table.closest('void-table') !== this) continue;
      if (stacked) this.#setRole(table);
      const headRow = this.#headerRow(table);
      const columns: Column[] = [];
      if (headRow) {
        for (const th of cellsOf(headRow)) {
          const label = th.hasAttribute('data-label')
            ? (th.getAttribute('data-label') ?? '')
            : (th.textContent ?? '').replace(/\s+/g, ' ').trim();
          const column: Column = { label, stack: th.getAttribute('data-stack'), align: th.getAttribute('data-align') };
          if (column.stack === 'title') title = true;
          if (column.stack === 'select') select = true;
          const controls = th.querySelector(CONTROLS) !== null;
          if (controls !== th.hasAttribute('data-controls')) th.toggleAttribute('data-controls', controls);
          for (let i = 0; i < span(th); i++) columns.push(column);
        }
      }
      if (headRow) {
        const controls = headRow.querySelector('[data-controls]') !== null;
        if (controls !== headRow.hasAttribute('data-controls')) headRow.toggleAttribute('data-controls', controls);
      }
      if (stacked) for (const el of table.querySelectorAll(':scope > caption, :scope > thead, :scope > tbody, :scope > tfoot')) this.#setRole(el);
      for (const row of Array.from(table.querySelectorAll('tr'))) {
        if (row.closest('table') !== table) continue;
        rowCount++;
        if (stacked) this.#setRole(row);
        const inHead = row.parentElement?.tagName === 'THEAD' || row === headRow;
        let index = 0;
        for (const cell of cellsOf(row)) {
          if (stacked) {
            if (cell.tagName === 'TH') this.#setRole(cell, inHead || cell.getAttribute('scope') === 'col' ? 'columnheader' : 'rowheader');
            else this.#setRole(cell);
          }
          if (!inHead) {
            const column = columns[index];
            if (column) {
              if (stacked) this.#sync(cell, 'data-label', column.label, this.#autoLabels, true);
              this.#sync(cell, 'data-stack', column.stack, this.#autoStack);
              this.#sync(cell, 'data-align', column.align, this.#autoAlign);
            }
          }
          index += span(cell);
        }
      }
    }
    // Where a title or row checkbox is, the checkbox sits beside the title (CSS cannot ask a row what it holds cheaply).
    this.setHostAttribute('data-stack-title', title ? '' : null);
    this.setHostAttribute('data-stack-select', select ? '' : null);
    // A long table lets the browser skip the rows that are out of view while it stacks.
    this.setHostAttribute('data-long', rowCount > LONG_TABLE ? '' : null);
  }

  #headerRow(table: HTMLTableElement): HTMLTableRowElement | null {
    const headRows = table.querySelectorAll<HTMLTableRowElement>(':scope > thead > tr');
    if (headRows.length) return headRows[headRows.length - 1];
    const first = table.querySelector<HTMLTableRowElement>(':scope > tbody > tr, :scope > tr');
    return first && cellsOf(first).every((c) => c.tagName === 'TH') ? first : null;
  }

  /** Writes a value derived from the header cell unless the author wrote a different one on the cell. */
  #sync(cell: Element, name: string, value: string | null, written: WeakMap<Element, string>, emptyIsValue = false): void {
    const current = cell.getAttribute(name);
    const mine = written.get(cell);
    if (current !== null && current !== mine) return;
    const next = value === null || (!emptyIsValue && value === '') ? null : value;
    if (next === null) {
      if (current !== null) cell.removeAttribute(name);
      written.delete(cell);
    } else {
      if (current !== next) cell.setAttribute(name, next);
      written.set(cell, next);
    }
  }

  #setRole(el: Element, role = ROLES[el.tagName]): void {
    if (!role) return;
    if (!el.hasAttribute('role')) el.setAttribute('role', role);
  }

  // ── Scroll region ─────────────────────────────────────────────────────────

  get #overflowing(): boolean {
    return this.scrollable && this.scrollWidth > this.clientWidth + 1;
  }

  #syncRegion(): void {
    const overflowing = this.#overflowing;
    this.setHostAttribute('data-overflowing', overflowing ? '' : null);
    if (!overflowing) {
      this.#clearRegionSemantics();
      this.setHostAttribute('data-overflow-start', null);
      this.setHostAttribute('data-overflow-end', null);
      return;
    }
    const authored = this.getAttribute('aria-label');
    const authorLabel = authored !== null && authored !== this.#writtenLabel;
    const name =
      this.label ||
      (authorLabel || this.hasAttribute('aria-labelledby')
        ? ''
        : (this.querySelector('caption')?.textContent ?? '').replace(/\s+/g, ' ').trim());
    if (!name && !authorLabel && !this.hasAttribute('aria-labelledby') && !this.#warned) {
      this.#warned = true;
      console.warn('<void-table scrollable>: the scroll region has no accessible name. Set label, aria-label or add a <caption>.', this);
    }
    this.setHostAttribute('tabindex', '0');
    if (!this.hasAttribute('role') || this.getAttribute('role') === 'region') this.setHostAttribute('role', 'region');
    if (name && !authorLabel) {
      this.setHostAttribute('aria-label', name);
      this.#writtenLabel = name;
    }
    this.#syncEdges();
  }

  #clearRegionSemantics(): void {
    this.setHostAttribute('tabindex', null);
    if (this.getAttribute('role') === 'region') this.setHostAttribute('role', null);
    if (this.#writtenLabel !== null) {
      if (this.getAttribute('aria-label') === this.#writtenLabel) this.setHostAttribute('aria-label', null);
      this.#writtenLabel = null;
    }
  }

  /** Records whether there is more to scroll to on either side (read by the edge fades). */
  #syncEdges(): void {
    if (!this.#overflowing) return;
    const max = this.scrollWidth - this.clientWidth;
    const pos = Math.abs(this.scrollLeft);
    this.setHostAttribute('data-overflow-start', pos > 1 ? '' : null);
    this.setHostAttribute('data-overflow-end', pos < max - 1 ? '' : null);
  }

  // ── Overlays opened from a cell ───────────────────────────────────────────

  /**
   * Overlays (dropdown menu, popover, hover card, tooltip, date picker) place their panel with
   * `position: absolute` inside their own host, so a scroll region clips them. While one is open the
   * region grows downwards to contain it and scrolls it into view sideways. A table without
   * `scrollable` clips nothing and needs none of this.
   *
   * Becomes unnecessary once overlays render in the browser's top layer, which no ancestor clips.
   */
  #scheduleOverlays(): void {
    if (this.#raf) cancelAnimationFrame(this.#raf);
    // Two frames: the host's `open` attribute changes first, its panel renders after.
    this.#raf = requestAnimationFrame(() => {
      this.#raf = requestAnimationFrame(() => {
        this.#raf = 0;
        this.#revealOverlays();
      });
    });
  }

  #revealOverlays(): void {
    const open = Array.from(this.querySelectorAll(OPEN_OVERLAY)).filter((el) => el.localName.startsWith('void-'));
    this.setHostAttribute('data-overlay', open.length ? '' : null);
    if (!this.scrollable) return;
    this.setHostStyle('--void-table-room', null);
    let bottom = 0;
    let left = Infinity;
    let right = -Infinity;
    for (const host of open) {
      for (const el of host.querySelectorAll('*')) {
        if (getComputedStyle(el).position !== 'absolute' || !el.checkVisibility?.()) continue;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        bottom = Math.max(bottom, rect.bottom);
        left = Math.min(left, rect.left);
        right = Math.max(right, rect.right);
      }
    }
    if (!bottom) return;
    const region = this.getBoundingClientRect();
    const table = this.querySelector('table')?.getBoundingClientRect() ?? region;
    const room = Math.ceil(bottom - table.bottom);
    if (room > 0) {
      this.setHostStyle('--void-table-room', `${room}px`);
      // A region that scrolls vertically shows the overlay by scrolling to it.
      if (this.scrollHeight > this.clientHeight + room) this.scrollTop += Math.max(0, bottom - region.bottom);
    }
    if (right > region.right) this.scrollLeft += Math.ceil(right - region.right);
    else if (left < region.left) this.scrollLeft -= Math.ceil(region.left - left);
  }
}

if (!customElements.get('void-table')) {
  customElements.define('void-table', VoidTable);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-table': VoidTable;
  }
}
