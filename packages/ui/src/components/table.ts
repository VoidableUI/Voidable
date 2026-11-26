import type { ComplexAttributeConverter, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { InternalsFormControl, type FormSubmission, type FormValidityResult } from '../form-control.js';
import { actionFor } from '../keyboard.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { tableKeys } from '../keymaps/table.js';
import { localeOf, msg } from '../messages.js';

/** A list of row values in a `value` attribute: a JSON array; empty is no attribute at all (a plain table carries none). */
const rowValues: ComplexAttributeConverter<string[]> = {
  fromAttribute(attribute: string | null): string[] {
    if (attribute === null || attribute.trim() === '') return [];
    try {
      const parsed: unknown = JSON.parse(attribute);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Not JSON: one value.
    }
    return [attribute];
  },
  toAttribute(values: string[] | null | undefined): string | null {
    return values && values.length ? JSON.stringify(values) : null;
  },
};

type Direction = 'ascending' | 'descending';
type SortType = 'text' | 'number' | 'date';

/** One body row: its value, where the server put it, and what was read from it (all dropped when the markup changes). */
interface Row {
  el: HTMLTableRowElement;
  value: string;
  orig: number;
  cells: string[] | null;
  hay: string | null;
  haySig: string;
  key: number | string | null;
  keyCol: number;
  /** The row's checkbox (a void-checkbox or a native one), when the table is selectable. */
  box: HTMLElement | null;
}

interface Header {
  th: Element;
  key: string;
  type: SortType | null;
  /** Left out of a filter over every column (selection and action columns). */
  skip: boolean;
}

const BOX = 'void-checkbox, input[type="checkbox"]';

/** The state of a checkbox of either kind. */
const boxChecked = (b: HTMLElement): boolean => (b as HTMLInputElement).checked ?? b.hasAttribute('checked');
const boxDisabled = (b: HTMLElement): boolean => Boolean((b as HTMLInputElement).disabled ?? b.hasAttribute('disabled'));
function setBox(b: HTMLElement, checked: boolean, indeterminate = false): void {
  if ('checked' in b) {
    if ((b as HTMLInputElement).checked !== checked) (b as HTMLInputElement).checked = checked;
  } else b.toggleAttribute('checked', checked);
  if ('indeterminate' in b) {
    if ((b as HTMLInputElement).indeterminate !== indeterminate) (b as HTMLInputElement).indeterminate = indeterminate;
  } else b.toggleAttribute('indeterminate', indeterminate);
}

/** Case- and accent-insensitive form of text, for matching. */
const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const separators = new Map<string, { group: string; decimal: string }>();
/** The group and decimal separators a locale writes numbers with. */
function separatorsOf(locale: string): { group: string; decimal: string } {
  let s = separators.get(locale);
  if (!s) {
    s = { group: ',', decimal: '.' };
    try {
      for (const p of new Intl.NumberFormat(locale).formatToParts(-12345.6)) {
        if (p.type === 'group') s.group = p.value;
        else if (p.type === 'decimal') s.decimal = p.value;
      }
    } catch {
      // An unknown locale writes numbers as English does.
    }
    separators.set(locale, s);
  }
  return s;
}

/** A number as a reader of `locale` writes it ("1.234,5" in German, "1 234,5" in French, Arabic-Indic digits in Arabic). */
function parseNumber(raw: string, locale: string): number {
  const { group, decimal } = separatorsOf(locale);
  let s = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[\s  ]/g, '')
    .replace(/[−–]/g, '-');
  if (group.trim() !== '') s = s.split(group).join('');
  if (decimal !== '.') s = s.split(decimal).join('.');
  const n = Number(s);
  return Number.isNaN(n) ? Number.parseFloat(s.replace(/[^\d.+\-eE]/g, '')) : n;
}

/** A count as the reader's locale writes it (the number in a `data-count` element). */
function formatCount(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}

const collators = new Map<string, Intl.Collator>();
function collator(lang: string): Intl.Collator {
  let c = collators.get(lang);
  if (!c) {
    try {
      c = new Intl.Collator(lang || undefined, { numeric: true });
    } catch {
      c = new Intl.Collator(undefined, { numeric: true });
    }
    collators.set(lang, c);
  }
  return c;
}

