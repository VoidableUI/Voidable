// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidIndicator } from '../../src/components/indicator.js';

const TAG = 'void-indicator';

async function mount(props: Partial<VoidIndicator> = {}, inner = ''): Promise<VoidIndicator> {
  const el = document.createElement(TAG) as VoidIndicator;
  el.innerHTML = inner;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const dots = (el: Element) => el.querySelectorAll('.void-indicator-dot');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidIndicator', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidIndicator.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-indicator', () => {
      expect(customElements.get(TAG)).toBe(VoidIndicator);
    });
  });

  describe('default property values', () => {
    const el = document.createElement(TAG) as VoidIndicator;
    it('color defaults to "default"', () => expect(el.color).toBe('default'));
    it('placement defaults to "top-right"', () => expect(el.placement).toBe('top-right'));
    it('count defaults to null', () => expect(el.count).toBeNull());
    it('ping defaults to false', () => expect(el.ping).toBe(false));
    it('size defaults to "md"', () => expect(el.size).toBe('md'));
  });

  describe('attribute reflection', () => {
    it('reflects every property', async () => {
      const el = await mount({ color: 'error', placement: 'bottom-left', count: 3, ping: true, size: 'sm' });
      expect(el.getAttribute('color')).toBe('error');
      expect(el.getAttribute('placement')).toBe('bottom-left');
      expect(el.getAttribute('count')).toBe('3');
      expect(el.hasAttribute('ping')).toBe(true);
      expect(el.getAttribute('size')).toBe('sm');
    });

    it('parses the count attribute as a number', async () => {
      const el = await mount();
      el.setAttribute('count', '12');
      await el.updateComplete;
      expect(el.count).toBe(12);
      expect(dots(el)[0]!.textContent).toBe('12');
    });

    it('does not reflect a null count', async () => {
      const el = await mount();
      expect(el.hasAttribute('count')).toBe(false);
    });
  });

  describe('dot element', () => {
    it('appends exactly one dot span', async () => {
      const el = await mount();
      expect(dots(el)).toHaveLength(1);
      expect(dots(el)[0]!.tagName).toBe('SPAN');
    });

    it('keeps slotted content before the dot', async () => {
      const el = await mount({}, '<span id="child">icon</span>');
      expect(el.children[0]!.id).toBe('child');
      expect(el.lastElementChild!.className).toBe('void-indicator-dot');
    });

    it('is empty (a plain dot) without a count', async () => {
      const el = await mount();
      expect(dots(el)[0]!.textContent).toBe('');
    });

    it('shows the count', async () => {
      const el = await mount({ count: 7 });
      expect(dots(el)[0]!.textContent).toBe('7');
    });

    it('shows a count of zero rather than hiding it', async () => {
      const el = await mount({ count: 0 });
      expect(dots(el)[0]!.textContent).toBe('0');
    });

    it('updates when count changes', async () => {
      const el = await mount({ count: 1 });
      el.count = 99;
      await el.updateComplete;
      expect(dots(el)[0]!.textContent).toBe('99');
      el.count = null;
      await el.updateComplete;
      expect(dots(el)[0]!.textContent).toBe('');
    });

    it('is kept across disconnect and reconnect, never duplicated', async () => {
      const el = await mount({ count: 2 });
      const dot = dots(el)[0];
      el.remove();
      expect(dots(el)).toHaveLength(1);
      document.body.appendChild(el);
      await el.updateComplete;
      expect(dots(el)[0]).toBe(dot);
      await el.updateComplete;
      expect(dots(el)).toHaveLength(1);
      expect(dots(el)[0]!.textContent).toBe('2');
    });
  });

  describe('ARIA', () => {
    it('has role="status"', async () => {
      const el = await mount();
      expect(el.getAttribute('role')).toBe('status');
    });

    it('labels a plain dot as "notification"', async () => {
      const el = await mount();
      expect(el.getAttribute('aria-label')).toBe('notification');
    });

    it('labels a counted indicator with the count', async () => {
      const el = await mount({ count: 5 });
      expect(el.getAttribute('aria-label')).toBe('5 notifications');
    });

    it('updates the label when the count changes', async () => {
      const el = await mount({ count: 5 });
      el.count = 9;
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('9 notifications');
      el.count = null;
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('notification');
    });

    it('uses the singular for a count of one', async () => {
      const el = await mount({ count: 1 });
      expect(el.getAttribute('aria-label')).toBe('1 notification');
    });
  });
});
