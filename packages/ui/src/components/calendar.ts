import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { live } from 'lit/directives/live.js';
import { InternalsFormControl, type FormValidityResult } from '../form-control.js';
import { OverlayController } from '../overlay.js';
import { inlineKeys, uid } from '../keyboard.js';
import { useProjection } from '../projection.js';
import { localeOf, msg, nameHost } from '../messages.js';

useProjection();

/* ── Helpers ── */

function toDateParts(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
}

function toISO(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function today(): string {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function clampDate(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

function formatDisplay(iso: string, fmt: string): string {
  const parts = toDateParts(iso);
  if (!parts) return iso;
  const [y, m, d] = parts;
  return fmt
    .replace('YYYY', String(y).padStart(4, '0'))
    .replace('MM', String(m + 1).padStart(2, '0'))
    .replace('DD', String(d).padStart(2, '0'));
}

/**
 * Reads typed text as a date: ISO `YYYY-MM-DD` always, else the way `fmt` writes it (`YYYY`, `MM` and `DD` in
 * any order and with any separators; a one-digit month or day is fine). Null when it is not a real date.
 */
function parseDisplay(text: string, fmt: string): string | null {
  const trimmed = text.trim();
  const iso = toDateParts(trimmed);
  const fields: string[] = [];
  let pattern = '';
  for (const piece of fmt.split(/(YYYY|MM|DD)/)) {
    if (piece === 'YYYY') { fields.push('y'); pattern += '(\\d{4})'; }
    else if (piece === 'MM') { fields.push('m'); pattern += '(\\d{1,2})'; }
    else if (piece === 'DD') { fields.push('d'); pattern += '(\\d{1,2})'; }
    else pattern += piece.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/\s+/g, '\\s*');
  }
  let y: number, m: number, d: number;
  const hit = iso ? null : new RegExp(`^${pattern}$`).exec(trimmed);
  if (iso) [y, m, d] = [iso[0], iso[1] + 1, iso[2]];
  else if (hit && fields.length === 3 && new Set(fields).size === 3) {
    const at = (k: string) => Number(hit[fields.indexOf(k) + 1]);
    [y, m, d] = [at('y'), at('m'), at('d')];
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m - 1) || y < 100) return null;
  return toISO(y, m - 1, d);
}

/**
 * The day a week starts on, 0 (Sunday) to 6: the author's number when there is one, else what `Intl.Locale` says
 * for `locale` (`getWeekInfo()`, or the older `weekInfo` property; Monday is 1 and Sunday 7 there), else Sunday.
 */
function firstDayOf(locale: string, own: number | null): number {
  if (own !== null && Number.isFinite(own)) return ((Math.trunc(own) % 7) + 7) % 7;
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = typeof l.getWeekInfo === 'function' ? l.getWeekInfo() : l.weekInfo;
    if (info && Number.isInteger(info.firstDay)) return info.firstDay % 7;
  } catch {
    // An unknown tag or an engine without week information: Sunday.
  }
  return 0;
}

/** Gregorian names for a date, whatever calendar the locale prefers: the grid is Gregorian. */
function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, { ...options, calendar: 'gregory' });
  } catch {
    return new Intl.DateTimeFormat('en-US', options);
  }
}

/** Whole numbers in the digits of `locale`, without grouping. */
function numberFormat(locale: string): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, { useGrouping: false });
  } catch {
    return new Intl.NumberFormat('en-US', { useGrouping: false });
  }
}

/* ── VoidCalendar ── */

type CalendarView = 'days' | 'months' | 'years';

/** Date selection for booking flows, scheduling UIs, and form fields with locale-aware formatting and min/max constraints. */
export class VoidCalendar extends InternalsFormControl(VoidElement) {
  /**
   * Selected date as an ISO `YYYY-MM-DD` string. Empty means no selection. It is what the form submits
   * and the reset target; picking a day updates it and fires `void-change`.
   */
  @property({ type: String, reflect: true }) value = '';
  /** Earliest selectable date, as `YYYY-MM-DD`. Earlier days are disabled. */
  @property({ type: String }) min = '';
  /** Latest selectable date, as `YYYY-MM-DD`. Later days are disabled. */
  @property({ type: String }) max = '';
  /** Stop the calendar reacting and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * BCP 47 language tag for month and weekday names, the numbers and the long date announced for each day, such
   * as `de-DE`. Without it the calendar follows the closest `lang` (the page's included), and `en-US` where there
   * is none. Month and day names are always for the Gregorian calendar.
   */
  @property({ type: String }) locale = '';
  /**
   * Day the week starts on, as a number from 0 (Sunday) to 6 (Saturday). Use 1 for Monday. Without it the week
   * starts on the day the locale's week information gives (`Intl.Locale`), and on Sunday where the browser
   * does not provide it.
   */
  @property({ attribute: 'first-day', type: Number }) firstDay: number | null = null;