/** How long typing in a filter field waits before the table filters (the one timer here: input debounce). */
const FILTER_DEBOUNCE = 150;

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
 * **Name.** A table needs a name: write a `<caption>` (the caption part; it can be visually hidden), or an
 * `aria-label` (or `label`) on the `<void-table>`, which the component copies onto the native `<table>`. `voidable check`
 * reports a `<void-table>` with neither (rule `missing-name`).
 *
 * **Overflow.** Nothing is clipped by default, so a menu, popover or tooltip opened from a cell is
 * always fully visible. `scrollable` makes the table its own horizontal scroll region: it is
 * focusable and labelled (`label`, else the `<caption>`, else `aria-label`) only while it actually
 * overflows, and fades its edges while there is more to scroll to. `max-height` makes the region
 * scroll vertically too, which is what `sticky-header` needs; without it a sticky header sticks to
 * the page.
 *
 * **Sorting.** `data-sort` on a header cell (`data-sort="number"` or `"date"`; text by default) makes the column
 * sortable: the component wraps the header's content in a `<button>`, writes `aria-sort` and, on activation,
 * cycles ascending, descending, none. A cell's `data-sort-value` is the value compared (ISO dates, raw numbers).
 * Text uses `Intl.Collator` for the closest `lang` with numeric collation; empty cells sort last in both
 * directions. One column at a time. `sort` is the column's `data-key` (else its index) and `sort-direction` its direction.
 *
 * **Filtering.** `filter` hides (with `hidden`) the body rows that do not contain every word, ignoring case and accents,
 * in all columns or in the `data-key`s of `filter-columns`. An author-written `<void-table-filter>` holding a search
 * input is wired to it (typing is debounced). A visually hidden live region says "N of M rows" and a
 * `<void-table-empty>` part shows while nothing matches.
 *
 * **Selection.** `selectable` (or `selectable="single"`) wires the checkboxes the author wrote in the rows (a
 * `void-checkbox` or a native one, in the `data-stack="select"` column) and in the header (select all, which acts
 * on the rows shown). Rows are identified by `data-value` (else their position). `value` is the selected row
 * values as a JSON array, submitted with the form when `name` is set. `<void-table-selection>` is shown while
 * anything is selected and `<void-table-select-all>` offers "all N rows" across server pages (`total-rows`,
 * `all-selected`).
 *
 * **Server mode.** `manual` leaves ordering, visibility and selection markup to the server: the table only
 * updates header state and fires the events.
 *
 * Shortcuts are opt-in: the `selectAll` key action has no default key, and `keys='{"selectAll":["Control+a","Meta+a"]}'` lets Ctrl or Cmd plus A inside the body select every shown row.
 *
 * @cssprop --void-table-max-height - Height at which a scrollable table starts scrolling vertically.
 * @fires {CustomEvent<{ column: string, direction: 'ascending' | 'descending' | 'none' }>} void-sort - A user activated a sortable header; cancelable.
 * @fires {CustomEvent<{ filter: string, shown: number, total: number }>} void-filter - The user changed the filter.
 * @fires {CustomEvent<{ value: string[], all: boolean }>} void-change - The user changed the selection.
 */
export class VoidTable extends InternalsFormControl(VoidElement) {
  /** Shade every other body row. */
  @property({ type: Boolean, reflect: true }) striped = false;
  /** Highlight the body row under the pointer. */
  @property({ type: Boolean, reflect: true }) hoverable = false;
  /** Reduce the padding of the cells for a denser table. */
  @property({ type: Boolean, reflect: true }) compact = false;
  /** Draw a border around every cell. */
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
  /** The key (`data-key` of the header cell, else its position) of the column the rows are sorted by. */
  @property({ type: String, reflect: true }) sort: string | null = null;
  /** Direction of the sort. A `sort` without it is ascending. */
  @property({ type: String, reflect: true, attribute: 'sort-direction' }) sortDirection: string | null = null;
  /** Hides the body rows that do not contain every whitespace-separated word, ignoring case and accents. */
  @property({ type: String, reflect: true }) filter: string | null = null;
  /** The `data-key`s (or positions), separated by spaces or commas, of the columns `filter` looks at. Default: every column. */
  @property({ type: String, reflect: true, attribute: 'filter-columns' }) filterColumns: string | null = null;
  /**
   * Wires the row checkboxes. Present without a value: any number of rows; `single`: one row at a time.
   */
  @property({ type: String, reflect: true }) selectable: string | null = null;
  /** The server renders order, visibility, `aria-sort` and selection; the table only fires its events and updates header state. */
  @property({ type: Boolean, reflect: true }) manual = false;
  /** How many rows there are in all, across the server's pages. Enables `<void-table-select-all>`. */
  @property({ type: Number, reflect: true, attribute: 'total-rows' }) totalRows: number | null = null;
  /** Every row across the server's pages is selected (the user activated the select-all part). The server applies the action to the full set. */
  @property({ type: Boolean, reflect: true, attribute: 'all-selected' }) allSelected = false;
  /** Key actions (JSON): `{"selectAll":["Control+a","Meta+a"]}` turns on select-all by keyboard, which has no default key. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = tableKeys;

  /** Selected row values: the component's own state, the single source of truth. */
  #selected = new Set<string>();
  #valueCache: string[] | null = null;
  #rows: Row[] | null = null;
  #byEl = new Map<Element, Row>();
  /** The rows in the order they are in the document. */
  #display: Row[] = [];
  #head: HTMLTableRowElement | null = null;
  #table: HTMLTableElement | null = null;
  #sortable = false;
  #dirty = true;
  #selDirty = true;
  #hiddenDirty = false;
  #sortSig = '';
  /** The locale the cached sort keys were read for. */
  #keyLocale = '';
  #filterSig = '';
  #adopted = false;
  #anchor: string | null = null;
  #shift = false;
  #ours = new WeakSet<Element>();
  #autoName = new WeakMap<Element, string>();
  #live: HTMLElement | null = null;
  #message: string | null = null;
  #debounce: ReturnType<typeof setTimeout> | null = null;
  #typing = false;
  #lastFilterShown = { shown: 0, total: 0 };

