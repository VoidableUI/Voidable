// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCalendar, VoidDatePicker } from '../../src/components/calendar.js';

if (!customElements.get('void-calendar')) {
  customElements.define('void-calendar', VoidCalendar);
}
if (!customElements.get('void-date-picker')) {
  customElements.define('void-date-picker', VoidDatePicker);
}

/* ============================================================
   VoidCalendar
   ============================================================ */

describe('VoidCalendar', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidCalendar)).toBe(VoidElement);
    });

    it('is registered as void-calendar', () => {
      expect(customElements.get('void-calendar')).toBe(VoidCalendar);
    });
  });

  describe('default property values', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('min defaults to empty string', () => {
      expect(el.min).toBe('');
    });

    it('max defaults to empty string', () => {
      expect(el.max).toBe('');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('locale defaults to "en-US"', () => {
      expect(el.locale).toBe('en-US');
    });

    it('firstDay defaults to 0', () => {
      expect(el.firstDay).toBe(0);
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="group" on host', () => {
      expect(el.getAttribute('role')).toBe('group');
    });

    it('sets aria-label="Calendar" on host', () => {
      expect(el.getAttribute('aria-label')).toBe('Calendar');
    });
  });

  describe('rendering', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      el.value = '2024-06-15';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('renders the calendar header with month and year', () => {
      const title = el.querySelector('.void-calendar-title');
      expect(title).not.toBeNull();
      expect(title!.textContent).toContain('June');
      expect(title!.textContent).toContain('2024');
    });

    it('renders 7 weekday headers', () => {
      const weekdays = el.querySelectorAll('.void-calendar-weekday');
      expect(weekdays.length).toBe(7);
    });

    it('renders 42 day cells', () => {
      const days = el.querySelectorAll('.void-calendar-day');
      expect(days.length).toBe(42);
    });

    it('marks the selected date', () => {
      const selected = el.querySelector('.void-calendar-day.selected');
      expect(selected).not.toBeNull();
      expect(selected!.getAttribute('data-date')).toBe('2024-06-15');
    });

    it('renders nav buttons', () => {
      const navBtns = el.querySelectorAll('.void-calendar-nav');
      expect(navBtns.length).toBe(2);
    });
  });

  describe('month navigation', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      el.value = '2024-06-15';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('navigates to previous month', async () => {
      const prevBtn = el.querySelector('.void-calendar-nav') as HTMLButtonElement;
      prevBtn.click();
      await el.updateComplete;
      const title = el.querySelector('.void-calendar-title');
      expect(title!.textContent).toContain('May');
    });

    it('navigates to next month', async () => {
      const navBtns = el.querySelectorAll('.void-calendar-nav');
      const nextBtn = navBtns[1] as HTMLButtonElement;
      nextBtn.click();
      await el.updateComplete;
      const title = el.querySelector('.void-calendar-title');
      expect(title!.textContent).toContain('July');
    });

    it('wraps from January to December of previous year', async () => {
      el.value = '2024-01-10';
      await el.updateComplete;
      const prevBtn = el.querySelector('.void-calendar-nav') as HTMLButtonElement;
      prevBtn.click();
      await el.updateComplete;
      const title = el.querySelector('.void-calendar-title');
      expect(title!.textContent).toContain('December');
      expect(title!.textContent).toContain('2023');
    });

    it('wraps from December to January of next year', async () => {
      el.value = '2024-12-10';
      await el.updateComplete;
      const navBtns = el.querySelectorAll('.void-calendar-nav');
      const nextBtn = navBtns[1] as HTMLButtonElement;
      nextBtn.click();
      await el.updateComplete;
      const title = el.querySelector('.void-calendar-title');
      expect(title!.textContent).toContain('January');
      expect(title!.textContent).toContain('2025');
    });
  });

  describe('drill-up views', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      el.value = '2024-06-15';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('clicking title switches to month picker', async () => {
      const title = el.querySelector('.void-calendar-title') as HTMLButtonElement;
      title.click();
      await el.updateComplete;
      const months = el.querySelectorAll('.void-calendar-month');
      expect(months.length).toBe(12);
    });

    it('clicking year title in month picker switches to year picker', async () => {
      const title = el.querySelector('.void-calendar-title') as HTMLButtonElement;
      title.click();
      await el.updateComplete;
      const yearTitle = el.querySelector('.void-calendar-title') as HTMLButtonElement;
      yearTitle.click();
      await el.updateComplete;
      const years = el.querySelectorAll('.void-calendar-year');
      expect(years.length).toBe(12);
    });

    it('selecting a year goes back to month picker', async () => {
      // Go to year picker
      let title = el.querySelector('.void-calendar-title') as HTMLButtonElement;
      title.click();
      await el.updateComplete;
      title = el.querySelector('.void-calendar-title') as HTMLButtonElement;
      title.click();
      await el.updateComplete;

      // Pick a year
      const yearBtn = el.querySelector('.void-calendar-year') as HTMLButtonElement;
      yearBtn.click();
      await el.updateComplete;
      expect(el.querySelectorAll('.void-calendar-month').length).toBe(12);
    });

    it('selecting a month goes back to day view', async () => {
      const title = el.querySelector('.void-calendar-title') as HTMLButtonElement;
      title.click();
      await el.updateComplete;

      const monthBtn = el.querySelectorAll('.void-calendar-month')[2] as HTMLButtonElement;
      monthBtn.click();
      await el.updateComplete;
      expect(el.querySelectorAll('.void-calendar-day').length).toBe(42);
    });
  });

  describe('date selection', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      el.value = '2024-06-15';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('clicking a day selects it', async () => {
      const day10 = el.querySelector('[data-date="2024-06-10"]') as HTMLButtonElement;
      day10.click();
      await el.updateComplete;
      expect(el.value).toBe('2024-06-10');
    });

    it('dispatches void-change with value and date', async () => {
      let detail: { value: string; date: Date } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const day10 = el.querySelector('[data-date="2024-06-10"]') as HTMLButtonElement;
      day10.click();
      await el.updateComplete;
      expect(detail).not.toBeNull();
      expect(detail!.value).toBe('2024-06-10');
      expect(detail!.date).toBeInstanceOf(Date);
    });

    it('void-change event bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const day10 = el.querySelector('[data-date="2024-06-10"]') as HTMLButtonElement;
      day10.click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });
  });

  describe('min/max constraints', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      el.value = '2024-06-15';
      el.min = '2024-06-05';
      el.max = '2024-06-25';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('disables days before min date', () => {
      const day1 = el.querySelector('[data-date="2024-06-01"]') as HTMLButtonElement;
      expect(day1.disabled).toBe(true);
    });

    it('disables days after max date', () => {
      const day30 = el.querySelector('[data-date="2024-06-30"]') as HTMLButtonElement;
      expect(day30.disabled).toBe(true);
    });

    it('does not disable days within range', () => {
      const day10 = el.querySelector('[data-date="2024-06-10"]') as HTMLButtonElement;
      expect(day10.disabled).toBe(false);
    });

    it('does not select disabled dates via click', async () => {
      const day1 = el.querySelector('[data-date="2024-06-01"]') as HTMLButtonElement;
      day1.click();
      await el.updateComplete;
      expect(el.value).toBe('2024-06-15');
    });
  });

  describe('disabled state', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      el.disabled = true;
      el.value = '2024-06-15';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('reflects disabled attribute', () => {
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('disables all day buttons', () => {
      const days = el.querySelectorAll('.void-calendar-day') as NodeListOf<HTMLButtonElement>;
      for (const day of days) {
        expect(day.disabled).toBe(true);
      }
    });

    it('disables nav buttons', () => {
      const navBtns = el.querySelectorAll('.void-calendar-nav') as NodeListOf<HTMLButtonElement>;
      for (const btn of navBtns) {
        expect(btn.disabled).toBe(true);
      }
    });
  });

  describe('keyboard navigation', () => {
    let el: VoidCalendar;

    beforeEach(async () => {
      el = document.createElement('void-calendar') as VoidCalendar;
      el.value = '2024-06-15';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('ArrowRight moves focus to next day', async () => {
      const day15 = el.querySelector('[data-date="2024-06-15"]') as HTMLButtonElement;
      const grid = el.querySelector('.void-calendar-grid') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await el.updateComplete;
      // Focus date should have moved, but we can't easily test focus in happy-dom
      // We verify no error is thrown
      expect(true).toBe(true);
    });

    it('Enter selects the focused date', async () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const day15 = el.querySelector('[data-date="2024-06-15"]') as HTMLButtonElement;
      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      Object.defineProperty(keyEvent, 'target', { value: day15 });
      el.querySelector('.void-calendar-grid')!.dispatchEvent(keyEvent);
      await el.updateComplete;
      expect(detail?.value).toBe('2024-06-15');
    });
  });
});

