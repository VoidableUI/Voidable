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

    it('label defaults to empty string', () => {
      expect(el.label).toBe('');
    });

    it('variant defaults to "default"', () => {
      expect(el.variant).toBe('default');
    });
  });

  describe('ARIA', () => {
    let el: VoidPanel;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('sets role="region" on connect', () => {
      expect(el.getAttribute('role')).toBe('region');
    });

    it('does not set aria-label when label is empty', () => {
      expect(el.getAttribute('aria-label')).toBeNull();
    });

    it('sets aria-label from label property on connect', () => {
      const el2 = createElement();
      el2.label = 'Settings';
      document.body.appendChild(el2);
      expect(el2.getAttribute('aria-label')).toBe('Settings');
    });

    it('updates aria-label when label property changes', async () => {
      el.label = 'Profile';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Profile');
    });

    it('removes aria-label when label is cleared', async () => {
      el.label = 'Profile';
      await el.updateComplete;
      el.label = '';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBeNull();
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

  describe('label rendering', () => {
    it('renders label div when label is set', async () => {
      const el = createElement();
      el.label = 'Notifications';
      document.body.appendChild(el);
      await el.updateComplete;
      const labelDiv = el.querySelector('.void-panel-label');
      expect(labelDiv).not.toBeNull();
      expect(labelDiv?.textContent).toBe('Notifications');
    });

    it('does not render label div when label is empty', async () => {
      const el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('.void-panel-label')).toBeNull();
    });
  });
});
