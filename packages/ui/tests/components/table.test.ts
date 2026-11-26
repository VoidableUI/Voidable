// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTable } from '../../src/components/table.js';

const TAG = 'void-table';

function createElement(): VoidTable {
  return document.createElement(TAG) as VoidTable;
}

describe('VoidTable', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      // Through the form-control mixin: the table's selection is a form value.
      expect(VoidTable.prototype instanceof VoidElement).toBe(true);
    });

    it('is registered as void-table', () => {
      expect(customElements.get(TAG)).toBe(VoidTable);
    });
  });

  describe('default property values', () => {
    let el: VoidTable;

    beforeEach(() => {
      el = createElement();
    });

    it('striped defaults to false', () => {
      expect(el.striped).toBe(false);
    });

    it('hoverable defaults to false', () => {
      expect(el.hoverable).toBe(false);
    });

    it('compact defaults to false', () => {
      expect(el.compact).toBe(false);
    });

    it('bordered defaults to false', () => {
      expect(el.bordered).toBe(false);
    });
  });

  describe('attribute reflection', () => {
    let el: VoidTable;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('reflects striped to attribute', async () => {
      el.striped = true;
      await el.updateComplete;
      expect(el.hasAttribute('striped')).toBe(true);
    });

    it('removes striped attribute when set to false', async () => {
      el.striped = true;
      await el.updateComplete;
      el.striped = false;
      await el.updateComplete;
      expect(el.hasAttribute('striped')).toBe(false);
    });

    it('reflects hoverable to attribute', async () => {
      el.hoverable = true;
      await el.updateComplete;
      expect(el.hasAttribute('hoverable')).toBe(true);
    });

    it('removes hoverable attribute when set to false', async () => {
      el.hoverable = true;
      await el.updateComplete;
      el.hoverable = false;
      await el.updateComplete;
      expect(el.hasAttribute('hoverable')).toBe(false);
    });

    it('reflects compact to attribute', async () => {
      el.compact = true;
      await el.updateComplete;
      expect(el.hasAttribute('compact')).toBe(true);
    });

    it('removes compact attribute when set to false', async () => {
      el.compact = true;
      await el.updateComplete;
      el.compact = false;
      await el.updateComplete;
      expect(el.hasAttribute('compact')).toBe(false);
    });

    it('reflects bordered to attribute', async () => {
      el.bordered = true;
      await el.updateComplete;
      expect(el.hasAttribute('bordered')).toBe(true);
    });

    it('removes bordered attribute when set to false', async () => {
      el.bordered = true;
      await el.updateComplete;
      el.bordered = false;
      await el.updateComplete;
      expect(el.hasAttribute('bordered')).toBe(false);
    });
  });

  describe('attribute reading', () => {
    it('reads striped from attribute', () => {
      const el = createElement();
      el.setAttribute('striped', '');
      expect(el.striped).toBe(true);
    });

    it('reads hoverable from attribute', () => {
      const el = createElement();
      el.setAttribute('hoverable', '');
      expect(el.hoverable).toBe(true);
    });

    it('reads compact from attribute', () => {
      const el = createElement();
      el.setAttribute('compact', '');
      expect(el.compact).toBe(true);
    });

    it('reads bordered from attribute', () => {
      const el = createElement();
      el.setAttribute('bordered', '');
      expect(el.bordered).toBe(true);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });

    it('preserves child table element', async () => {
      const el = createElement();
      const table = document.createElement('table');
      el.appendChild(table);
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('table')).toBe(table);
    });
  });

  describe('new properties', () => {
    it('default to absent or off', () => {
      const el = createElement();
      expect(el.inset).toBe(false);
      expect(el.stack).toBeNull();
      expect(el.scrollable).toBe(false);
      expect(el.stickyHeader).toBe(false);
      expect(el.stickyColumn).toBe(false);
      expect(el.maxHeight).toBeNull();
      expect(el.label).toBeNull();
    });

    it('reads multi-word attributes in kebab-case', () => {
      const el = createElement();
      el.setAttribute('sticky-header', '');
      el.setAttribute('sticky-column', '');
      el.setAttribute('max-height', '20rem');
      expect(el.stickyHeader).toBe(true);
      expect(el.stickyColumn).toBe(true);
      expect(el.maxHeight).toBe('20rem');
    });

    it('reflects them to attributes', async () => {
      const el = createElement();
      document.body.appendChild(el);
      el.inset = true;
      el.scrollable = true;
      el.stickyHeader = true;
      el.stickyColumn = true;
      el.stack = '';
      await el.updateComplete;
      for (const name of ['inset', 'scrollable', 'sticky-header', 'sticky-column', 'stack']) {
        expect(el.hasAttribute(name), name).toBe(true);
      }
      el.stack = null;
      await el.updateComplete;
      expect(el.hasAttribute('stack')).toBe(false);
      el.remove();
    });

    it('reads a bare stack attribute as the empty string, not as absent', () => {
      const el = createElement();
      el.setAttribute('stack', '');
      expect(el.stack).toBe('');
    });
  });

  describe('stacked presentation', () => {
    const settle = async (el: VoidTable) => {
      await el.updateComplete;
      for (let i = 0; i < 4; i++) await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    };

    function build(extra = ''): VoidTable {
      const el = createElement();
      el.setAttribute('stack', '');
      el.innerHTML = `
        <table>
          <thead><tr>
            <th data-stack="select"><input type="checkbox" aria-label="Select all"></th>
            <th data-stack="title">Name</th>
            <th>  Role
              </th>
            <th data-align="end">Seats</th>
            <th data-stack="actions">Actions</th>
          </tr></thead>
          <tbody>
            <tr><td><input type="checkbox"></td><td>Ada</td><td>Admin</td><td>4</td><td><button>Edit</button></td></tr>
            <tr><td><input type="checkbox"></td><td>Ben</td><td ${extra}>Editor</td><td>2</td><td><button>Edit</button></td></tr>
          </tbody>
        </table>`;
      document.body.appendChild(el);
      return el;
    }

    it('copies the header text to the cells as data-label', async () => {
      const el = build();
      await settle(el);
      const cells = Array.from(el.querySelectorAll('tbody tr:first-child td'));
      expect(cells.map((c) => c.getAttribute('data-label'))).toEqual(['', 'Name', 'Role', 'Seats', 'Actions']);
      el.remove();
    });

    it('copies the column role and alignment from the header cell', async () => {
      const el = build();
      await settle(el);
      const cells = Array.from(el.querySelectorAll('tbody tr:last-child td'));
      expect(cells.map((c) => c.getAttribute('data-stack'))).toEqual(['select', 'title', null, null, 'actions']);
      expect(cells[3].getAttribute('data-align')).toBe('end');
      el.remove();
    });

    it('keeps a data-label written on a cell', async () => {
      const el = build('data-label="Job"');
      await settle(el);
      expect(el.querySelector('tbody tr:last-child td:nth-child(3)')?.getAttribute('data-label')).toBe('Job');
      expect(el.querySelector('tbody tr:first-child td:nth-child(3)')?.getAttribute('data-label')).toBe('Role');
      el.remove();
    });

    it('lets a header data-label override its text, and an empty one suppress the label', async () => {
      const el = build();
      el.querySelector('thead th:nth-child(3)')!.setAttribute('data-label', 'Job title');
      el.querySelector('thead th:nth-child(4)')!.setAttribute('data-label', '');
      await settle(el);
      const cells = Array.from(el.querySelectorAll('tbody tr:first-child td'));
      expect(cells[2].getAttribute('data-label')).toBe('Job title');
      expect(cells[3].getAttribute('data-label')).toBe('');
      el.remove();
    });

    it('labels rows added later and follows a renamed header', async () => {
      const el = build();
      await settle(el);
      const row = el.querySelector('tbody tr')!.cloneNode(true) as HTMLTableRowElement;
      for (const cell of Array.from(row.cells)) cell.removeAttribute('data-label');
      el.querySelector('tbody')!.appendChild(row);
      el.querySelector('thead th:nth-child(3)')!.textContent = 'Position';
      await settle(el);
      expect(row.cells[2].getAttribute('data-label')).toBe('Position');
      expect(el.querySelector('tbody tr:first-child td:nth-child(3)')?.getAttribute('data-label')).toBe('Position');
      el.remove();
    });

    it('restores a label a morph removed', async () => {
      const el = build();
      await settle(el);
      const cell = el.querySelector('tbody td:nth-child(3)')!;
      cell.removeAttribute('data-label');
      await settle(el);
      expect(cell.getAttribute('data-label')).toBe('Role');
      el.remove();
    });

    it('puts explicit table roles on the table, rows and cells', async () => {
      const el = build();
      await settle(el);
      expect(el.querySelector('table')!.getAttribute('role')).toBe('table');
      expect(el.querySelector('thead')!.getAttribute('role')).toBe('rowgroup');
      expect(el.querySelector('tbody')!.getAttribute('role')).toBe('rowgroup');
      expect(el.querySelector('tr')!.getAttribute('role')).toBe('row');
      expect(el.querySelector('th')!.getAttribute('role')).toBe('columnheader');
      expect(el.querySelector('tbody td')!.getAttribute('role')).toBe('cell');
      el.remove();
    });

    it('does not override a role the author wrote', async () => {
      const el = build();
      el.querySelector('tbody tr')!.setAttribute('role', 'presentation');
      await settle(el);
      expect(el.querySelector('tbody tr')!.getAttribute('role')).toBe('presentation');
      el.remove();
    });

    it('marks header cells that hold a control, and where a title and a checkbox are', async () => {
      const el = build();
      await settle(el);
      expect(el.querySelector('thead th:nth-child(1)')!.hasAttribute('data-controls')).toBe(true);
      expect(el.querySelector('thead th:nth-child(2)')!.hasAttribute('data-controls')).toBe(false);
      expect(el.querySelector('thead tr')!.hasAttribute('data-controls')).toBe(true);
      expect(el.hasAttribute('data-stack-title')).toBe(true);
      expect(el.hasAttribute('data-stack-select')).toBe(true);
      el.remove();
    });

    it('sets nothing on cells without stack', async () => {
      const el = build();
      el.removeAttribute('stack');
      el.querySelectorAll('[data-label]').forEach((c) => c.removeAttribute('data-label'));
      await settle(el);
      expect(el.querySelector('tbody td')!.hasAttribute('data-label')).toBe(false);
      el.remove();
    });

    it('still copies alignment and column roles without stack, but sets no roles', async () => {
      const el = build();
      el.removeAttribute('stack');
      await settle(el);
      expect(el.querySelector('tbody tr:last-child td:nth-child(4)')!.getAttribute('data-align')).toBe('end');
      expect(el.querySelector('tbody tr:last-child td:nth-child(5)')!.getAttribute('data-stack')).toBe('actions');
      expect(el.querySelector('table')!.hasAttribute('role')).toBe(false);
      el.remove();
    });

    it('takes a breakpoint as a CSS length and ignores other values', async () => {
      const el = build();
      el.setAttribute('stack', '48rem');
      await settle(el);
      expect(el.style.getPropertyValue('--void-table-stack-at')).toBe('48rem');
      el.setAttribute('stack', 'always');
      await settle(el);
      expect(el.style.getPropertyValue('--void-table-stack-at')).toBe('');
      el.remove();
    });
  });

  describe('name', () => {
    const settle = async (el: VoidTable) => {
      await el.updateComplete;
      for (let i = 0; i < 4; i++) await Promise.resolve();
    };
    const mount = async (attrs: Record<string, string>, inner = '') => {
      const el = createElement();
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      el.innerHTML = `<table>${inner}<thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>`;
      document.body.appendChild(el);
      await settle(el);
      return el;
    };

    it('copies the host aria-label onto the native table', async () => {
      const el = await mount({ 'aria-label': 'Invoices' });
      expect(el.querySelector('table')!.getAttribute('aria-label')).toBe('Invoices');
      el.setAttribute('aria-label', 'Receipts');
      await settle(el);
      expect(el.querySelector('table')!.getAttribute('aria-label')).toBe('Receipts');
      el.removeAttribute('aria-label');
      await settle(el);
      expect(el.querySelector('table')!.hasAttribute('aria-label')).toBe(false);
      el.remove();
    });

    it('leaves a table named by its caption, or by its own aria-label, alone', async () => {
      const captioned = await mount({ 'aria-label': 'Invoices' }, '<caption>Team</caption>');
      expect(captioned.querySelector('table')!.hasAttribute('aria-label')).toBe(false);
      captioned.remove();
      const own = createElement();
      own.setAttribute('aria-label', 'Host');
      own.innerHTML = '<table aria-label="Mine"><tbody><tr><td>1</td></tr></tbody></table>';
      document.body.appendChild(own);
      await settle(own);
      expect(own.querySelector('table')!.getAttribute('aria-label')).toBe('Mine');
      own.remove();
    });
  });

  describe('scroll region', () => {
    const settle = async (el: VoidTable) => {
      await el.updateComplete;
      for (let i = 0; i < 4; i++) await Promise.resolve();
    };

    function overflowing(el: VoidTable, scrollWidth: number, clientWidth: number): void {
      Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => scrollWidth });
      Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => clientWidth });
    }

    function build(attrs: Record<string, string> = {}): VoidTable {
      const el = createElement();
      el.setAttribute('scrollable', '');
      el.innerHTML = `<table><caption>Team members</caption><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>`;
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      return el;
    }

    it('is not focusable, labelled or a region while it does not overflow', async () => {
      const el = build();
      overflowing(el, 300, 300);
      document.body.appendChild(el);
      await settle(el);
      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-label')).toBe(false);
      el.remove();
    });

    it('becomes a focusable labelled region while it overflows, named by the caption', async () => {
      const el = build();
      overflowing(el, 900, 300);
      document.body.appendChild(el);
      await settle(el);
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.getAttribute('role')).toBe('region');
      expect(el.getAttribute('aria-label')).toBe('Team members');
      expect(el.hasAttribute('data-overflowing')).toBe(true);
      el.remove();
    });

    it('prefers the label attribute to the caption', async () => {
      const el = build({ label: 'Staff' });
      overflowing(el, 900, 300);
      document.body.appendChild(el);
      await settle(el);
      expect(el.getAttribute('aria-label')).toBe('Staff');
      el.remove();
    });

    it('leaves an aria-label the author wrote', async () => {
      const el = build({ 'aria-label': 'People' });
      overflowing(el, 900, 300);
      document.body.appendChild(el);
      await settle(el);
      expect(el.getAttribute('aria-label')).toBe('People');
      el.remove();
    });

    it('warns once when the overflowing region has no name', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const el = build();
      el.querySelector('caption')!.remove();
      overflowing(el, 900, 300);
      document.body.appendChild(el);
      await settle(el);
      el.setAttribute('striped', '');
      await settle(el);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
      el.remove();
    });

    it('drops the region semantics again when the table fits', async () => {
      const el = build();
      overflowing(el, 900, 300);
      document.body.appendChild(el);
      await settle(el);
      overflowing(el, 300, 300);
      el.setAttribute('striped', '');
      await settle(el);
      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-label')).toBe(false);
      el.remove();
    });

    it('reports which edges have more to scroll to', async () => {
      const el = build();
      overflowing(el, 900, 300);
      document.body.appendChild(el);
      await settle(el);
      expect(el.hasAttribute('data-overflow-start')).toBe(false);
      expect(el.hasAttribute('data-overflow-end')).toBe(true);
      el.scrollLeft = 300;
      el.dispatchEvent(new Event('scroll'));
      expect(el.hasAttribute('data-overflow-start')).toBe(true);
      expect(el.hasAttribute('data-overflow-end')).toBe(true);
      el.scrollLeft = 600;
      el.dispatchEvent(new Event('scroll'));
      expect(el.hasAttribute('data-overflow-end')).toBe(false);
      el.remove();
    });

    it('is not a scroll region without scrollable', async () => {
      const el = build();
      el.removeAttribute('scrollable');
      overflowing(el, 900, 300);
      document.body.appendChild(el);
      await settle(el);
      expect(el.hasAttribute('tabindex')).toBe(false);
      el.remove();
    });

    it('sets the maximum height as a custom property', async () => {
      const el = build({ 'max-height': '18rem' });
      document.body.appendChild(el);
      await settle(el);
      expect(el.style.getPropertyValue('--void-table-max-height')).toBe('18rem');
      el.remove();
    });
  });
});