  /** The locale the calendar formats in: its `locale`, else the closest `lang`, else `en-US`. */
  private get _locale(): string {
    return localeOf(this, this.locale);
  }

  /** The first day of the week, 0 (Sunday) to 6: `first-day`, else the locale's, else Sunday. */
  private get _week(): number {
    return firstDayOf(this._locale, this.firstDay);
  }

  private _viewYear = 0;
  private _viewMonth = 0;
  private _view: CalendarView = 'days';
  private _focusDate = '';
  private _yearsPageStart = 0;
  private _didInit = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'group');
    this._name();
    if (!this._didInit) {
      this._didInit = true;
      this._initView();
    }
  }

  private _name(): void {
    nameHost(this, msg(this, 'calendar.label'), (n, v) => this.setHostAttribute(n, v));
  }

  updated(changed: Map<string, unknown>): void {
    this._name();
    super.updated(changed);
    if (changed.has('value')) {
      this._syncViewToValue();
    }
  }

  private _initView(): void {
    const parts = toDateParts(this.value);
    if (parts) {
      this._viewYear = parts[0];
      this._viewMonth = parts[1];
      this._focusDate = this.value;
    } else {
      const d = new Date();
      this._viewYear = d.getFullYear();
      this._viewMonth = d.getMonth();
      this._focusDate = today();
    }
    this._yearsPageStart = this._viewYear - (this._viewYear % 12);
  }

  private _syncViewToValue(): void {
    const parts = toDateParts(this.value);
    if (parts) {
      this._viewYear = parts[0];
      this._viewMonth = parts[1];
      this._focusDate = this.value;
      this._yearsPageStart = this._viewYear - (this._viewYear % 12);
      this.requestUpdate();
    }
  }

  render() {
    if (this._view === 'years') return this._renderYears();
    if (this._view === 'months') return this._renderMonths();
    return this._renderDays();
  }

  /* ── Day grid view ── */

  private _renderDays() {
    const dayNames = this._getDayNames();
    const cells = this._buildDayCells();
    const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
    const nf = numberFormat(this._locale);
    const fullDate = dateFormat(this._locale, { dateStyle: 'full' });
    const monthLabel = dateFormat(this._locale, { month: 'long', year: 'numeric' }).format(new Date(this._viewYear, this._viewMonth, 1));

    return html`
      <div class="void-calendar-header">
        <button
          type="button"
          class="void-calendar-nav"
          aria-label=${msg(this, 'calendar.previousMonth')}
          ?disabled=${this.disabled}
          @click=${this._prevMonth}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <button
          type="button"
          class="void-calendar-title"
          aria-label=${msg(this, 'calendar.chooseMonth')}
          ?disabled=${this.disabled}
          @click=${this._showMonths}
        >${monthLabel}</button>
        <button
          type="button"
          class="void-calendar-nav"
          aria-label=${msg(this, 'calendar.nextMonth')}
          ?disabled=${this.disabled}
          @click=${this._nextMonth}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <div class="void-calendar-grid" role="grid" aria-label="${monthLabel}" @keydown=${this._onDayKeydown}>
        <div class="void-calendar-weekdays" role="row">
          ${dayNames.map(n => html`<div class="void-calendar-weekday" role="columnheader" aria-label=${n.long}>${n.short}</div>`)}
        </div>
        <div class="void-calendar-days" role="rowgroup">
          ${weeks.map(week => html`
            <div class="void-calendar-week" role="row">
              ${week.map(cell => {
                const isSelected = cell.iso === this.value;
                const isToday = cell.iso === today();
                const isDisabled = this.disabled || cell.disabled;
                return html`
                  <div class="void-calendar-cell" role="gridcell" aria-selected=${isSelected ? 'true' : 'false'}>
                    <button
                      type="button"
                      class="void-calendar-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}${cell.outside ? ' outside' : ''}"
                      ?disabled=${isDisabled}
                      aria-label=${this._formatFullDate(cell.iso, fullDate)}
                      aria-current=${isToday ? 'date' : nothing}
                      tabindex=${cell.iso === this._focusDate ? '0' : '-1'}
                      data-date=${cell.iso}
                      @click=${() => this._selectDate(cell.iso)}
                    >${nf.format(cell.day)}</button>
                  </div>
                `;
              })}
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _formatFullDate(iso: string, fmt: Intl.DateTimeFormat): string {
    const p = toDateParts(iso);
    if (!p) return iso;
    try {
      return fmt.format(new Date(p[0], p[1], p[2]));
    } catch {
      return iso;
    }
  }

  private _getDayNames(): Array<{ short: string; long: string }> {
    const fmt = dateFormat(this._locale, { weekday: 'short' });
    const longFmt = dateFormat(this._locale, { weekday: 'long' });
    const names: Array<{ short: string; long: string }> = [];
    // Jan 2024 starts on Monday — use a known Sunday: Jan 7 2024
    for (let i = 0; i < 7; i++) {
      const d = new Date(2024, 0, 7 + ((this._week + i) % 7));
      names.push({ short: fmt.format(d), long: longFmt.format(d) });
    }
    return names;
  }


  private _buildDayCells(): Array<{ day: number; iso: string; outside: boolean; disabled: boolean }> {
    const y = this._viewYear;
    const m = this._viewMonth;
    const total = daysInMonth(y, m);
    const firstDow = new Date(y, m, 1).getDay();
    const offset = (firstDow - this._week + 7) % 7;
    const cells: Array<{ day: number; iso: string; outside: boolean; disabled: boolean }> = [];

    // Previous month padding
    const prevM = m === 0 ? 11 : m - 1;
    const prevY = m === 0 ? y - 1 : y;
    const prevTotal = daysInMonth(prevY, prevM);
    for (let i = offset - 1; i >= 0; i--) {
      const d = prevTotal - i;
      const iso = toISO(prevY, prevM, d);
      cells.push({ day: d, iso, outside: true, disabled: this._isOutOfRange(iso) });
    }

    // Current month
    for (let d = 1; d <= total; d++) {
      const iso = toISO(y, m, d);
      cells.push({ day: d, iso, outside: false, disabled: this._isOutOfRange(iso) });
    }

    // Next month padding (fill to 42 cells = 6 rows)
    const nextM = m === 11 ? 0 : m + 1;
    const nextY = m === 11 ? y + 1 : y;
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const iso = toISO(nextY, nextM, d);
      cells.push({ day: d, iso, outside: true, disabled: this._isOutOfRange(iso) });
    }

    return cells;
  }

  private _isOutOfRange(iso: string): boolean {
    if (this.min && iso < this.min) return true;
    if (this.max && iso > this.max) return true;
    return false;
  }

  /* ── Month picker view ── */

  private _renderMonths() {
    const fmt = dateFormat(this._locale, { month: 'short' });
    const months = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      name: fmt.format(new Date(2024, i, 1)),
    }));

    return html`
      <div class="void-calendar-header">
        <button
          type="button"
          class="void-calendar-nav"
          aria-label=${msg(this, 'calendar.previousYear')}
          ?disabled=${this.disabled}
          @click=${this._prevYear}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <button
          type="button"
          class="void-calendar-title"
          aria-label=${msg(this, 'calendar.chooseYear')}
          ?disabled=${this.disabled}
          @click=${this._showYears}
        >${numberFormat(this._locale).format(this._viewYear)}</button>
        <button
          type="button"
          class="void-calendar-nav"
          aria-label=${msg(this, 'calendar.nextYear')}
          ?disabled=${this.disabled}
          @click=${this._nextYear}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <div class="void-calendar-months">
        ${months.map(m => {
          const isCurrent = m.index === this._viewMonth && this._viewYear === new Date().getFullYear();
          return html`
            <button
              type="button"
              class="void-calendar-month${isCurrent ? ' current' : ''}"
              ?disabled=${this.disabled}
              @click=${() => this._pickMonth(m.index)}
            >${m.name}</button>
          `;
        })}
      </div>
    `;
  }

  /* ── Year picker view ── */

  private _renderYears() {
    const start = this._yearsPageStart;
    const years = Array.from({ length: 12 }, (_, i) => start + i);
    const currentYear = new Date().getFullYear();

    return html`
      <div class="void-calendar-header">
        <button
          type="button"
          class="void-calendar-nav"
          aria-label=${msg(this, 'calendar.previousYears')}
          ?disabled=${this.disabled}
          @click=${this._prevYearsPage}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <span class="void-calendar-title void-calendar-title--static">${numberFormat(this._locale).format(start)} – ${numberFormat(this._locale).format(start + 11)}</span>
        <button
          type="button"
          class="void-calendar-nav"
          aria-label=${msg(this, 'calendar.nextYears')}
          ?disabled=${this.disabled}
          @click=${this._nextYearsPage}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <div class="void-calendar-years">
        ${years.map(y => html`
          <button
            type="button"
            class="void-calendar-year${y === currentYear ? ' current' : ''}"
            ?disabled=${this.disabled}
            @click=${() => this._pickYear(y)}
          >${numberFormat(this._locale).format(y)}</button>
        `)}
      </div>
    `;
  }

  /* ── Navigation ── */

  private _prevMonth = (): void => {
    if (this._viewMonth === 0) {
      this._viewMonth = 11;
      this._viewYear--;
    } else {
      this._viewMonth--;
    }
    this._syncFocusToView();
    this.requestUpdate();
  };

  private _nextMonth = (): void => {
    if (this._viewMonth === 11) {
      this._viewMonth = 0;
      this._viewYear++;
    } else {
      this._viewMonth++;
    }
    this._syncFocusToView();
    this.requestUpdate();
  };

  private _prevYear = (): void => {
    this._viewYear--;
    this.requestUpdate();
  };

  private _nextYear = (): void => {
    this._viewYear++;
    this.requestUpdate();
  };

  private _prevYearsPage = (): void => {
    this._yearsPageStart -= 12;
    this.requestUpdate();
  };

  private _nextYearsPage = (): void => {
    this._yearsPageStart += 12;
    this.requestUpdate();
  };

  private _showMonths = (): void => {
    this._view = 'months';
    this.requestUpdate();
  };

  private _showYears = (): void => {
    this._yearsPageStart = this._viewYear - (this._viewYear % 12);
    this._view = 'years';
    this.requestUpdate();
  };

  private _pickMonth(m: number): void {
    this._viewMonth = m;
    this._view = 'days';
    this._syncFocusToView();
    this.requestUpdate();
  }

  /** Move the roving-tabindex day into the visible month, keeping the day-of-month where possible. */
  private _syncFocusToView(): void {
    const p = toDateParts(this._focusDate) ?? [this._viewYear, this._viewMonth, 1];
    const day = Math.min(p[2], daysInMonth(this._viewYear, this._viewMonth));
    this._focusDate = clampDate(
      toISO(this._viewYear, this._viewMonth, day),
      this.min || undefined,
      this.max || undefined,
    );
  }

  private _pickYear(y: number): void {
    this._viewYear = y;
    this._yearsPageStart = y - (y % 12);
    this._view = 'months';
    this.requestUpdate();
  }

  /* ── Selection ── */

  private _selectDate(iso: string): void {
    if (this.disabled || this._isOutOfRange(iso)) return;
    this.value = iso;
    this._focusDate = iso;
    const parts = toDateParts(iso)!;
    this._viewYear = parts[0];
    this._viewMonth = parts[1];
    this._view = 'days';
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: iso, date: new Date(parts[0], parts[1], parts[2]) },
    }));
  }

  /* ── Keyboard navigation ── */

  private _onDayKeydown = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    const target = e.target as HTMLElement;
    const currentDate = target.getAttribute('data-date');
    if (!currentDate) return;

    const parts = toDateParts(currentDate);
    if (!parts) return;

    const [y, m] = parts;
    let d = parts[2];
    let handled = true;
    let newBase: Date | null = null;

    switch (e.key) {
      case inlineKeys(this).prev:
        d--;
        break;
      case inlineKeys(this).next:
        d++;
        break;
      case 'ArrowUp':
        d -= 7;
        break;
      case 'ArrowDown':
        d += 7;
        break;
      case 'Home':
        d -= (new Date(y, m, d).getDay() - this._week + 7) % 7;
        break;
      case 'End':
        d += 6 - ((new Date(y, m, d).getDay() - this._week + 7) % 7);
        break;
      case 'PageUp':
      case 'PageDown': {
        const delta = e.key === 'PageUp' ? -1 : 1;
        const target = e.shiftKey ? new Date(y + delta, m, 1) : new Date(y, m + delta, 1);
        d = Math.min(d, daysInMonth(target.getFullYear(), target.getMonth()));
        newBase = target;
        break;
      }
      case 'Enter':
      case ' ':
        this._selectDate(currentDate);
        e.preventDefault();
        return;
      default:
        handled = false;
    }

    if (!handled) return;
    e.preventDefault();

    const newDate = newBase ? new Date(newBase.getFullYear(), newBase.getMonth(), d) : new Date(y, m, d);
    const newISO = toISO(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    const clamped = clampDate(newISO, this.min || undefined, this.max || undefined);
    this._focusDate = clamped;

    const clampedParts = toDateParts(clamped);
    if (clampedParts) {
      this._viewYear = clampedParts[0];
      this._viewMonth = clampedParts[1];
    }

    this.requestUpdate();
    this.updateComplete.then(() => {
      const btn = this.querySelector(`[data-date="${clamped}"]`) as HTMLElement | null;
      btn?.focus();
    });
  };
}

