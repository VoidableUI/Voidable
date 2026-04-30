// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidPagination } from '../../src/components/pagination.js';

if (!customElements.get('void-pagination')) {
  customElements.define('void-pagination', VoidPagination);
}

function create(total: number, value: number, siblings = 1): VoidPagination {
  const el = document.createElement('void-pagination') as VoidPagination;
  el.total = total;
  el.value = value;
  el.siblings = siblings;
  return el;
}

describe('VoidPagination', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidPagination)).toBe(VoidElement);
    });

    it('is registered as void-pagination', () => {
      expect(customElements.get('void-pagination')).toBe(VoidPagination);
    });
  });

  describe('default property values', () => {
    it('total defaults to 1', () => {
      const el = document.createElement('void-pagination') as VoidPagination;
      expect(el.total).toBe(1);
    });

    it('value defaults to 1', () => {
      const el = document.createElement('void-pagination') as VoidPagination;
      expect(el.value).toBe(1);
    });

    it('siblings defaults to 1', () => {
      const el = document.createElement('void-pagination') as VoidPagination;
      expect(el.siblings).toBe(1);
    });

    it('size defaults to "md"', () => {
      const el = document.createElement('void-pagination') as VoidPagination;
      expect(el.size).toBe('md');
    });
  });

  describe('rendering', () => {
    it('renders a nav element with role="navigation"', async () => {
      const el = create(10, 1);
      container.appendChild(el);
      await el.updateComplete;
      const nav = el.querySelector('nav');
      expect(nav).not.toBeNull();
      expect(nav?.getAttribute('role')).toBe('navigation');
      expect(nav?.getAttribute('aria-label')).toBe('Pagination');
    });

    it('renders prev and next buttons', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      const btns = el.querySelectorAll('.void-pagination-btn');
      expect(btns[0].getAttribute('aria-label')).toBe('Previous page');
      expect(btns[btns.length - 1].getAttribute('aria-label')).toBe('Next page');
    });

    it('prev button is disabled on page 1', async () => {
      const el = create(10, 1);
      container.appendChild(el);
      await el.updateComplete;
      const prev = el.querySelector<HTMLButtonElement>('[aria-label="Previous page"]');
      expect(prev?.disabled).toBe(true);
    });

    it('next button is disabled on last page', async () => {
      const el = create(10, 10);
      container.appendChild(el);
      await el.updateComplete;
      const next = el.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
      expect(next?.disabled).toBe(true);
    });

    it('prev button is enabled when not on first page', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      const prev = el.querySelector<HTMLButtonElement>('[aria-label="Previous page"]');
      expect(prev?.disabled).toBe(false);
    });

    it('next button is enabled when not on last page', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      const next = el.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
      expect(next?.disabled).toBe(false);
    });

    it('current page button has aria-current="page"', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      const current = el.querySelector('.void-pagination-btn[aria-current="page"]');
      expect(current).not.toBeNull();
      expect(current?.textContent?.trim()).toBe('5');
    });

    it('always shows first page', async () => {
      const el = create(20, 15);
      container.appendChild(el);
      await el.updateComplete;
      const btns = Array.from(el.querySelectorAll('.void-pagination-btn'))
        .filter(b => !b.getAttribute('aria-label'));
      expect(btns[0].textContent?.trim()).toBe('1');
    });

    it('always shows last page', async () => {
      const el = create(20, 5);
      container.appendChild(el);
      await el.updateComplete;
      const btns = Array.from(el.querySelectorAll('.void-pagination-btn'))
        .filter(b => !b.getAttribute('aria-label'));
      expect(btns[btns.length - 1].textContent?.trim()).toBe('20');
    });

    it('shows ellipsis when there is a gap after first page', async () => {
      const el = create(20, 10);
      container.appendChild(el);
      await el.updateComplete;
      const ellipses = el.querySelectorAll('.void-pagination-ellipsis');
      expect(ellipses.length).toBeGreaterThanOrEqual(1);
    });

    it('shows two ellipses when current page is in the middle', async () => {
      const el = create(20, 10);
      container.appendChild(el);
      await el.updateComplete;
      const ellipses = el.querySelectorAll('.void-pagination-ellipsis');
      expect(ellipses.length).toBe(2);
    });

    it('shows no ellipsis when total is small', async () => {
      const el = create(5, 3);
      container.appendChild(el);
      await el.updateComplete;
      const ellipses = el.querySelectorAll('.void-pagination-ellipsis');
      expect(ellipses.length).toBe(0);
    });

    it('renders sibling pages around current', async () => {
      const el = create(20, 10, 2);
      container.appendChild(el);
      await el.updateComplete;
      const btns = Array.from(el.querySelectorAll('.void-pagination-btn'))
        .filter(b => !b.getAttribute('aria-label'))
        .map(b => Number(b.textContent?.trim()));
      expect(btns).toContain(8);
      expect(btns).toContain(9);
      expect(btns).toContain(10);
      expect(btns).toContain(11);
      expect(btns).toContain(12);
    });
  });

  describe('size reflection', () => {
    it('reflects size attribute', async () => {
      const el = document.createElement('void-pagination') as VoidPagination;
      container.appendChild(el);
      el.size = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });

    it('reflects value attribute', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('value')).toBe('5');
    });
  });

  describe('navigation', () => {
    it('clicking next page increments value', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      const next = el.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
      next?.click();
      await el.updateComplete;
      expect(el.value).toBe(6);
    });

    it('clicking prev page decrements value', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      const prev = el.querySelector<HTMLButtonElement>('[aria-label="Previous page"]');
      prev?.click();
      await el.updateComplete;
      expect(el.value).toBe(4);
    });

    it('clicking a page number sets value', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      const btns = Array.from(el.querySelectorAll<HTMLButtonElement>('.void-pagination-btn'))
        .filter(b => !b.getAttribute('aria-label') && b.textContent?.trim() === '4');
      btns[0]?.click();
      await el.updateComplete;
      expect(el.value).toBe(4);
    });

    it('clicking prev does nothing on page 1', async () => {
      const el = create(10, 1);
      container.appendChild(el);
      await el.updateComplete;
      const prev = el.querySelector<HTMLButtonElement>('[aria-label="Previous page"]');
      prev?.click();
      await el.updateComplete;
      expect(el.value).toBe(1);
    });

    it('clicking next does nothing on last page', async () => {
      const el = create(10, 10);
      container.appendChild(el);
      await el.updateComplete;
      const next = el.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
      next?.click();
      await el.updateComplete;
      expect(el.value).toBe(10);
    });
  });

  describe('void-change event', () => {
    it('dispatches void-change when clicking next', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const next = el.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
      next?.click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-change detail contains new value', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      let detail: { value: number } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const next = el.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
      next?.click();
      await el.updateComplete;
      expect(detail?.value).toBe(6);
    });

    it('void-change bubbles', async () => {
      const el = create(10, 5);
      container.appendChild(el);
      await el.updateComplete;
      let firedOnParent = false;
      container.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const next = el.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
      next?.click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });

    it('does not dispatch void-change when clicking disabled prev', async () => {
      const el = create(10, 1);
      container.appendChild(el);
      await el.updateComplete;
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const prev = el.querySelector<HTMLButtonElement>('[aria-label="Previous page"]');
      prev?.click();
      await el.updateComplete;
      expect(fired).toBe(false);
    });
  });
});
