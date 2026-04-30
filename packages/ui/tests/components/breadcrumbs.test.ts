// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidBreadcrumbs } from '../../src/components/breadcrumbs.js';

describe('VoidBreadcrumbs', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidBreadcrumbs)).toBe(VoidElement);
  });

  it('registers as void-breadcrumbs custom element', () => {
    expect(customElements.get('void-breadcrumbs')).toBe(VoidBreadcrumbs);
  });

  describe('default properties', () => {
    let el: VoidBreadcrumbs;

    beforeEach(() => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
    });

    it('defaults separator to "/"', () => {
      expect(el.separator).toBe('/');
    });
  });

  describe('ARIA', () => {
    let el: VoidBreadcrumbs;

    beforeEach(() => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    it('sets role="navigation" when connected', () => {
      expect(el.getAttribute('role')).toBe('navigation');
    });

    it('sets aria-label="Breadcrumb" when connected', () => {
      expect(el.getAttribute('aria-label')).toBe('Breadcrumb');
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      expect(el.createRenderRoot()).toBe(el);
    });
  });

  describe('rendering', () => {
    let el: VoidBreadcrumbs;

    afterEach(() => {
      el?.remove();
    });

    it('renders a .void-breadcrumbs-list ol element', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('ol.void-breadcrumbs-list')).not.toBeNull();
    });

    it('wraps each child in a .void-breadcrumbs-item li', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<a href="/">Home</a><a href="/products">Products</a><span>Details</span>';
      document.body.appendChild(el);
      await el.updateComplete;
      const items = el.querySelectorAll('.void-breadcrumbs-item');
      expect(items).toHaveLength(3);
    });

    it('sets aria-current="page" on last item only', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<a href="/">Home</a><a href="/about">About</a><span>Contact</span>';
      document.body.appendChild(el);
      await el.updateComplete;
      const items = el.querySelectorAll('.void-breadcrumbs-item');
      expect(items[0].getAttribute('aria-current')).toBeNull();
      expect(items[1].getAttribute('aria-current')).toBeNull();
      expect(items[2].getAttribute('aria-current')).toBe('page');
    });

    it('sets data-separator attribute on each item', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<a href="/">Home</a><span>Page</span>';
      document.body.appendChild(el);
      await el.updateComplete;
      const items = el.querySelectorAll('.void-breadcrumbs-item');
      for (const item of Array.from(items)) {
        expect(item.getAttribute('data-separator')).toBe('/');
      }
    });

    it('uses custom separator on data-separator attribute', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.separator = '›';
      el.innerHTML = '<a href="/">Home</a><span>Page</span>';
      document.body.appendChild(el);
      await el.updateComplete;
      const items = el.querySelectorAll('.void-breadcrumbs-item');
      for (const item of Array.from(items)) {
        expect(item.getAttribute('data-separator')).toBe('›');
      }
    });

    it('updates data-separator on all items when separator property changes', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<a href="/">Home</a><span>Page</span>';
      document.body.appendChild(el);
      await el.updateComplete;
      el.separator = '>';
      await el.updateComplete;
      const items = el.querySelectorAll('.void-breadcrumbs-item');
      for (const item of Array.from(items)) {
        expect(item.getAttribute('data-separator')).toBe('>');
      }
    });

    it('preserves child content inside li wrappers', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<a href="/home">Home</a><span>Current</span>';
      document.body.appendChild(el);
      await el.updateComplete;
      const anchors = el.querySelectorAll('a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].getAttribute('href')).toBe('/home');
    });
  });
});
