// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidList, VoidListItem } from '../../src/components/list.js';

if (!customElements.get('void-list')) {
  customElements.define('void-list', VoidList);
}
if (!customElements.get('void-list-item')) {
  customElements.define('void-list-item', VoidListItem);
}

describe('VoidList', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidList)).toBe(VoidElement);
  });

  it('is registered as void-list', () => {
    expect(customElements.get('void-list')).toBe(VoidList);
  });

  it('dividers defaults to false', () => {
    const el = document.createElement('void-list') as VoidList;
    expect(el.dividers).toBe(false);
  });

  it('sets role="list" when connected', async () => {
    const el = document.createElement('void-list') as VoidList;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('list');
    document.body.removeChild(el);
  });

  it('reflects dividers property to attribute', async () => {
    const el = document.createElement('void-list') as VoidList;
    document.body.appendChild(el);
    el.dividers = true;
    await el.updateComplete;
    expect(el.hasAttribute('dividers')).toBe(true);
    document.body.removeChild(el);
  });

  it('removes dividers attribute when set to false', async () => {
    const el = document.createElement('void-list') as VoidList;
    document.body.appendChild(el);
    el.dividers = true;
    await el.updateComplete;
    el.dividers = false;
    await el.updateComplete;
    expect(el.hasAttribute('dividers')).toBe(false);
    document.body.removeChild(el);
  });

  it('createRenderRoot returns the element itself', () => {
    const el = document.createElement('void-list') as VoidList;
    expect(el.createRenderRoot()).toBe(el);
  });
});

describe('VoidListItem', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidListItem)).toBe(VoidElement);
  });

  it('is registered as void-list-item', () => {
    expect(customElements.get('void-list-item')).toBe(VoidListItem);
  });

  describe('default properties', () => {
    it('selected defaults to false', () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      expect(el.selected).toBe(false);
    });

    it('disabled defaults to false', () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      expect(el.disabled).toBe(false);
    });

    it('interactive defaults to false', () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      expect(el.interactive).toBe(false);
    });
  });

  describe('role', () => {
    it('sets role="listitem" when connected', async () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      container.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('listitem');
    });
  });

  describe('attribute reflection', () => {
    it('reflects selected to attribute', async () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      container.appendChild(el);
      el.selected = true;
      await el.updateComplete;
      expect(el.hasAttribute('selected')).toBe(true);
    });

    it('reflects disabled to attribute', async () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      container.appendChild(el);
      el.disabled = true;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('reflects interactive to attribute', async () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      container.appendChild(el);
      el.interactive = true;
      await el.updateComplete;
      expect(el.hasAttribute('interactive')).toBe(true);
    });
  });

  describe('void-click event', () => {
    it('dispatches void-click when interactive and clicked', async () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      el.interactive = true;
      container.appendChild(el);
      await el.updateComplete;
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.click();
      expect(fired).toBe(true);
    });

    it('does not dispatch void-click when not interactive', async () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      container.appendChild(el);
      await el.updateComplete;
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.click();
      expect(fired).toBe(false);
    });

    it('does not dispatch void-click when disabled', async () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      el.interactive = true;
      el.disabled = true;
      container.appendChild(el);
      await el.updateComplete;
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.click();
      expect(fired).toBe(false);
    });

    it('void-click bubbles', async () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      el.interactive = true;
      container.appendChild(el);
      await el.updateComplete;
      let firedOnParent = false;
      container.addEventListener('void-click', () => { firedOnParent = true; }, { once: true });
      el.click();
      expect(firedOnParent).toBe(true);
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-list-item') as VoidListItem;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