if (!customElements.get('void-calendar')) {
  customElements.define('void-calendar', VoidCalendar);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-calendar': VoidCalendar;
  }
}

/* ── VoidDatePicker ── */

/**
 * Input-anchored date picker that combines a text field with a VoidCalendar dropdown for form date selection.
 *
 * The calendar opens in a non-modal popup dialog in the top layer, placed under the input with CSS anchor
 * positioning (flipping above near the bottom of the viewport). A click on the field opens it and leaves focus
 * in the field (ArrowDown then moves into the calendar); the calendar button, Enter, Space or ArrowDown on the
 * field open it with focus on the selected (or current) day. Choosing a day, Escape, or a press outside closes
 * it and focus returns to the input.
 *
 * The field also takes a typed date, in `format` or as ISO `YYYY-MM-DD`: it is read when the field loses focus
 * and on Enter, the calendar follows, and `void-change` fires once with the ISO value. A date that is not a date,
 * or is before `min` or after `max`, is refused: the text stays for correction, `error` explains it, the field
 * is `aria-invalid` and described by the message, and the form is not submitted (`badInput`, `rangeUnderflow` or
 * `rangeOverflow`). An empty field clears the value.
 *
 * @fires {CustomEvent<{ reason: 'trigger' | 'focus' | 'keyboard' | 'api' }>} void-open - The calendar popup
 * opened: `trigger` from the calendar button, `focus` from a click on the field, `keyboard` from a key.
 * @fires {CustomEvent<{ reason: 'trigger' | 'select' | 'escape' | 'outside' | 'blur' | 'parent' | 'api' }>} void-close -
 * The calendar popup is closing. Cancelable when the user caused it.
 */
