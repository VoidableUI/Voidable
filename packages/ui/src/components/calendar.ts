import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { live } from 'lit/directives/live.js';
import { InternalsFormControl } from '../form-control.js';
import { OverlayController } from '../overlay.js';
import { uid } from '../keyboard.js';

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

/* ── VoidCalendar ── */

type CalendarView = 'days' | 'months' | 'years';

/** Date selection for booking flows, scheduling UIs, and form fields with locale-aware formatting and min/max constraints. */
export class VoidCalendar extends InternalsFormControl(VoidElement) {
  @property({ type: String, reflect: true }) value = '';
  @property({ type: String }) min = '';
  @property({ type: String }) max = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String }) locale = 'en-US';
  @property({ attribute: 'first-day', type: Number }) firstDay = 0;

  private _viewYear = 0;
  private _viewMonth = 0;
  private _view: CalendarView = 'days';
  private _focusDate = '';
  private _yearsPageStart = 0;
  private _didInit = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'group');
    this.setHostAttribute('aria-label', 'Calendar');
    if (!this._didInit) {
      this._didInit = true;
      this._initView();
    }
  }

  updated(changed: Map<string, unknown>): void {
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
    const monthLabel = this._getMonthName(this._viewMonth);

    return html`
      <div class="void-calendar-header">
        <button
          type="button"
          class="void-calendar-nav"
          aria-label="Previous month"
          ?disabled=${this.disabled}
          @click=${this._prevMonth}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <button
          type="button"
          class="void-calendar-title"
          aria-label="Switch to month picker"
          ?disabled=${this.disabled}
          @click=${this._showMonths}
        >${monthLabel} ${this._viewYear}</button>
        <button
          type="button"
          class="void-calendar-nav"
          aria-label="Next month"
          ?disabled=${this.disabled}
          @click=${this._nextMonth}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <div class="void-calendar-grid" role="grid" aria-label="${monthLabel} ${this._viewYear}" @keydown=${this._onDayKeydown}>
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
                      aria-label=${this._formatFullDate(cell.iso)}
                      aria-current=${isToday ? 'date' : nothing}
                      tabindex=${cell.iso === this._focusDate ? '0' : '-1'}
                      data-date=${cell.iso}
                      @click=${() => this._selectDate(cell.iso)}
                    >${cell.day}</button>
                  </div>
                `;
              })}
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _formatFullDate(iso: string): string {
    const p = toDateParts(iso);
    if (!p) return iso;
    try {
      return new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(new Date(p[0], p[1], p[2]));
    } catch {
      return iso;
    }
  }

  private _getDayNames(): Array<{ short: string; long: string }> {
    const fmt = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });
    const longFmt = new Intl.DateTimeFormat(this.locale, { weekday: 'long' });
    const names: Array<{ short: string; long: string }> = [];
    // Jan 2024 starts on Monday — use a known Sunday: Jan 7 2024
    for (let i = 0; i < 7; i++) {
      const d = new Date(2024, 0, 7 + ((this.firstDay + i) % 7));
      names.push({ short: fmt.format(d), long: longFmt.format(d) });
    }
    return names;
  }

  private _getMonthName(m: number): string {
    return new Intl.DateTimeFormat(this.locale, { month: 'long' }).format(new Date(2024, m, 1));
  }

  private _buildDayCells(): Array<{ day: number; iso: string; outside: boolean; disabled: boolean }> {
    const y = this._viewYear;
    const m = this._viewMonth;
    const total = daysInMonth(y, m);
    const firstDow = new Date(y, m, 1).getDay();
    const offset = (firstDow - this.firstDay + 7) % 7;
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
    const fmt = new Intl.DateTimeFormat(this.locale, { month: 'short' });
    const months = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      name: fmt.format(new Date(2024, i, 1)),
    }));

    return html`
      <div class="void-calendar-header">
        <button
          type="button"
          class="void-calendar-nav"
          aria-label="Previous year"
          ?disabled=${this.disabled}
          @click=${this._prevYear}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <button
          type="button"
          class="void-calendar-title"
          aria-label="Switch to year picker"
          ?disabled=${this.disabled}
          @click=${this._showYears}
        >${this._viewYear}</button>
        <button
          type="button"
          class="void-calendar-nav"
          aria-label="Next year"
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
          aria-label="Previous years"
          ?disabled=${this.disabled}
          @click=${this._prevYearsPage}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <span class="void-calendar-title void-calendar-title--static">${start} – ${start + 11}</span>
        <button
          type="button"
          class="void-calendar-nav"
          aria-label="Next years"
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
          >${y}</button>
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
      case 'ArrowLeft':
        d--;
        break;
      case 'ArrowRight':
        d++;
        break;
      case 'ArrowUp':
        d -= 7;
        break;
      case 'ArrowDown':
        d += 7;
        break;
      case 'Home':
        d -= (new Date(y, m, d).getDay() - this.firstDay + 7) % 7;
        break;
      case 'End':
        d += 6 - ((new Date(y, m, d).getDay() - this.firstDay + 7) % 7);
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
 * positioning (flipping above near the bottom of the viewport). Opening it from the input moves focus to the
 * selected (or current) day; choosing a day, Escape, or a press outside closes it and focus returns to the input.
 *
 * @fires {CustomEvent<{ reason: 'trigger' | 'api' }>} void-open - The calendar popup opened.
 * @fires {CustomEvent<{ reason: 'trigger' | 'select' | 'escape' | 'outside' | 'blur' | 'parent' | 'api' }>} void-close -
 * The calendar popup is closing. Cancelable when the user caused it.
 */
export class VoidDatePicker extends InternalsFormControl(VoidElement) {
  @property({ type: String, reflect: true }) value = '';
  @property({ type: String }) min = '';
  @property({ type: String }) max = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String }) locale = 'en-US';
  @property({ attribute: 'first-day', type: Number }) firstDay = 0;
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) placeholder = 'Select date';
  @property({ type: String }) format = 'MM/DD/YYYY';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';

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
    initialFocus: reason => {
      if (reason !== 'api') void this._focusDay();
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
    return html`
      <div class="void-date-picker-anchor">
        <input
          class="void-date-picker-input"
          .value=${live(display)}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          readonly
          role="combobox"
          aria-label=${this.placeholder}
          aria-haspopup="dialog"
          aria-expanded=${String(this.open)}
          aria-controls=${this._dropdownId}
          @click=${this._toggle}
          @keydown=${this._onInputKeydown}
        />
        <button
          type="button"
          class="void-date-picker-icon"
          aria-label="Toggle calendar"
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
      ${this.open ? html`
        <div class="void-date-picker-dropdown" id=${this._dropdownId} role="dialog" aria-label="Choose date" popover="manual">
          <void-calendar
            value=${this.value}
            min=${this.min}
            max=${this.max}
            ?disabled=${this.disabled}
            size=${this.size}
            locale=${this.locale}
            first-day=${this.firstDay}
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

  private _onCalendarChange = (e: CustomEvent): void => {
    e.stopPropagation();
    this.value = e.detail.value;
    this._overlay.requestClose('select');
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: e.detail,
    }));
  };

  private _onInputKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._toggle();
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
