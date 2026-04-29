// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidStatusDot } from '../../src/components/status-dot.js';

if (!customElements.get('void-status-dot')) {
  customElements.define('void-status-dot', VoidStatusDot);
}

describe('VoidStatusDot', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidStatusDot)).toBe(VoidElement);
  });

  describe('default state', () => {
    let el: VoidStatusDot;

    beforeEach(() => {
      el = document.createElement('void-status-dot') as VoidStatusDot;
      document.body.appendChild(el);
    });

    it('has default status of offline', () => {
      expect(el.status).toBe('offline');
    });

    it('reflects status attribute', () => {
      expect(el.getAttribute('status')).toBe('offline');
    });

    it('sets role="status"', () => {
      expect(el.getAttribute('role')).toBe('status');
    });

    it('sets aria-label to "Offline" by default', () => {
      expect(el.getAttribute('aria-label')).toBe('Offline');
    });
  });

  describe('aria-label reflects status', () => {
    let el: VoidStatusDot;

    beforeEach(() => {
      el = document.createElement('void-status-dot') as VoidStatusDot;
      document.body.appendChild(el);
    });

    it('sets aria-label to "Online" when status is online', async () => {
      el.status = 'online';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Online');
    });

    it('sets aria-label to "Away" when status is away', async () => {
      el.status = 'away';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Away');
    });

    it('sets aria-label to "Offline" when status is offline', async () => {
      el.status = 'online';
      await el.updateComplete;
      el.status = 'offline';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Offline');
    });
  });

  describe('status updates', () => {
    it('updates aria-label when status changes', async () => {
      const el = document.createElement('void-status-dot') as VoidStatusDot;
      document.body.appendChild(el);

      expect(el.getAttribute('aria-label')).toBe('Offline');

      el.status = 'online';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Online');

      el.status = 'away';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Away');

      el.status = 'offline';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('Offline');
    });
  });
});
