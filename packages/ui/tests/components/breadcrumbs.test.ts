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

  describe('landmark (#123)', () => {
    let host: HTMLElement;
    beforeEach(() => {
      host = document.createElement('div');
      document.body.appendChild(host);
    });
    afterEach(() => host.remove());

    async function mountIn(markup: string): Promise<VoidBreadcrumbs> {
      host.innerHTML = markup;
      const el = host.querySelector('void-breadcrumbs') as VoidBreadcrumbs;
      await el.updateComplete;
      return el;
    }

    it('is a navigation landmark named Breadcrumb by default', async () => {
      const el = await mountIn('<void-breadcrumbs></void-breadcrumbs>');
      expect(el.getAttribute('role')).toBe('navigation');
      expect(el.getAttribute('aria-label')).toBe('Breadcrumb');
    });

    it('landmark="none" is a named group, not a landmark', async () => {
      const el = await mountIn('<void-breadcrumbs landmark="none"></void-breadcrumbs>');
      expect(el.getAttribute('role')).toBe('group');
      expect(el.getAttribute('aria-label')).toBe('Breadcrumb');
    });

    it('follows landmark changing at run time', async () => {
      const el = await mountIn('<void-breadcrumbs></void-breadcrumbs>');
      el.landmark = 'none';
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('group');
      el.landmark = 'navigation';
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('navigation');
    });

    it('is a group inside a nav or a role="navigation" ancestor, with or without the attribute', async () => {
      let el = await mountIn('<nav aria-label="Main"><void-breadcrumbs></void-breadcrumbs></nav>');
      expect(el.getAttribute('role')).toBe('group');
      el = await mountIn('<div role="navigation"><div><void-breadcrumbs landmark="navigation"></void-breadcrumbs></div></div>');
      expect(el.getAttribute('role')).toBe('group');
    });

    it('follows a move into and out of a nav', async () => {
      const el = await mountIn('<void-breadcrumbs></void-breadcrumbs><nav id="n"></nav>');
      host.querySelector('#n')!.append(el);
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('group');
      host.append(el);
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('navigation');
    });

    it('keeps the list and item roles in either form', async () => {
      const el = await mountIn(
        '<void-breadcrumbs landmark="none"><void-breadcrumbs-list><void-breadcrumbs-item>A</void-breadcrumbs-item></void-breadcrumbs-list></void-breadcrumbs>',
      );
      expect(el.querySelector('void-breadcrumbs-list')!.getAttribute('role')).toBe('list');
      expect(el.querySelector('void-breadcrumbs-item')!.getAttribute('role')).toBe('listitem');
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
    const trail = (inner: string) => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = `<void-breadcrumbs-list>${inner}</void-breadcrumbs-list>`;
      document.body.appendChild(el);
      return el;
    };
    const itemsOf = () => Array.from(el.querySelectorAll('void-breadcrumbs-item'));

    afterEach(() => {
      el?.remove();
    });

    it('renders nothing of its own: the author list and items stay the nodes, in order', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<void-breadcrumbs-list><void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item><void-breadcrumbs-item aria-current="page">Page</void-breadcrumbs-item></void-breadcrumbs-list>';
      const list = el.firstElementChild!;
      const before = Array.from(list.children);
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.firstElementChild).toBe(list);
      expect(Array.from(list.children)).toEqual(before);
      expect(el.querySelector('ol, ul, li')).toBeNull();
      expect(el.querySelector('[data-separator]')).toBeNull();
      expect(customElements.get('void-breadcrumbs-list')).toBeUndefined();
      expect(customElements.get('void-breadcrumbs-item')).toBeUndefined();
    });

    it('gives the list part role="list" and every item role="listitem"', async () => {
      trail('<void-breadcrumbs-item><a href="/">A</a></void-breadcrumbs-item><void-breadcrumbs-item><a href="/b">B</a></void-breadcrumbs-item><void-breadcrumbs-item aria-current="page">C</void-breadcrumbs-item>');
      await el.updateComplete;
      expect(el.querySelector('void-breadcrumbs-list')!.getAttribute('role')).toBe('list');
      expect(itemsOf().map(i => i.getAttribute('role'))).toEqual(['listitem', 'listitem', 'listitem']);
    });

    it('wires an item added later and takes the role off a removed one', async () => {
      trail('<void-breadcrumbs-item>A</void-breadcrumbs-item>');
      await el.updateComplete;
      const list = el.querySelector('void-breadcrumbs-list')!;
      const added = document.createElement('void-breadcrumbs-item');
      list.appendChild(added);
      await new Promise(r => setTimeout(r));
      expect(added.getAttribute('role')).toBe('listitem');
      added.remove();
      await new Promise(r => setTimeout(r));
      expect(added.hasAttribute('role')).toBe(false);
    });

    it('keeps roles through a keyed reorder (the same nodes, the new order)', async () => {
      trail('<void-breadcrumbs-item id="a">A</void-breadcrumbs-item><void-breadcrumbs-item id="b">B</void-breadcrumbs-item><void-breadcrumbs-item id="c">C</void-breadcrumbs-item>');
      await el.updateComplete;
      const list = el.querySelector('void-breadcrumbs-list')!;
      const [a, b, c] = Array.from(list.children);
      list.append(c!, a!, b!);
      await new Promise(r => setTimeout(r));
      expect(Array.from(list.children)).toEqual([c, a, b]);
      expect(itemsOf().every(i => i.getAttribute('role') === 'listitem')).toBe(true);
    });

    it('gives no role to an item outside the list part (the dev warning reports it)', async () => {
      el = document.createElement('void-breadcrumbs') as VoidBreadcrumbs;
      el.innerHTML = '<void-breadcrumbs-item>Loose</void-breadcrumbs-item>';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('void-breadcrumbs-item')!.hasAttribute('role')).toBe(false);
    });

    it('does not mark a current page by itself: the author does with aria-current', async () => {
      trail('<void-breadcrumbs-item>A</void-breadcrumbs-item><void-breadcrumbs-item>B</void-breadcrumbs-item>');
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
  });
});
