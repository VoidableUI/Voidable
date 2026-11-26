// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/table.js';
import '../../src/messages/fr.js';
import '../../src/messages/ar.js';
import { msg } from '../../src/messages.js';
import type { VoidTable } from '../../src/components/table.js';

const settle = async (el: VoidTable): Promise<void> => {
  await el.updateComplete;
  await Promise.resolve();
  await Promise.resolve();
};

function make(lang: string, attrs: string, body: string, head: string): VoidTable {
  const host = document.createElement('div');
  if (lang) host.setAttribute('lang', lang);
  host.innerHTML = `<void-table ${attrs}><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></void-table>`;
  document.body.appendChild(host);
  return host.querySelector('void-table') as VoidTable;
}

afterEach(() => {
  document.body.innerHTML = '';
});

const ROWS = '<tr data-value="a"><td>b</td><td>1.234,5</td></tr><tr data-value="b"><td>a</td><td>9,5</td></tr>';

describe('table messages', () => {
  it('has every sentence in English, French and Arabic, with plurals', () => {
    const host = document.createElement('div');
    document.body.append(host);
    for (const lang of ['en', 'fr', 'ar']) {
      host.setAttribute('lang', lang);
      expect(msg(host, 'table.selectAll')).not.toBe('table.selectAll');
      for (const n of [0, 1, 2, 3, 11, 100]) {
        expect(msg(host, 'table.selectAllShown', { count: n })).not.toBe('table.selectAllShown');
        expect(msg(host, 'table.rows', { count: n })).not.toBe('table.rows');
      }
    }
    host.setAttribute('lang', 'en');
    expect(msg(host, 'table.rows', { count: 1 })).toBe('1 row');
    expect(msg(host, 'table.rows', { count: 1234 })).toBe('1,234 rows');
    expect(msg(host, 'table.rowsShown', { shown: 2, total: 4 })).toBe('2 of 4 rows');
    host.setAttribute('lang', 'fr');
    expect(msg(host, 'table.rowsShown', { shown: 2, total: 4 })).toBe('2 sur 4 lignes');
  });

  it('announces a filter in the language of the page', async () => {
    const el = make('fr', 'filter="a"', ROWS, '<th data-key="n">Nom</th><th data-key="v" data-sort="number">Valeur</th>');
    await settle(el);
    el.filter = 'b';
    await settle(el);
    expect((el.querySelector('[data-void-announcer]') as HTMLElement).textContent).toBe('1 sur 2 lignes');
  });

  it('names the header checkbox and announces a sort in French', async () => {
    const el = make('fr', 'selectable', ROWS.replace(/<td>b<\/td>/, '<td><input type="checkbox"></td>'), '<th><input type="checkbox"></th><th data-key="v" data-sort="number">Valeur</th>');
    await settle(el);
    expect(el.querySelector('thead input')!.getAttribute('aria-label')).toBe('Sélectionner toutes les lignes');
  });

  it('reads the numbers of a cell for the locale of the page when it sorts', async () => {
    const el = make('de', 'sort="v" sort-direction="ascending"', ROWS, '<th data-key="n">N</th><th data-key="v" data-sort="number">V</th>');
    await settle(el);
    // 9,5 is nine and a half, 1.234,5 is one thousand two hundred thirty-four and a half.
    expect(Array.from(el.querySelectorAll('tbody tr')).map((r) => r.getAttribute('data-value'))).toEqual(['b', 'a']);
  });

  it('formats the selection count for the locale', async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => `<tr data-value="${i}"><td><input type="checkbox"></td></tr>`).join('');
    const el = make('de', 'selectable', rows, '<th><input type="checkbox"></th>');
    el.insertAdjacentHTML('beforeend', '<void-table-selection><span data-count></span></void-table-selection>');
    await settle(el);
    (el.querySelector('thead input') as HTMLInputElement).click();
    await settle(el);
    expect(el.querySelector('[data-count]')!.textContent).toBe('1.200');
  });
});

describe('table and forms', () => {
  it('adds nothing to a form without selectable, with or without a name, and ignores required', async () => {
    const host = document.createElement('form');
    host.innerHTML = '<void-table name="t" required><table><tbody><tr><td>x</td></tr></tbody></table></void-table>';
    document.body.append(host);
    const el = host.querySelector('void-table') as VoidTable;
    await settle(el);
    expect(Array.from(new FormData(host).keys())).toEqual([]);
    expect(host.checkValidity()).toBe(true);
  });
});