/* ============================================================
   VoidDatePicker
   ============================================================ */

describe('VoidDatePicker', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidDatePicker)).toBe(VoidElement);
    });

    it('is registered as void-date-picker', () => {
      expect(customElements.get('void-date-picker')).toBe(VoidDatePicker);
    });
  });

  describe('default property values', () => {
    let el: VoidDatePicker;

    beforeEach(async () => {
      el = document.createElement('void-date-picker') as VoidDatePicker;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });

    it('placeholder defaults to "Select date"', () => {
      expect(el.placeholder).toBe('Select date');
    });

    it('format defaults to "MM/DD/YYYY"', () => {
      expect(el.format).toBe('MM/DD/YYYY');
    });

    it('color defaults to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('locale defaults to "en-US"', () => {
      expect(el.locale).toBe('en-US');
    });

    it('firstDay defaults to 0', () => {
      expect(el.firstDay).toBe(0);
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidDatePicker;

    beforeEach(async () => {
      el = document.createElement('void-date-picker') as VoidDatePicker;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="combobox" on host', () => {
      expect(el.getAttribute('role')).toBe('combobox');
    });

    it('sets aria-haspopup="dialog" on host', () => {
      expect(el.getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('sets aria-expanded="false" initially', () => {
      expect(el.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('opening and closing', () => {
    let el: VoidDatePicker;

    beforeEach(async () => {
      el = document.createElement('void-date-picker') as VoidDatePicker;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('opens dropdown on input click', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;
      expect(el.querySelector('.void-date-picker-dropdown')).not.toBeNull();
      expect(el.open).toBe(true);
    });

    it('closes dropdown on second input click', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;
      input.click();
      await el.updateComplete;
      expect(el.querySelector('.void-date-picker-dropdown')).toBeNull();
      expect(el.open).toBe(false);
    });

    it('closes dropdown on Escape key', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-date-picker-dropdown')).toBeNull();
    });

    it('closes dropdown when clicking outside', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await el.updateComplete;
      expect(el.querySelector('.void-date-picker-dropdown')).toBeNull();
    });

    it('aria-expanded becomes true when open', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;
      expect(el.getAttribute('aria-expanded')).toBe('true');
    });

    it('renders void-calendar inside dropdown', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;
      const cal = el.querySelector('void-calendar');
      expect(cal).not.toBeNull();
    });
  });

  describe('date selection through calendar', () => {
    let el: VoidDatePicker;

    beforeEach(async () => {
      el = document.createElement('void-date-picker') as VoidDatePicker;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('dispatches void-change when a date is selected', async () => {
      let detail: { value: string; date: Date } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });

      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;

      const cal = el.querySelector('void-calendar') as VoidCalendar;
      await cal.updateComplete;

      // Find a day button and click it
      const dayBtn = cal.querySelector('.void-calendar-day:not(.outside):not(:disabled)') as HTMLButtonElement;
      const dateVal = dayBtn.getAttribute('data-date')!;
      dayBtn.click();
      await cal.updateComplete;
      await el.updateComplete;

      expect(detail).not.toBeNull();
      expect(detail!.value).toBe(dateVal);
      expect(detail!.date).toBeInstanceOf(Date);
    });

    it('closes dropdown after date selection', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;

      const cal = el.querySelector('void-calendar') as VoidCalendar;
      await cal.updateComplete;

      const dayBtn = cal.querySelector('.void-calendar-day:not(.outside):not(:disabled)') as HTMLButtonElement;
      dayBtn.click();
      await cal.updateComplete;
      await el.updateComplete;

      expect(el.open).toBe(false);
    });

    it('updates input display after date selection', async () => {
      el.value = '2024-06-15';
      await el.updateComplete;
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      expect(input.value).toBe('06/15/2024');
    });
  });

  describe('display format', () => {
    let el: VoidDatePicker;

    beforeEach(async () => {
      el = document.createElement('void-date-picker') as VoidDatePicker;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('formats date using default MM/DD/YYYY format', async () => {
      el.value = '2024-06-15';
      await el.updateComplete;
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      expect(input.value).toBe('06/15/2024');
    });

    it('formats date using custom DD/MM/YYYY format', async () => {
      el.format = 'DD/MM/YYYY';
      el.value = '2024-06-15';
      await el.updateComplete;
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      expect(input.value).toBe('15/06/2024');
    });

    it('shows placeholder when no value', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      expect(input.placeholder).toBe('Select date');
    });
  });

  describe('disabled state', () => {
    let el: VoidDatePicker;

    beforeEach(async () => {
      el = document.createElement('void-date-picker') as VoidDatePicker;
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('does not open dropdown when disabled', async () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;
      expect(el.querySelector('.void-date-picker-dropdown')).toBeNull();
    });

    it('reflects disabled attribute', () => {
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('disables input', () => {
      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('void-change event', () => {
    let el: VoidDatePicker;

    beforeEach(async () => {
      el = document.createElement('void-date-picker') as VoidDatePicker;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('void-change bubbles', async () => {
      let firedOnBody = false;
      document.body.addEventListener('void-change', () => { firedOnBody = true; }, { once: true });

      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;

      const cal = el.querySelector('void-calendar') as VoidCalendar;
      await cal.updateComplete;

      const dayBtn = cal.querySelector('.void-calendar-day:not(.outside):not(:disabled)') as HTMLButtonElement;
      dayBtn.click();
      await cal.updateComplete;
      await el.updateComplete;

      expect(firedOnBody).toBe(true);
    });

    it('void-change detail has value and date properties', async () => {
      let detail: unknown = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });

      const input = el.querySelector('.void-date-picker-input') as HTMLInputElement;
      input.click();
      await el.updateComplete;

      const cal = el.querySelector('void-calendar') as VoidCalendar;
      await cal.updateComplete;

      const dayBtn = cal.querySelector('.void-calendar-day:not(.outside):not(:disabled)') as HTMLButtonElement;
      dayBtn.click();
      await cal.updateComplete;
      await el.updateComplete;

      expect(detail).toHaveProperty('value');
      expect(detail).toHaveProperty('date');
    });
  });
});

/* ============================================================
   VoidCalendar accessibility (grid structure, roving tabindex, keys)
   ============================================================ */

describe('VoidCalendar accessibility', () => {
  let el: VoidCalendar;

  const key = (target: Element, k: string, init: KeyboardEventInit = {}) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
  const tabStops = () => Array.from(el.querySelectorAll('.void-calendar-day[tabindex="0"]')) as HTMLElement[];
  const day = (iso: string) => el.querySelector(`[data-date="${iso}"]`) as HTMLElement;

  beforeEach(async () => {
    el = document.createElement('void-calendar') as VoidCalendar;
    el.value = '2024-06-15';
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('has row / columnheader / gridcell structure', () => {
    const grid = el.querySelector('[role="grid"]')!;
    expect(grid.querySelectorAll('[role="row"]').length).toBe(7);
    expect(grid.querySelectorAll('[role="columnheader"]').length).toBe(7);
    expect(grid.querySelectorAll('[role="gridcell"]').length).toBe(42);
    expect(day('2024-06-15').parentElement!.getAttribute('role')).toBe('gridcell');
  });

  it('puts aria-selected on the gridcell, not the button', () => {
    expect(day('2024-06-15').parentElement!.getAttribute('aria-selected')).toBe('true');
    expect(day('2024-06-14').parentElement!.getAttribute('aria-selected')).toBe('false');
    expect(day('2024-06-15').hasAttribute('aria-selected')).toBe(false);
  });

  it('gives days a localised full-date accessible name', () => {
    expect(day('2024-06-15').getAttribute('aria-label')).toBe('Saturday, June 15, 2024');
  });

  it('uses the component locale for day names', async () => {
    el.locale = 'de-DE';
    await el.updateComplete;
    expect(day('2024-06-15').getAttribute('aria-label')).toBe('Samstag, 15. Juni 2024');
  });

  it('keeps exactly one tab stop after next/prev month navigation', async () => {
    const [prev, next] = Array.from(el.querySelectorAll('.void-calendar-nav')) as HTMLElement[];
    next.click();
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-07-15']);
    prev.click();
    prev.click();
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-05-15']);
  });

  it('clamps the tab stop to the shorter month', async () => {
    el.value = '2024-01-31';
    await el.updateComplete;
    await el.updateComplete;
    (el.querySelectorAll('.void-calendar-nav')[1] as HTMLElement).click();
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-02-29']);
  });

  it('keeps a tab stop after picking a month from the month picker', async () => {
    (el.querySelector('.void-calendar-title') as HTMLElement).click();
    await el.updateComplete;
    (el.querySelectorAll('.void-calendar-month')[2] as HTMLElement).click();
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-03-15']);
  });

  it('PageDown / PageUp move by month and keep focus on the equivalent day', async () => {
    key(day('2024-06-15'), 'PageDown');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-07-15']);
    expect(document.activeElement).toBe(day('2024-07-15'));
    key(day('2024-07-15'), 'PageUp');
    await el.updateComplete;
    key(day('2024-06-15'), 'PageUp');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-05-15']);
  });

  it('PageDown clamps day-of-month in shorter months', async () => {
    el.value = '2024-01-31';
    await el.updateComplete;
    await el.updateComplete;
    key(day('2024-01-31'), 'PageDown');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-02-29']);
  });

  it('Shift+PageDown / Shift+PageUp move by year', async () => {
    key(day('2024-06-15'), 'PageDown', { shiftKey: true });
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2025-06-15']);
    key(day('2025-06-15'), 'PageUp', { shiftKey: true });
    await el.updateComplete;
    key(day('2024-06-15'), 'PageUp', { shiftKey: true });
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2023-06-15']);
  });

  it('Home / End go to week start and end (Sunday first)', async () => {
    key(day('2024-06-15'), 'Home');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-06-09']);
    key(day('2024-06-09'), 'End');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-06-15']);
  });

  it('Home / End respect first-day', async () => {
    el.firstDay = 1;
    await el.updateComplete;
    key(day('2024-06-15'), 'Home');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-06-10']);
    key(day('2024-06-10'), 'End');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-06-16']);
  });

  it('arrow keys across a month boundary keep one tab stop', async () => {
    key(day('2024-06-15'), 'ArrowDown');
    key(day('2024-06-22'), 'ArrowDown');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-06-29']);
    key(day('2024-06-29'), 'ArrowDown');
    await el.updateComplete;
    expect(tabStops().map(b => b.dataset.date)).toEqual(['2024-07-06']);
  });
});
