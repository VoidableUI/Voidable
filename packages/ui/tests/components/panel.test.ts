// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidPanel } from '../../src/components/panel.js';

const TAG = 'void-panel';

function createElement(): VoidPanel {
  return document.createElement(TAG) as VoidPanel;
}

describe('VoidPanel', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidPanel)).toBe(VoidElement);
    });

    it('is registered as void-panel', () => {
      expect(customElements.get(TAG)).toBe(VoidPanel);
    });
  });

  describe('default property values', () => {
    let el: VoidPanel;

    beforeEach(() => {
      el = createElement();
    });

    it('variant defaults to "default"', () => {
      expect(el.variant).toBe('default');
    });
  });

  describe('ARIA', () => {
    let el: VoidPanel;

    beforeEach(() => {
      document.body.innerHTML = '';
      el = createElement();
      document.body.appendChild(el);
    });

    it('sets role="region" on connect', () => {
      expect(el.getAttribute('role')).toBe('region');
    });

    it('is unnamed without a title part or an aria-label', () => {
      expect(el.getAttribute('aria-label')).toBeNull();
      expect(el.getAttribute('aria-labelledby')).toBeNull();
    });

    it('is named by its title part', async () => {
      el.innerHTML = '<void-panel-header><void-panel-title>Settings</void-panel-title></void-panel-header><void-panel-body>x</void-panel-body>';
      await new Promise(r => setTimeout(r, 0));
      const title = el.querySelector('void-panel-title')!;
      expect(title.id).toMatch(/^void-panel-title-/);
      expect(el.getAttribute('aria-labelledby')).toBe(title.id);
    });

    it('keeps an author id on the title', async () => {
      el.innerHTML = '<void-panel-header><void-panel-title id="t">Settings</void-panel-title></void-panel-header>';
      await new Promise(r => setTimeout(r, 0));
      expect(el.getAttribute('aria-labelledby')).toBe('t');
      expect(el.querySelector('void-panel-title')!.id).toBe('t');
    });

    it('leaves an author aria-label alone', async () => {
      el.setAttribute('aria-label', 'Mine');
      el.innerHTML = '<void-panel-header><void-panel-title>Settings</void-panel-title></void-panel-header>';
      await new Promise(r => setTimeout(r, 0));
      expect(el.getAttribute('aria-label')).toBe('Mine');
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('leaves an author aria-labelledby alone', async () => {
      el.setAttribute('aria-labelledby', 'other');
      el.innerHTML = '<void-panel-header><void-panel-title>Settings</void-panel-title></void-panel-header>';
      await new Promise(r => setTimeout(r, 0));
      expect(el.getAttribute('aria-labelledby')).toBe('other');
    });

    it('lets go of the name when the title part is removed', async () => {
      el.innerHTML = '<void-panel-header><void-panel-title>Settings</void-panel-title></void-panel-header>';
      await new Promise(r => setTimeout(r, 0));
      el.querySelector('void-panel-header')!.remove();
      await new Promise(r => setTimeout(r, 0));
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('variant reflection', () => {
    let el: VoidPanel;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('reflects variant property to attribute', async () => {
      el.variant = 'bordered';
      await el.updateComplete;
      expect(el.getAttribute('variant')).toBe('bordered');
    });

    it('reflects elevated variant to attribute', async () => {
      el.variant = 'elevated';
      await el.updateComplete;
      expect(el.getAttribute('variant')).toBe('elevated');
    });

    it('reads variant from attribute', () => {
      el.setAttribute('variant', 'bordered');
      expect(el.variant).toBe('bordered');
    });
  });

  describe('parts', () => {
    it('renders nothing of its own and never moves the author\'s nodes', async () => {
      const el = createElement();
      el.innerHTML = '<void-panel-header><void-panel-title>T</void-panel-title></void-panel-header><void-panel-body><p>x</p></void-panel-body>';
      const before = Array.from(el.querySelectorAll('*'));
      document.body.appendChild(el);
      await el.updateComplete;
      expect(Array.from(el.querySelectorAll('*'))).toEqual(before);
      expect(el.querySelector('.void-panel-label')).toBeNull();
    });
  });
});
