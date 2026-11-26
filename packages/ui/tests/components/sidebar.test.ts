// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidSidebar } from '../../src/components/sidebar.js';

const TAG = 'void-sidebar';

async function mount(props: Partial<VoidSidebar> = {}): Promise<VoidSidebar> {
  const el = document.createElement(TAG) as VoidSidebar;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const widthVar = (el: HTMLElement) => el.style.getPropertyValue('--void-sidebar-width');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidSidebar', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidSidebar.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-sidebar', () => {
      expect(customElements.get(TAG)).toBe(VoidSidebar);
    });
  });

  describe('default property values', () => {
    const el = document.createElement(TAG) as VoidSidebar;
    it('collapsed defaults to false', () => expect(el.collapsed).toBe(false));
    it('width defaults to the theme token', () => expect(el.width).toBe('var(--void-sidebar-width)'));
    it('collapsedWidth defaults to the theme token', () =>
      expect(el.collapsedWidth).toBe('var(--void-sidebar-collapsed-width)'));
    it('side defaults to "left"', () => expect(el.side).toBe('left'));
  });

  describe('attribute reflection', () => {
    it('reflects collapsed, width, collapsedWidth and side', async () => {
      const el = await mount({ collapsed: true, width: '300px', collapsedWidth: '48px', side: 'right' });
      expect(el.hasAttribute('collapsed')).toBe(true);
      expect(el.getAttribute('width')).toBe('300px');
      expect(el.getAttribute('collapsed-width')).toBe('48px');
      expect(el.getAttribute('side')).toBe('right');
    });

    it('reads the collapsed attribute', async () => {
      const el = await mount();
      el.setAttribute('collapsed', '');
      await el.updateComplete;
      expect(el.collapsed).toBe(true);
    });
  });

  describe('ARIA', () => {
    it('is a navigation landmark with an accessible name', async () => {
      const el = await mount();
      expect(el.getAttribute('role')).toBe('navigation');
      expect(el.getAttribute('aria-label')).toBe('Sidebar navigation');
    });
  });

  describe('width variable', () => {
    it('sets --void-sidebar-width to the expanded width when open', async () => {
      const el = await mount({ width: '280px', collapsedWidth: '56px' });
      expect(widthVar(el)).toBe('280px');
    });

    it('sets --void-sidebar-width to the collapsed width when collapsed', async () => {
      const el = await mount({ width: '280px', collapsedWidth: '56px', collapsed: true });
      expect(widthVar(el)).toBe('56px');
    });

    it('updates when collapsed toggles', async () => {
      const el = await mount({ width: '280px', collapsedWidth: '56px' });
      el.collapsed = true;
      await el.updateComplete;
      expect(widthVar(el)).toBe('56px');
      el.collapsed = false;
      await el.updateComplete;
      expect(widthVar(el)).toBe('280px');
    });

    it('updates when width changes while expanded', async () => {
      const el = await mount({ width: '280px' });
      el.width = '320px';
      await el.updateComplete;
      expect(widthVar(el)).toBe('320px');
    });

    it('updates when collapsedWidth changes while collapsed', async () => {
      const el = await mount({ collapsed: true, collapsedWidth: '56px' });
      el.collapsedWidth = '64px';
      await el.updateComplete;
      expect(widthVar(el)).toBe('64px');
    });

    it('does not apply the collapsed width while expanded', async () => {
      const el = await mount({ width: '280px', collapsedWidth: '56px' });
      el.collapsedWidth = '10px';
      await el.updateComplete;
      expect(widthVar(el)).toBe('280px');
    });

    it('falls back to the theme tokens by default', async () => {
      const el = await mount();
      expect(widthVar(el)).toBe('var(--void-sidebar-width)');
      el.collapsed = true;
      await el.updateComplete;
      expect(widthVar(el)).toBe('var(--void-sidebar-collapsed-width)');
    });
  });

  describe('void-collapse and void-expand events', () => {
    it('is dispatched by toggle() with the new collapsed state', async () => {
      const el = await mount();
      const details: unknown[] = [];
      el.addEventListener('void-collapse', (e) => details.push(['collapse', (e as CustomEvent).detail]));
      el.addEventListener('void-expand', (e) => details.push(['expand', (e as CustomEvent).detail]));
      el.toggle();
      await el.updateComplete;
      el.toggle(false);
      el.toggle(false);
      await el.updateComplete;
      expect(details).toEqual([['collapse', { reason: 'api' }], ['expand', { reason: 'api' }]]);
      expect(el.collapsed).toBe(false);
    });

    it('is not dispatched when collapsed is set in code or by the server', async () => {
      const el = await mount();
      let count = 0;
      for (const name of ['void-collapse', 'void-expand']) el.addEventListener(name, () => count++);
      el.collapsed = true;
      await el.updateComplete;
      el.removeAttribute('collapsed');
      await el.updateComplete;
      expect(count).toBe(0);
      expect(el.collapsed).toBe(false);
    });

    it('does not bubble, like void-open and void-close', async () => {
      const el = await mount();
      let ev: CustomEvent | null = null;
      el.addEventListener('void-collapse', (e) => { ev = e as CustomEvent; }, { once: true });
      el.toggle();
      await el.updateComplete;
      expect(ev!.bubbles).toBe(false);
    });

    it('is not dispatched for width changes', async () => {
      const el = await mount();
      let count = 0;
      for (const name of ['void-collapse', 'void-expand']) el.addEventListener(name, () => count++);
      el.width = '1px';
      await el.updateComplete;
      expect(count).toBe(0);
    });

    it('is not dispatched on initial render', async () => {
      const el = document.createElement(TAG) as VoidSidebar;
      let count = 0;
      for (const name of ['void-collapse', 'void-expand']) el.addEventListener(name, () => count++);
      document.body.appendChild(el);
      await el.updateComplete;
      expect(count).toBe(0);
    });
  });
});