export class VoidDatePicker extends InternalsFormControl(VoidElement) {
  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = '.void-date-picker-input';

  /**
   * Selected date as an ISO `YYYY-MM-DD` string, whatever `format` shows. It is what the form submits
   * and the reset target.
   */
  @property({ type: String, reflect: true }) value = '';
  /** Earliest selectable date, as `YYYY-MM-DD`. */
  @property({ type: String }) min = '';
  /** Latest selectable date, as `YYYY-MM-DD`. */
  @property({ type: String }) max = '';
  /** Stop the field and its calendar reacting and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * BCP 47 language tag for the calendar's month and weekday names and numbers, such as `de-DE`. Without it the
   * calendar follows the closest `lang`, and `en-US` where there is none. It does not change `format`.
   */
  @property({ type: String }) locale = '';
  /** Day the calendar week starts on, as a number from 0 (Sunday) to 6 (Saturday). Without it, the locale's first day of the week, else Sunday. */
  @property({ attribute: 'first-day', type: Number }) firstDay: number | null = null;
  /** Whether the calendar dropdown is showing. Clicking the field or button toggles it; Escape closes it. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Hint shown in the field while no date is chosen. Defaults to the `datePicker.placeholder` message (English: `Select date`). */
  @property({ type: String }) placeholder = '';
  private get _hint(): string { return this.placeholder || msg(this, 'datePicker.placeholder'); }
  /**
   * How the date is written in the field, using `YYYY`, `MM` and `DD`. Defaults to `MM/DD/YYYY`. A date
   * typed into the field is read the same way (and as ISO `YYYY-MM-DD` always); the value stays `YYYY-MM-DD`.
   */
  @property({ type: String }) format = 'MM/DD/YYYY';
  /** Status colour of the field: `default`, `error`, `warning`, `caution`, `success`, `info`, `notice` or `highlight`. */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /**
   * Mark the field invalid: it gets the error styling and `aria-invalid`. Set it for a server-side message;
   * the field also sets it itself, with the reason, when a typed date is not taken, and clears what it set
   * once a valid date is typed or picked. A message you set is left alone.
   */
  @property({ type: String, reflect: true }) error = '';

