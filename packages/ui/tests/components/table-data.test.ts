// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/table.js';
import type { VoidTable } from '../../src/components/table.js';

const settle = async (el: VoidTable): Promise<void> => {
  await el.updateComplete;
  await Promise.resolve();
  await Promise.resolve();
};

function make(attrs: string, body: string, head = '<th data-key="name" data-sort>Name</th><th data-key="n" data-sort="number">Count</th>'): VoidTable {
  const host = document.createElement('div');
  host.innerHTML = `<void-table ${attrs}><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></void-table>`;
  document.body.appendChild(host);
  return host.querySelector('void-table') as VoidTable;
}

const names = (el: VoidTable): string[] => Array.from(el.querySelectorAll('tbody tr')).map((r) => r.querySelector('td')!.textContent!);
const shown = (el: VoidTable): string[] => Array.from(el.querySelectorAll('tbody tr:not([hidden])')).map((r) => r.querySelector('td')!.textContent!);

const vals = (el: VoidTable): string[] => Array.from(el.querySelectorAll('tbody tr:not([hidden])')).map((r) => r.getAttribute('data-value') ?? '');

const ROWS = '<tr><td>b</td><td>10</td></tr><tr><td>a</td><td>9</td></tr><tr><td></td><td></td></tr><tr><td>Éclair</td><td>100</td></tr>';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidTable data features', () => {
  it('does nothing for a plain table: no button, no live region, no value attribute', async () => {
    const el = make('', ROWS, '<th>Name</th><th>Count</th>');
    await settle(el);
    expect(el.querySelector('button')).toBeNull();
    expect(el.querySelector('[data-void-announcer]')).toBeNull();
    expect(el.hasAttribute('value')).toBe(false);
    expect(el.querySelector('[aria-sort]')).toBeNull();
  });

  describe('sorting', () => {
    it('wraps the header content in a button and sets aria-sort', async () => {
      const el = make('', ROWS);
      await settle(el);
      const th = el.querySelector('th')!;
      expect(th.querySelector('button')?.textContent).toBe('Name');
      expect(th.getAttribute('aria-sort')).toBe('none');
    });

    it('cycles ascending, descending, none and reorders rows with empty cells last', async () => {
      const el = make('', ROWS);
      await settle(el);
      const button = el.querySelector('th button') as HTMLButtonElement;
      button.click();
      await settle(el);
      expect(el.sort).toBe('name');
      expect(el.getAttribute('sort-direction')).toBe('ascending');
      expect(names(el)).toEqual(['a', 'b', 'Éclair', '']);
      button.click();
      await settle(el);
      expect(names(el)).toEqual(['Éclair', 'b', 'a', '']);
      button.click();
      await settle(el);
      expect(el.sort).toBeNull();
      expect(names(el)).toEqual(['b', 'a', '', 'Éclair']);
    });

    it('sorts numbers numerically and honours data-sort-value', async () => {
      const el = make('sort="n"', '<tr><td>x</td><td>10</td></tr><tr><td>y</td><td>9</td></tr><tr><td>z</td><td data-sort-value="100">many</td></tr>');
      await settle(el);
      expect(names(el)).toEqual(['y', 'x', 'z']);
      el.setAttribute('sort-direction', 'descending');
      await settle(el);
      expect(names(el)).toEqual(['z', 'x', 'y']);
    });

    it('fires a cancelable void-sort and keeps the state when cancelled', async () => {
      const el = make('', ROWS);
      await settle(el);
      const seen: unknown[] = [];
      el.addEventListener('void-sort', (e) => {
        seen.push((e as CustomEvent).detail);
        e.preventDefault();
      });
      (el.querySelector('th button') as HTMLButtonElement).click();
      await settle(el);
      expect(seen).toEqual([{ column: 'name', direction: 'ascending' }]);
      expect(el.sort).toBeNull();
    });

    it('in manual mode fires and updates the header but never moves rows', async () => {
      const el = make('manual', ROWS);
      await settle(el);
      (el.querySelector('th button') as HTMLButtonElement).click();
      await settle(el);
      expect(el.querySelector('th')!.getAttribute('aria-sort')).toBe('ascending');
      expect(names(el)).toEqual(['b', 'a', '', 'Éclair']);
    });
  });

  describe('filtering', () => {
    it('hides rows that miss any term, ignoring case and accents, and announces the count', async () => {
      const el = make('filter="ECLAIR"', ROWS);
      await settle(el);
      expect(shown(el)).toEqual(['Éclair']);
      const live = el.querySelector('[data-void-announcer]') as HTMLElement;
      expect(live.getAttribute('aria-live')).toBe('polite');
      el.filter = 'a';
      await settle(el);
      expect(shown(el)).toEqual(['a', 'Éclair']);
      expect(live.textContent).toBe('2 of 4 rows');
      el.filter = null;
      await settle(el);
      expect(shown(el)).toHaveLength(4);
    });

    it('limits the match to filter-columns', async () => {
      const el = make('filter="10" filter-columns="name"', ROWS);
      await settle(el);
      expect(shown(el)).toEqual([]);
      el.setAttribute('filter-columns', 'n');
      await settle(el);
      expect(shown(el)).toEqual(['b', 'Éclair']);
    });

    it('shows the empty part only while nothing matches, and leaves author-hidden rows alone', async () => {
      const el = make('', '<tr><td>a</td><td>1</td></tr><tr hidden><td>zz</td><td>2</td></tr>');
      el.insertAdjacentHTML('beforeend', '<void-table-empty hidden>None</void-table-empty>');
      el.filter = 'q';
      await settle(el);
      const empty = el.querySelector('void-table-empty') as HTMLElement;
      expect(empty.hidden).toBe(false);
      el.filter = 'zz';
      await settle(el);
      expect(empty.hidden).toBe(false);
      el.filter = null;
      await settle(el);
      expect(empty.hidden).toBe(true);
      expect(el.querySelector('tr[hidden]')!.textContent).toContain('zz');
    });

    it('in manual mode never hides rows', async () => {
      const el = make('manual filter="a"', ROWS);
      await settle(el);
      expect(shown(el)).toHaveLength(4);
    });

    it('debounces typing in the filter part and fires void-filter once', async () => {
      const el = make('', ROWS);
      el.insertAdjacentHTML('afterbegin', '<void-table-filter><input type="search"></void-table-filter>');
      await settle(el);
      const input = el.querySelector('input') as HTMLInputElement;
      const events: unknown[] = [];
      el.addEventListener('void-filter', (e) => events.push((e as CustomEvent).detail));
      for (const text of ['e', 'ec', 'ecl']) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 300));
      await settle(el);
      expect(events).toEqual([{ filter: 'ecl', shown: 1, total: 4 }]);
      expect(el.getAttribute('filter')).toBe('ecl');
      expect(input.value).toBe('ecl');
    });
  });

  describe('selection', () => {
    const SEL_HEAD = '<th data-stack="select"><input type="checkbox"></th><th>Name</th>';
    const SEL_ROWS = ['a', 'b', 'c', 'd'].map((v) => `<tr data-value="${v}"><td><input type="checkbox"></td><td>${v}</td></tr>`).join('');
    const boxes = (el: VoidTable): HTMLInputElement[] => Array.from(el.querySelectorAll('tbody input'));
    const click = (box: HTMLInputElement, shiftKey = false): void => {
      box.closest('void-table')!.dispatchEvent(new MouseEvent('click', { shiftKey }));
      box.checked = !box.checked;
      box.dispatchEvent(new Event('change', { bubbles: true }));
    };

    it('selects rows, reflects value, writes aria-selected and fires one void-change', async () => {
      const el = make('selectable', SEL_ROWS, SEL_HEAD);
      await settle(el);
      const events: unknown[] = [];
      el.addEventListener('void-change', (e) => events.push((e as CustomEvent).detail));
      click(boxes(el)[1]!);
      await settle(el);
      expect(el.value).toEqual(['b']);
      expect(el.getAttribute('value')).toBe('["b"]');
      expect(el.querySelectorAll('tbody tr')[1]!.getAttribute('aria-selected')).toBe('true');
      expect(events).toEqual([{ value: ['b'], all: false }]);
      const head = el.querySelector('thead input') as HTMLInputElement;
      expect(head.indeterminate).toBe(true);
      expect(head.getAttribute('aria-label')).toBe('Select all rows');
    });

    it('selects a range with shift and everything with select-all, in one event each', async () => {
      const el = make('selectable', SEL_ROWS, SEL_HEAD);
      await settle(el);
      const events: unknown[] = [];
      el.addEventListener('void-change', (e) => events.push((e as CustomEvent).detail));
      click(boxes(el)[0]!);
      click(boxes(el)[2]!, true);
      expect(el.value).toEqual(['a', 'b', 'c']);
      expect(events).toHaveLength(2);
      const head = el.querySelector('thead input') as HTMLInputElement;
      click(head);
      expect(el.value).toEqual(['a', 'b', 'c', 'd']);
      expect(head.checked).toBe(true);
      expect(events).toHaveLength(3);
      click(head);
      expect(el.value).toEqual([]);
    });

    it('select-all acts on shown rows only and skips disabled ones', async () => {
      const el = make('selectable filter="a"', SEL_ROWS.replace('<td>a</td>', '<td>a</td>').replace('value="d"', 'value="d" data-disabled'), SEL_HEAD);
      await settle(el);
      expect(vals(el)).toEqual(['a']);
      const head = el.querySelector('thead input') as HTMLInputElement;
      expect(head.getAttribute('aria-label')).toBe('Select all 1 shown rows');
      click(head);
      expect(el.value).toEqual(['a']);
      el.filter = null;
      await settle(el);
      expect(head.indeterminate).toBe(true);
      head.checked = false;
      click(head);
      expect(el.value).toEqual(['a', 'b', 'c']);
    });

    it('single mode keeps one row', async () => {
      const el = make('selectable="single"', SEL_ROWS, SEL_HEAD);
      await settle(el);
      click(boxes(el)[0]!);
      click(boxes(el)[2]!);
      expect(el.value).toEqual(['c']);
      expect(boxes(el)[0]!.checked).toBe(false);
    });

    it('keeps the selection by row value when the rows are replaced and drops rows that are gone', async () => {
      const el = make('selectable value=\'["b","d"]\'', SEL_ROWS, SEL_HEAD);
      await settle(el);
      expect(boxes(el)[1]!.checked).toBe(true);
      el.querySelector('tbody')!.innerHTML = ['d', 'b', 'x'].map((v) => `<tr data-value="${v}"><td><input type="checkbox"></td><td>${v}</td></tr>`).join('');
      await settle(el);
      expect(el.value).toEqual(['d', 'b']);
      expect(boxes(el).map((b) => b.checked)).toEqual([true, true, false]);
      el.querySelector('tbody')!.innerHTML = '<tr data-value="x"><td><input type="checkbox"></td><td>x</td></tr>';
      await settle(el);
      expect(el.value).toEqual([]);
      expect(el.hasAttribute('value')).toBe(false);
    });

    it('adopts the checked boxes of server markup', async () => {
      const el = make('selectable', SEL_ROWS.replace('<input type="checkbox">', '<input type="checkbox" checked>'), SEL_HEAD);
      await settle(el);
      expect(el.value).toEqual(['a']);
    });

    it('shows the selection part with the count, and the select-all-pages part when every shown row is selected', async () => {
      const el = make('selectable manual total-rows="40"', SEL_ROWS, SEL_HEAD);
      el.insertAdjacentHTML('beforeend', '<void-table-selection hidden><span data-count></span> selected</void-table-selection><void-table-select-all hidden><button type="button">Select all 40</button></void-table-select-all>');
      await settle(el);
      const part = el.querySelector('void-table-selection') as HTMLElement;
      const all = el.querySelector('void-table-select-all') as HTMLElement;
      expect(part.hidden).toBe(true);
      click(boxes(el)[0]!);
      expect(part.hidden).toBe(false);
      expect(part.querySelector('[data-count]')!.textContent).toBe('1');
      expect(all.hidden).toBe(true);
      click(el.querySelector('thead input') as HTMLInputElement);
      expect(all.hidden).toBe(false);
      const events: unknown[] = [];
      el.addEventListener('void-change', (e) => events.push((e as CustomEvent).detail));
      (all.querySelector('button') as HTMLButtonElement).click();
      expect(el.allSelected).toBe(true);
      expect(el.hasAttribute('all-selected')).toBe(false);
      await settle(el);
      expect(el.hasAttribute('all-selected')).toBe(true);
      expect(events).toEqual([{ value: ['a', 'b', 'c', 'd'], all: true }]);
      expect(part.querySelector('[data-count]')!.textContent).toBe('40');
      click(boxes(el)[0]!);
      expect(el.allSelected).toBe(false);
    });

    it('Ctrl+A selects the shown rows only when the shortcut is enabled', async () => {
      const el = make('selectable', SEL_ROWS, SEL_HEAD);
      await settle(el);
      const press = (): boolean => boxes(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }));
      expect(press()).toBe(true);
      expect(el.value).toEqual([]);
      el.setAttribute('shortcuts', 'select-all');
      expect(press()).toBe(false);
      expect(el.value).toHaveLength(4);
    });

    it('does not select when a text input is the target', async () => {
      const el = make('selectable shortcuts="select-all"', SEL_ROWS.replace('<td>a</td>', '<td><input type="text"></td>'), SEL_HEAD);
      await settle(el);
      const text = el.querySelector('tbody input[type="text"]')!;
      text.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }));
      expect(el.value).toEqual([]);
    });

    it('reset restores the initial selection', async () => {
      const el = make('selectable', SEL_ROWS, SEL_HEAD);
      await settle(el);
      click(boxes(el)[0]!);
      el.formResetCallback();
      await settle(el);
      expect(el.value).toEqual([]);
    });
  });
});
