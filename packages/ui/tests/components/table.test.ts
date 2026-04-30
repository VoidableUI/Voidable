// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTable } from '../../src/components/table.js';

const TAG = 'void-table';

function createElement(): VoidTable {
  return document.createElement(TAG) as VoidTable;
}

describe('VoidTable', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidTable)).toBe(VoidElement);
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
});