  /** Text typed and not committed yet; null while the field shows `value`. Survives re-renders and morphs until committed. */
  private _draft: string | null = null;
  /** Why the committed text was refused, as the browser's validity reports it; null when it was taken. */
  private _rejected: { flags: ValidityStateFlags; message: string } | null = null;
  /** The message this field wrote into `error`, so one the author wrote is told apart from it. */
  private _ownError = '';
  private readonly _errorId = uid('void-date-picker-error');

  /** The typed text is the field's own to keep: a server patch of `value` discards it, any other morph does not. */
  static override clientState = { _draft: 'value' };
  /** While focus is inside, a morph does not apply the server's value over the date the user is typing. */
  static override editState = ['value'];

  /** The calendar popup, controlled by the input (APG date picker combobox). */
  private readonly _dropdownId = uid('void-date-picker-dialog');
  protected readonly _overlay = new OverlayController(this, {
    kind: 'dialog',
    surface: () => this.querySelector<HTMLElement>(':scope > .void-date-picker-dropdown'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => this.querySelector<HTMLElement>(':scope > .void-date-picker-anchor > .void-date-picker-input'),
    anchor: () => this.querySelector(':scope > .void-date-picker-anchor'),
    // The calendar button and the keyboard move focus into the calendar; a
    // click on the field itself opens it and leaves focus in the field.
    initialFocus: reason => {
      if (reason === 'trigger' || reason === 'keyboard') void this._focusDay();
      return false;
    },
  });

  /** Focus the calendar's roving day once it has rendered. */
  private async _focusDay(): Promise<void> {
    const calendar = this.querySelector<VoidCalendar>(':scope > .void-date-picker-dropdown > void-calendar');
    if (!calendar) return;
    await calendar.updateComplete;
    if (!this.open) return;
    calendar.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true });
  }

  render() {
    const display = this.value ? formatDisplay(this.value, this.format) : '';
    const message = this._rejected && this.error === this._ownError ? this.error : '';
    return html`
      <div class="void-date-picker-anchor">
        <input
          class="void-date-picker-input"
          .value=${live(this._draft ?? display)}
          placeholder=${this._hint}
          ?disabled=${this.disabled}
          autocomplete="off"
          role="combobox"
          aria-label=${this._hint}
          aria-haspopup="dialog"
          aria-expanded=${String(this.open)}
          aria-controls=${this._dropdownId}
          aria-invalid=${this.error ? 'true' : nothing}
          aria-describedby=${message ? this._errorId : nothing}
          @input=${this._onInput}
          @blur=${this._commit}
          @click=${this._onInputClick}
          @keydown=${this._onInputKeydown}
        />
        <button
          type="button"
          class="void-date-picker-icon"
          aria-label=${msg(this, 'datePicker.toggle')}
          ?disabled=${this.disabled}
          tabindex="-1"
          @click=${this._toggle}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </div>
      ${message ? html`<span class="void-date-picker-error" id=${this._errorId} role="alert">${message}</span>` : nothing}
      ${this.open ? html`
        <div class="void-date-picker-dropdown" id=${this._dropdownId} role="dialog" aria-label=${msg(this, 'datePicker.dialog')} popover="manual">
          <void-calendar
            value=${this.value}
            min=${this.min}
            max=${this.max}
            ?disabled=${this.disabled}
            size=${this.size}
            locale=${this.locale || nothing}
            first-day=${this.firstDay ?? nothing}
            @void-change=${this._onCalendarChange}
          ></void-calendar>
        </div>
      ` : nothing}
    `;
  }

  private _toggle = (): void => {
    if (this.disabled) return;
    this._overlay.toggle('trigger');
  };

  private _onInputClick = (): void => {
    if (this.disabled) return;
    this._overlay.toggle('focus');
  };

  /** What the field shows for the committed value. */
  private get _display(): string {
    return this.value ? formatDisplay(this.value, this.format) : '';
  }

  private _onInput = (e: Event): void => {
    this._draft = (e.target as HTMLInputElement).value;
  };

  /** Takes the typed text: a date in `format` or ISO sets the value, anything else is refused and kept for correction. */
  private _commit = (): void => {
    if (this._draft === null || this.disabled) return;
    const text = this._draft.trim();
    if (text === this._display) {
      this._draft = null;
      this._accept();
      return;
    }
    if (text === '') {
      this._draft = null;
      this._accept();
      this._setTyped('');
      return;
    }
    const iso = parseDisplay(text, this.format);
    const flags: ValidityStateFlags | null = !iso ? { badInput: true }
      : this.min && iso < this.min ? { rangeUnderflow: true }
      : this.max && iso > this.max ? { rangeOverflow: true }
      : null;
    if (flags || !iso) {
      const message = flags?.rangeUnderflow ? msg(this, 'datePicker.tooEarly', { date: formatDisplay(this.min, this.format) })
        : flags?.rangeOverflow ? msg(this, 'datePicker.tooLate', { date: formatDisplay(this.max, this.format) })
        : msg(this, 'datePicker.invalid', { format: this.format });
      this._rejected = { flags: flags ?? { badInput: true }, message };
      if (!this.error || this.error === this._ownError) {
        this.error = message;
        this._ownError = message;
      }
      this.requestUpdate();
      return;
    }
    this._draft = null;
    this._accept();
    this._setTyped(iso);
  };

  /** The text was taken (or discarded): no refusal, and the error the field wrote itself goes. */
  private _accept(rerender = true): void {
    this._rejected = null;
    if (this._ownError && this.error === this._ownError) this.error = '';
    this._ownError = '';
    if (rerender) this.requestUpdate();
  }

  /** A date typed in: keeps the calendar in step through `value`, fires `void-change` once, and closes the calendar. */
  private _setTyped(iso: string): void {
    if (iso === this.value) return;
    this.value = iso;
    const parts = toDateParts(iso);
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: iso, date: parts ? new Date(parts[0], parts[1], parts[2]) : null },
    }));
  }

  protected override formValidity(): FormValidityResult | null {
    if (this._rejected) {
      return {
        flags: this._rejected.flags,
        message: this._rejected.message,
        anchor: this.querySelector<HTMLElement>('.void-date-picker-input') ?? undefined,
      };
    }
    return super.formValidity();
  }

  protected override formRestore(state: unknown): void {
    this._draft = null;
    this._accept();
    super.formRestore(state);
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    // Another value arrived (a script, or the server once focus left): what was typed is gone with it, as it is
    // in a native field whose value is set, and so is the refusal. The field's own commits clear the draft first.
    if (changed.has('value')) {
      this._draft = null;
      if (this._rejected) this._accept(false);
    }
  }

  private _onCalendarChange = (e: CustomEvent): void => {
    e.stopPropagation();
    this._draft = null;
    this._accept();
    this.value = e.detail.value;
    this._overlay.requestClose('select');
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: e.detail,
    }));
  };

  private _onInputKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && this._draft !== null && this._draft.trim() !== this._display) {
      // Text was typed: Enter takes it (it does not open the calendar).
      e.preventDefault();
      this._commit();
      if (!this._rejected && this.open) this._overlay.requestClose('select');
    } else if (e.key === 'Enter' || (e.key === ' ' && this._draft === null)) {
      e.preventDefault();
      if (!this.disabled) this._overlay.toggle('keyboard');
    } else if (e.key === 'ArrowDown' && !this.disabled) {
      // Into the calendar, opening it if a click on the field left it open with focus here.
      e.preventDefault();
      if (this.open) void this._focusDay();
      else this._overlay.requestOpen('keyboard');
    }
  };
}

if (!customElements.get('void-date-picker')) {
  customElements.define('void-date-picker', VoidDatePicker);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-date-picker': VoidDatePicker;
  }
}