  #mutations: MutationObserver | null = null;
  #resize: ResizeObserver | null = null;
  #queued = false;
  #autoLabels = new WeakMap<Element, string>();
  #tableLabels = new WeakMap<Element, string>();
  /** Watches the host's own name, which no property reflects. */
  #nameWatch: MutationObserver | null = null;
  #autoStack = new WeakMap<Element, string>();
  #autoAlign = new WeakMap<Element, string>();
  #writtenLabel: string | null = null;
  #warned = false;
  #stackStyled = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#mutations ??= new MutationObserver((records) => this.#noticeMutations(records));
    this.#mutations.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'data-label', 'data-stack', 'data-align', 'role', 'colspan',
        'data-value', 'data-sort-value', 'data-key', 'data-sort', 'hidden', 'aria-selected', 'checked', 'disabled',
      ],
    });
    this.addEventListener('click', this.#onClickCapture, true);
    this.addEventListener('click', this.#onClick);
    this.addEventListener('change', this.#onChange);
    this.addEventListener('void-change', this.#onVoidChange);
    this.addEventListener('input', this.#onInput);
    this.addEventListener('keydown', this.#onKeydown);
    this.#dirty = true;
    this.#selDirty = true;
    this.#nameWatch ??= new MutationObserver(() => this.#schedule());
    this.#nameWatch.observe(this, { attributes: true, attributeFilter: ['aria-label'] });
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
    this.#nameWatch?.disconnect();
    this.#resize?.disconnect();
    this.removeEventListener('scroll', this.#onScroll);
    this.removeEventListener('click', this.#onClickCapture, true);
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('change', this.#onChange);
    this.removeEventListener('void-change', this.#onVoidChange);
    this.removeEventListener('input', this.#onInput);
    this.removeEventListener('keydown', this.#onKeydown);
    if (this.#debounce !== null) clearTimeout(this.#debounce);
    this.#debounce = null;
  }

  // ── Selection state (value) ───────────────────────────────────────────────

  /**
   * The values of the selected rows, as a list; the `value` attribute is the same list as a JSON array
   * (`value='["a","b"]'`), kept in step as the selection changes. Setting it selects those rows (it does not fire `void-change`).
   * Values that match no row are dropped when the rows are known.
   * @default []
   */
  @property({ converter: rowValues, reflect: true })
  get value(): string[] {
    if (this.#valueCache) return [...this.#valueCache];
    const rows = this.#rows;
    const list = rows && rows.length ? rows.filter((r) => this.#selected.has(r.value)).map((r) => r.value) : [...this.#selected];
    this.#valueCache = list;
    return [...list];
  }

  set value(values: string[]) {
    const list = Array.isArray(values) ? values.map(String) : [];
    this.#selected = new Set(list);
    this.#valueCache = null;
    this.#selDirty = true;
    this.requestUpdate('value', undefined);
  }

  /**
   * One entry per selected row. A table that is not `selectable` has nothing to submit: it is form-associated
   * (that is fixed per class, so it is listed in `form.elements` either way) but it adds no entry to the form.
   */
  protected formSubmission(): FormSubmission {
    return this.selectable === null ? null : this.value;
  }

  /** `required` means "select at least one row": it has no meaning on a table that is not `selectable`. */
  protected override formValidity(): FormValidityResult | null {
    return this.selectable === null ? null : super.formValidity();
  }

  /**
   * A morph may have reset what a row's checkbox shows or whether a row is hidden without any change a
   * mutation observer sees (a property): the component's own state is written again, nothing is read back.
   */
  protected override morphedCallback(): void {
    if (!this.#rows) return;
    this.#selDirty = true;
    this.#hiddenDirty = true;
    this.#schedule();
  }

  /** The server rendered a new `value` or `selectable`: re-apply it to the rows. */
  protected override serverChangedCallback(names: ReadonlySet<string>): void {
    super.serverChangedCallback(names);
    this.#selDirty = true;
    this.#schedule();
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
    // A filter set from outside (attribute, script, server) is shown in the field; what the user is typing is never overwritten.
    if (changed.has('filter') && !this.#typing) {
      const input = this.#filterInput();
      const text = this.filter ?? '';
      if (input && input.value !== text) input.value = text;
    }
    // A redraw with nothing changed is the language changing (the messages registry): sort and name for it.
    if (changed.size === 0) {
      this.#sortSig = '';
      this.#selDirty = true;
    }
    if (changed.has('sort') || changed.has('sortDirection')) this.#sortSig = '';
    if (changed.has('selectable') || changed.has('allSelected') || changed.has('totalRows')) this.#selDirty = true;
    this.#schedule();
  }

  #onScroll = (): void => this.#syncEdges();

  /** Coalesces every trigger (mutations, resizes, property changes) into one pass after layout. */
  #schedule(): void {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (!this.isConnected) return;
      this.#syncCells(this.stack !== null);
      this.#syncData();
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
    let primary: HTMLTableElement | null = null;
    let sortable = false;
    for (const table of this.querySelectorAll('table')) {
      if (table.closest('void-table') !== this) continue;
      primary ??= table;
      this.#syncName(table);
      if (stacked) this.#setRole(table);
      const headRow = this.#headerRow(table);
      const columns: Column[] = [];
      if (headRow) {
        for (const th of cellsOf(headRow)) {
          if (table === primary && th.hasAttribute('data-sort')) {
            sortable = true;
            this.#ensureSortButton(th);
          }
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
    this.#table = primary;
    this.#sortable = sortable;
    // Where a title or row checkbox is, the checkbox sits beside the title (CSS cannot ask a row what it holds cheaply).
    this.setHostAttribute('data-stack-title', title ? '' : null);
    this.setHostAttribute('data-stack-select', select ? '' : null);
    // A long table lets the browser skip the rows that are out of view while it stacks.
    this.setHostAttribute('data-long', rowCount > LONG_TABLE ? '' : null);
  }

  /**
   * Names the native table: by its `<caption>` (the caption part), by a name the author wrote on it, or by the
   * host's own `aria-label` or `label`, which a generic element cannot carry to a screen reader, so it is copied
   * onto the table (the host keeps it too, as the name of its scroll region).
   */
  #syncName(table: HTMLTableElement): void {
    const host = this.getAttribute('aria-label');
    const own = host !== null && host !== this.#writtenLabel && host.trim() !== '' ? host : null;
    const hostLabel = own ?? (this.label?.trim() ? this.label : null);
    const current = table.getAttribute('aria-label');
    const mine = this.#tableLabels.get(table);
    const authored = (current !== null && current !== mine) || table.hasAttribute('aria-labelledby') || table.querySelector(':scope > caption') !== null;
    if (hostLabel === null || authored) {
      if (mine !== undefined && current === mine) table.removeAttribute('aria-label');
      this.#tableLabels.delete(table);
      return;
    }
    if (current !== hostLabel) table.setAttribute('aria-label', hostLabel);
    this.#tableLabels.set(table, hostLabel);
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

  // ── Sorting, filtering and selection ──────────────────────────────────────

  /**
   * Records what an outside change touched, so the next pass reads again only what it must: the rows' text
   * and values (markup), or the rows' selection and visibility (attributes a morph can reset).
   */
  #noticeMutations(records: MutationRecord[]): void {
    const live = this.#live;
    for (const r of records) {
      const t = r.target;
      if (live && (t === live || live.contains(t))) continue;
      if (r.type === 'attributes') {
        const n = r.attributeName;
        if (n === 'data-value' || n === 'data-sort-value' || n === 'data-key' || n === 'data-sort') this.#dirty = true;
        else if (n === 'hidden') this.#hiddenDirty = true;
        else if (n === 'checked' || n === 'disabled' || n === 'aria-selected') this.#selDirty = true;
      } else {
        this.#dirty = true;
      }
    }
    this.#schedule();
  }

  /** Puts a real button around the content of a sortable header, unless the author wrote a control there. */
  #ensureSortButton(th: Element): void {
    if (!th.firstChild || th.querySelector('button, a[href], input, select, textarea, [role="button"]')) return;
    const button = this.ownerDocument.createElement('button');
    button.type = 'button';
    button.setAttribute('data-sort-button', '');
    button.append(...Array.from(th.childNodes));
    th.append(button);
  }

  #headers(head: HTMLTableRowElement): Header[] {
    return cellsOf(head).map((th, i) => {
      const type = th.getAttribute('data-sort');
      const stack = th.getAttribute('data-stack');
      return {
        th,
        key: th.getAttribute('data-key') ?? String(i),
        type: type === null ? null : type === 'number' || type === 'date' ? type : 'text',
        skip: stack === 'select' || stack === 'actions' || stack === 'hide',
      };
    });
  }

  #owns(el: Element): boolean {
    return el.closest('void-table') === this;
  }

  /** One coalesced pass over what the sort, filter and selection need: nothing at all for a table that uses none of them. */
  #syncData(): void {
    const table = this.#table;
    const parts = this.getElementsByTagName('void-table-filter');
    const filtering = !!this.filter?.trim();
    if (!table || !(this.#sortable || filtering || this.selectable !== null || parts.length > 0 || this.#rows)) return;
    const head = this.#headerRow(table);
    this.#head = head;
    const cols = head ? this.#headers(head) : [];
    if (this.#dirty || !this.#rows) this.#rebuild(table, head, cols);
    const rows = this.#rows!;
    this.#ensureLive();

    if (!this.manual) this.#applySort(rows, cols);
    const { shown, total } = this.#applyFilter(rows, cols);
    this.#lastFilterShown = { shown, total };

    for (const c of cols) {
      if (c.type === null) continue;
      const want = this.sort === c.key ? (this.sortDirection === 'descending' ? 'descending' : 'ascending') : 'none';
      if (c.th.getAttribute('aria-sort') !== want) c.th.setAttribute('aria-sort', want);
    }
    if (this.#selDirty) this.#paint();

    if (!this.manual) {
      for (const p of this.getElementsByTagName('void-table-empty')) {
        if (this.#owns(p)) this.#setHidden(p, shown !== 0);
      }
    }
    if (filtering || parts.length > 0) {
      const message = filtering && !this.manual ? msg(this, 'table.rowsShown', { shown, total }) : msg(this, 'table.rows', { count: shown });
      if (this.#message === null) this.#message = message;
      else if (message !== this.#message) {
        this.#message = message;
        this.#say(message);
      }
    }
  }

  #setHidden(el: Element, hidden: boolean): void {
    if ((el as HTMLElement).hidden !== hidden) (el as HTMLElement).hidden = hidden;
  }

  /** Reads the body rows again: their values, their order as the server rendered it, and their checkboxes. */
  #rebuild(table: HTMLTableElement, head: HTMLTableRowElement | null, cols: Header[]): void {
    const els = Array.from(table.querySelectorAll<HTMLTableRowElement>(':scope > tbody > tr, :scope > tr')).filter((r) => r !== head);
    const prev = this.#byEl;
    // The same rows as before keep the position the server gave them, even while the table shows them sorted.
    const same = !this.manual && this.#rows !== null && prev.size === els.length && els.every((e) => prev.has(e));
    const selectCol = this.selectable === null ? -2 : cols.findIndex((c) => c.th.getAttribute('data-stack') === 'select');
    const byEl = new Map<Element, Row>();
    const rows = els.map((el, i) => {
      const orig = same ? prev.get(el)!.orig : i;
      let box: HTMLElement | null = null;
      if (selectCol !== -2) box = (selectCol >= 0 ? cellsOf(el)[selectCol] : el)?.querySelector<HTMLElement>(BOX) ?? null;
      const row: Row = { el, value: el.getAttribute('data-value') ?? String(orig), orig, cells: null, hay: null, haySig: '\0', key: null, keyCol: -1, box };
      byEl.set(el, row);
      return row;
    });
    this.#display = [...rows];
    if (same) rows.sort((a, b) => a.orig - b.orig);
    this.#byEl = byEl;
    this.#rows = rows;
    this.#dirty = false;
    this.#sortSig = '';
    this.#filterSig = '';
    this.#selDirty = true;
    this.#valueCache = null;

    if (!rows.length) return;
    let changed = false;
    // A table the server rendered with checked boxes starts with that selection (once, and only when `value` says nothing).
    if (!this.#adopted && this.selectable !== null) {
      this.#adopted = true;
      if (!this.#selected.size && !this.hasAttribute('value')) {
        for (const r of rows) {
          if ((r.box && boxChecked(r.box)) || r.el.getAttribute('aria-selected') === 'true') {
            this.#selected.add(r.value);
            changed = true;
          }
        }
      }
    }
    // Rows that are gone (the server removed them) leave the selection, silently: nobody chose that.
    const known = new Set(rows.map((r) => r.value));
    for (const v of this.#selected) {
      if (!known.has(v)) {
        this.#selected.delete(v);
        changed = true;
      }
    }
    if (this.selectable === 'single' && this.#selected.size > 1) {
      const first = rows.find((r) => this.#selected.has(r.value))!;
      this.#selected = new Set([first.value]);
      changed = true;
    }
    if (changed) {
      this.#valueCache = null;
      this.requestUpdate('value', undefined);
    }
  }

  /** What a cell is compared by: its `data-sort-value`, else its text; null when empty (empty cells sort last). */
  #sortKey(row: Row, col: number, type: SortType): number | string | null {
    const cell = cellsOf(row.el)[col];
    if (!cell) return null;
    const authored = cell.getAttribute('data-sort-value');
    const raw = (authored ?? cell.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (raw === '') return null;
    if (type === 'number') {
      // A data-sort-value is machine-readable (1234.5); the text of a cell is written for the reader's locale (1.234,5).
      const n = authored !== null && !Number.isNaN(Number(raw)) ? Number(raw) : parseNumber(raw, localeOf(this));
      return Number.isNaN(n) ? null : n;
    }
    if (type === 'date') {
      const t = Date.parse(raw);
      return Number.isNaN(t) ? null : t;
    }
    return raw;
  }

  #applySort(rows: Row[], cols: Header[]): void {
    const col = this.sort === null ? -1 : cols.findIndex((c) => c.key === this.sort);
    const dir: Direction = this.sortDirection === 'descending' ? 'descending' : 'ascending';
    const sig = col < 0 ? 'none' : `${col}|${dir}`;
    if (sig === this.#sortSig) return;
    this.#sortSig = sig;
    let order = rows;
    if (col >= 0) {
      const type = cols[col]!.type ?? 'text';
      const locale = localeOf(this);
      const coll = collator(locale);
      // Numbers are read for the locale, so a change of language reads them again.
      const relocale = this.#keyLocale !== locale;
      this.#keyLocale = locale;
      for (const r of rows) {
        if (relocale || r.keyCol !== col) {
          r.key = this.#sortKey(r, col, type);
          r.keyCol = col;
        }
      }
      const sign = dir === 'ascending' ? 1 : -1;
      order = [...rows].sort((a, b) => {
        const ka = a.key;
        const kb = b.key;
        if (ka === null || kb === null) return ka === kb ? 0 : ka === null ? 1 : -1;
        const c = type === 'text' ? coll.compare(ka as string, kb as string) : (ka as number) - (kb as number);
        return c * sign;
      });
    }
    this.#place(order);
  }

  /** Puts the rows in the given order: detached and reattached in one go, keeping focus where it was. */
  #place(order: Row[]): void {
    const cur = this.#display;
    if (order.length === cur.length && order.every((r, i) => r === cur[i])) return;
    const active = this.ownerDocument.activeElement;
    const focused = active && this.contains(active) ? (active as HTMLElement) : null;
    const groups = new Map<Node, Row[]>();
    for (const r of order) {
      const parent = r.el.parentNode;
      if (!parent) continue;
      const list = groups.get(parent);
      if (list) list.push(r);
      else groups.set(parent, [r]);
    }
    for (const [parent, list] of groups) {
      const mover = parent as unknown as { moveBefore?: (node: Node, child: Node | null) => void };
      let moved = false;
      if (typeof mover.moveBefore === 'function') {
        // Moves keep the state of the elements in the rows (an open menu, focus).
        try {
          for (const r of list) mover.moveBefore(r.el, null);
          moved = true;
        } catch {
          moved = false;
        }
      }
      if (!moved) {
        const fragment = this.ownerDocument.createDocumentFragment();
        for (const r of list) fragment.appendChild(r.el);
        parent.appendChild(fragment);
      }
    }
    this.#display = order;
    if (focused && focused.isConnected && this.ownerDocument.activeElement !== focused) focused.focus({ preventScroll: true });
  }

  /** Hides the rows that do not match the filter (never removes them) and counts what is shown. */
  #applyFilter(rows: Row[], cols: Header[]): { shown: number; total: number } {
    if (this.manual) return { shown: rows.length, total: rows.length };
    const terms = fold(this.filter ?? '').split(/\s+/).filter(Boolean);
    const keys = (this.filterColumns ?? '').split(/[\s,]+/).filter(Boolean);
    const idx = keys.map((k) => cols.findIndex((c) => c.key === k)).filter((i) => i >= 0);
    const colSig = idx.join(',');
    const sig = `${terms.join(' ')}|${colSig}`;
    if (sig === this.#filterSig && !this.#hiddenDirty) return this.#lastFilterShown;
    let shown = 0;
    let total = 0;
    for (const r of rows) {
      const el = r.el;
      // A row the author hid is not ours to show, and is not counted.
      if (el.hidden && !this.#ours.has(el)) continue;
      total++;
      let match = true;
      if (terms.length) {
        r.cells ??= cellsOf(el).map((c) => fold(c.textContent ?? ''));
        if (r.haySig !== colSig) {
          r.hay = (idx.length ? idx.map((i) => r.cells![i] ?? '') : r.cells.filter((_, i) => !cols[i]?.skip)).join(' ');
          r.haySig = colSig;
        }
        const hay = r.hay!;
        for (const t of terms) {
          if (!hay.includes(t)) {
            match = false;
            break;
          }
        }
      }
      if (match) shown++;
      if (el.hidden === match) el.hidden = !match;
      if (match) this.#ours.delete(el);
      else this.#ours.add(el);
    }
    if (sig !== this.#filterSig) this.#selDirty = true;
    this.#filterSig = sig;
    this.#hiddenDirty = false;
    return { shown, total };
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  #disabledRow(r: Row): boolean {
    return r.el.hasAttribute('data-disabled') || (r.box !== null && boxDisabled(r.box));
  }

  /** The rows that select-all acts on: shown (not hidden by the filter or the server) and not disabled. */
  #shownRows(): Row[] {
    return this.#display.filter((r) => !r.el.hidden && !this.#disabledRow(r));
  }

  #headBox(): HTMLElement | null {
    return this.#head?.querySelector<HTMLElement>(BOX) ?? null;
  }

  /** Writes the selection into the rows, the header checkbox and the parts. Reads nothing back from them. */
  #paint(): void {
    this.#selDirty = false;
    const rows = this.#rows;
    if (!rows || this.selectable === null) return;
    const sel = this.#selected;
    for (const r of rows) {
      const on = sel.has(r.value);
      if (r.box) setBox(r.box, on);
      const as = on ? 'true' : 'false';
      if (r.el.getAttribute('aria-selected') !== as) r.el.setAttribute('aria-selected', as);
    }
    const shown = this.#shownRows();
    let count = 0;
    for (const r of shown) if (sel.has(r.value)) count++;
    const all = shown.length > 0 && count === shown.length;
    const headBox = this.selectable === 'single' ? null : this.#headBox();
    if (headBox) {
      setBox(headBox, all, !all && count > 0);
      const filtering = !!this.filter?.trim();
      const name = filtering ? msg(this, 'table.selectAllShown', { count: shown.length }) : msg(this, 'table.selectAll');
      const current = headBox.getAttribute('aria-label');
      const mine = this.#autoName.get(headBox);
      const authored = headBox.hasAttribute('aria-labelledby') || (current !== null && current !== mine);
      if (!authored) {
        if (current !== name) headBox.setAttribute('aria-label', name);
        this.#autoName.set(headBox, name);
      }
    }
    const total = this.value.length;
    const n = this.allSelected && this.totalRows !== null ? this.totalRows : total;
    const multiple = this.selectable !== 'single';
    const counted = formatCount(n, localeOf(this));
    for (const p of this.getElementsByTagName('void-table-selection')) {
      if (!this.#owns(p)) continue;
      this.#setHidden(p, n === 0);
      for (const c of p.querySelectorAll('[data-count]')) {
        if (c.textContent !== counted) c.textContent = counted;
      }
    }
    for (const p of this.getElementsByTagName('void-table-select-all')) {
      if (!this.#owns(p)) continue;
      this.#setHidden(p, !(multiple && this.totalRows !== null && this.totalRows > rows.length && all && !this.allSelected));
    }
  }

  /** The selection changed because the user did something: paint, announce once, fire `void-change` once. */
  #commit(): void {
    const wasAll = this.allSelected;
    if (wasAll) this.allSelected = false;
    this.#valueCache = null;
    this.requestUpdate('value', undefined);
    this.#paint();
    const value = this.value;
    this.#say(value.length ? msg(this, 'table.selected', { count: value.length }) : msg(this, 'table.noneSelected'));
    this.#mutations?.takeRecords();
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value, all: false } }));
  }

  #setShown(on: boolean): void {
    for (const r of this.#shownRows()) {
      if (on) this.#selected.add(r.value);
      else this.#selected.delete(r.value);
    }
    this.#anchor = null;
    this.#commit();
  }

  /** A row checkbox or the select-all checkbox changed. Returns whether it was one of the table's. */
  #boxChanged(box: HTMLElement): boolean {
    const tr = box.closest('tr');
    if (!tr || !this.#rows || tr.closest('table') !== this.#table || !this.#owns(tr)) return false;
    if (tr === this.#head) {
      if (this.#headBox() !== box) return false;
      if (this.selectable === 'single') {
        this.#selDirty = true;
        this.#paint();
        return true;
      }
      this.#setShown(boxChecked(box));
      return true;
    }
    const row = this.#byEl.get(tr);
    if (!row || row.box !== box) return false;
    const on = boxChecked(box);
    const shift = this.#shift;
    this.#shift = false;
    if (this.selectable === 'single') {
      this.#selected = new Set(on ? [row.value] : []);
    } else {
      let targets = [row];
      if (shift && this.#anchor !== null && this.#anchor !== row.value) {
        const visible = this.#display.filter((r) => !r.el.hidden);
        const a = visible.findIndex((r) => r.value === this.#anchor);
        const b = visible.indexOf(row);
        if (a >= 0 && b >= 0) targets = visible.slice(Math.min(a, b), Math.max(a, b) + 1).filter((r) => r === row || !this.#disabledRow(r));
      }
      for (const r of targets) {
        if (on) this.#selected.add(r.value);
        else this.#selected.delete(r.value);
      }
    }
    this.#anchor = row.value;
    this.#commit();
    return true;
  }

  #selectAcrossPages(): void {
    if (this.allSelected || this.totalRows === null) return;
    this.allSelected = true;
    this.#paint();
    this.#say(msg(this, 'table.allSelected', { count: this.totalRows }));
    this.#mutations?.takeRecords();
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value, all: true } }));
  }

  // ── Events ────────────────────────────────────────────────────────────────

  /** Shift is read on the press; the checkbox reports the change after it. */
  #onClickCapture = (e: MouseEvent): void => {
    this.#shift = e.shiftKey;
  };

  #onClick = (e: MouseEvent): void => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const th = t.closest('th[data-sort]');
    if (th && t.closest('button') && this.#owns(th) && th.closest('table') === this.#table) {
      this.#activateSort(th);
      return;
    }
    const part = t.closest('void-table-select-all');
    if (part && t.closest('button, [role="button"], a') && this.#owns(part)) this.#selectAcrossPages();
  };

  #activateSort(th: Element): void {
    const row = th.parentElement;
    const key = th.getAttribute('data-key') ?? String(row ? cellsOf(row).indexOf(th) : 0);
    const current = this.sort === key ? (this.sortDirection === 'descending' ? 'descending' : 'ascending') : 'none';
    const next = current === 'none' ? 'ascending' : current === 'ascending' ? 'descending' : 'none';
    const event = new CustomEvent('void-sort', { bubbles: true, composed: true, cancelable: true, detail: { column: key, direction: next } });
    if (!this.dispatchEvent(event)) return;
    this.sort = next === 'none' ? null : key;
    this.sortDirection = next === 'none' ? null : next;
    const name = (th.getAttribute('data-label') ?? th.textContent ?? '').replace(/\s+/g, ' ').trim();
    this.#say(next === 'none' ? msg(this, 'table.sortCleared', { column: name }) : msg(this, next === 'ascending' ? 'table.sortedAscending' : 'table.sortedDescending', { column: name }));
  }

  #onChange = (e: Event): void => {
    if (this.selectable === null) return;
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'checkbox' || t.closest('void-checkbox')) return;
    this.#boxChanged(t);
  };

  #onVoidChange = (e: Event): void => {
    const t = e.target;
    if (this.selectable === null || t === this || !(t instanceof HTMLElement) || t.tagName !== 'VOID-CHECKBOX') return;
    // A wired checkbox's change is the table's change, reported once below.
    if (this.#boxChanged(t)) e.stopImmediatePropagation();
  };

  #filterInput(): HTMLInputElement | null {
    const part = this.getElementsByTagName('void-table-filter')[0];
    return part?.querySelector('input') ?? null;
  }

  /** Typing in the filter part's field filters after a short pause. */
  #onInput = (e: Event): void => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    const part = t.closest('void-table-filter');
    if (!part || !this.#owns(part)) return;
    if (this.#debounce !== null) clearTimeout(this.#debounce);
    this.#debounce = setTimeout(() => {
      this.#debounce = null;
      const text = t.value.trim() === '' ? null : t.value;
      this.#typing = true;
      this.filter = text;
      void this.updateComplete.then(() => {
        this.#typing = false;
        this.#syncData();
        this.#mutations?.takeRecords();
        const { shown, total } = this.#lastFilterShown;
        this.dispatchEvent(new CustomEvent('void-filter', { bubbles: true, composed: true, detail: { filter: this.filter ?? '', shown, total } }));
      });
    }, FILTER_DEBOUNCE);
  };

  /**
   * The `selectAll` key action, which has no default key (an application binds one with `keys`): selects the rows
   * shown, only from the body, only when `selectable` allows many rows, never from a text field.
   */
  #onKeydown = (e: KeyboardEvent): void => {
    if (this.selectable === null || this.selectable === 'single') return;
    if (actionFor(this, e) !== 'selectAll') return;
    const t = e.target;
    if (!(t instanceof Element) || !t.closest('tbody') || t.closest('input:not([type="checkbox"]), textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    e.preventDefault();
    this.#setShown(true);
  };

  // ── Live region ───────────────────────────────────────────────────────────

  /** A visually hidden polite live region that exists before it has anything to say (the theme hides it). */
  #ensureLive(): HTMLElement {
    let live = this.#live;
    if (!live || live.parentNode !== this) {
      live = this.ownerDocument.createElement('span');
      live.setAttribute('data-void-announcer', 'table');
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      this.append(live);
      this.#live = live;
    }
    return live;
  }

  #say(text: string): void {
    const live = this.#ensureLive();
    // The same sentence twice is still news: a no-break space makes it a change.
    live.textContent = live.textContent === text ? `${text} ` : text;
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
}

if (!customElements.get('void-table')) {
  customElements.define('void-table', VoidTable);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-table': VoidTable;
  }
}
