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


  describe('structure', () => {
    let el: VoidBreadcrumbs;

    afterEach(() => {
      el?.remove();
    });

    it('renders nothing of its own: the author items stay the children, in order', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item><void-breadcrumbs-item aria-current="page">Page</void-breadcrumbs-item>';
      const before = Array.from(el.children);
      document.body.appendChild(el);
      await el.updateComplete;
      expect(Array.from(el.children)).toEqual(before);
      expect(el.querySelector('ol, li')).toBeNull();
      expect(el.querySelector('[data-separator]')).toBeNull();
      expect(customElements.get('void-breadcrumbs-item')).toBeUndefined();
    });

    it('does not mark a current page by itself: the author does with aria-current', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<void-breadcrumbs-item>A</void-breadcrumbs-item><void-breadcrumbs-item>B</void-breadcrumbs-item>';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('[aria-current]')).toBeNull();
    });

    it('sends the separator to the theme as a CSS string and follows changes', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.style.getPropertyValue('--_void-breadcrumbs-separator')).toBe('"/"');
      el.separator = '›';
      await el.updateComplete;
      expect(el.style.getPropertyValue('--_void-breadcrumbs-separator')).toBe('"›"');
    });

    it('keeps the author items in a keyed reorder (the same nodes, the new order)', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<void-breadcrumbs-item id="a">A</void-breadcrumbs-item><void-breadcrumbs-item id="b">B</void-breadcrumbs-item><void-breadcrumbs-item id="c">C</void-breadcrumbs-item>';
      document.body.appendChild(el);
      await el.updateComplete;
      const [a, b, c] = Array.from(el.children);
      el.append(c!, a!, b!);
      await el.updateComplete;
      expect(Array.from(el.children).map(n => n.id)).toEqual(['c', 'a', 'b']);
      expect(Array.from(el.children)).toEqual([c, a, b]);
    });
  });
});
