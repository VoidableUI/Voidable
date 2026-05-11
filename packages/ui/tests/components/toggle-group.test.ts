// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidToggleGroup } from '../../src/components/toggle-group.js';
import { VoidToggle } from '../../src/components/toggle.js';

if (!customElements.get('void-toggle')) {
  customElements.define('void-toggle', VoidToggle);
}
if (!customElements.get('void-toggle-group')) {
  customElements.define('void-toggle-group', VoidToggleGroup);
}

const TAG = 'void-toggle-group';

function createGroup(opts: Partial<{ value: string; multiple: boolean; disabled: boolean; size: string; color: string; orientation: string }> = {}): VoidToggleGroup {
  const el = document.createElement(TAG) as VoidToggleGroup;
  if (opts.value !== undefined) el.value = opts.value;
  if (opts.multiple !== undefined) el.multiple = opts.multiple;
  if (opts.disabled !== undefined) el.disabled = opts.disabled;
  if (opts.size !== undefined) el.size = opts.size as VoidToggleGroup['size'];
  if (opts.color !== undefined) el.color = opts.color as VoidToggleGroup['color'];
  if (opts.orientation !== undefined) el.orientation = opts.orientation as VoidToggleGroup['orientation'];
  return el;
}

function addToggle(group: VoidToggleGroup, value: string, label = ''): VoidToggle {
  const t = document.createElement('void-toggle') as VoidToggle;
  t.setAttribute('value', value);
  t.textContent = label || value;
  group.appendChild(t);
  return t;
}

describe('VoidToggleGroup', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidToggleGroup)).toBe(VoidElement);
    });

    it('is registered as void-toggle-group', () => {
      expect(customElements.get(TAG)).toBe(VoidToggleGroup);
    });
  });

  describe('default property values', () => {
    let el: VoidToggleGroup;

    beforeEach(() => {
      el = createGroup();
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('multiple defaults to false', () => {
      expect(el.multiple).toBe(false);
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('color defaults to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('orientation defaults to "horizontal"', () => {
      expect(el.orientation).toBe('horizontal');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidToggleGroup;

    beforeEach(() => {
      el = createGroup();
      document.body.appendChild(el);
    });

    it('sets role="group" on connect', () => {
      expect(el.getAttribute('role')).toBe('group');
    });
  });

  describe('attribute reflection', () => {
    it('reflects orientation="horizontal"', async () => {
      const el = createGroup({ orientation: 'horizontal' });
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('horizontal');
    });

    it('reflects orientation="vertical"', async () => {
      const el = createGroup({ orientation: 'vertical' });
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('vertical');
    });

    it('reflects multiple attribute', async () => {
      const el = createGroup({ multiple: true });
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.hasAttribute('multiple')).toBe(true);
    });

    it('reflects disabled attribute', async () => {
      const el = createGroup({ disabled: true });
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('reflects size attribute', async () => {
      const el = createGroup({ size: 'lg' });
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });

    it('reflects color attribute', async () => {
      const el = createGroup({ color: 'error' });
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('color')).toBe('error');
    });
  });

  describe('single mode (default)', () => {
    let el: VoidToggleGroup;
    let toggleA: VoidToggle;
    let toggleB: VoidToggle;
    let toggleC: VoidToggle;

    beforeEach(async () => {
      el = createGroup({ value: 'a' });
      toggleA = addToggle(el, 'a', 'A');
      toggleB = addToggle(el, 'b', 'B');
      toggleC = addToggle(el, 'c', 'C');
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('sets the initial pressed state on the matching toggle', () => {
      expect(toggleA.pressed).toBe(true);
      expect(toggleB.pressed).toBe(false);
      expect(toggleC.pressed).toBe(false);
    });

    it('updates value and pressed state when another toggle is clicked', () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      toggleB.click();
      expect(el.value).toBe('b');
      expect(toggleA.pressed).toBe(false);
      expect(toggleB.pressed).toBe(true);
      expect(detail?.value).toBe('b');
    });

    it('deselects the active toggle when clicked again', () => {
      toggleA.click();
      expect(el.value).toBe('');
      expect(toggleA.pressed).toBe(false);
    });
  });

  describe('multiple mode', () => {
    let el: VoidToggleGroup;
    let toggleA: VoidToggle;
    let toggleB: VoidToggle;
    let toggleC: VoidToggle;

    beforeEach(async () => {
      el = createGroup({ multiple: true, value: 'a,c' });
      toggleA = addToggle(el, 'a', 'A');
      toggleB = addToggle(el, 'b', 'B');
      toggleC = addToggle(el, 'c', 'C');
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('sets pressed state for all selected values', () => {
      expect(toggleA.pressed).toBe(true);
      expect(toggleB.pressed).toBe(false);
      expect(toggleC.pressed).toBe(true);
    });

    it('adds a value when a toggle is clicked', () => {
      let detail: { value: string[] } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      toggleB.click();
      expect(el.value).toBe('a,c,b');
      expect(toggleB.pressed).toBe(true);
      expect(detail?.value).toContain('b');
    });

    it('removes a value when a pressed toggle is clicked', () => {
      let detail: { value: string[] } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      toggleA.click();
      expect(el.value).toBe('c');
      expect(toggleA.pressed).toBe(false);
      expect(detail?.value).not.toContain('a');
    });

    it('fires void-change with an array detail', () => {
      let detail: { value: string[] } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      toggleB.click();
      expect(Array.isArray(detail?.value)).toBe(true);
    });
  });

  describe('propagation of size, color, disabled', () => {
    it('propagates size to child toggles', async () => {
      const el = createGroup({ size: 'lg' });
      const t = addToggle(el, 'x');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(t.size).toBe('lg');
    });

    it('propagates color to child toggles', async () => {
      const el = createGroup({ color: 'success' });
      const t = addToggle(el, 'x');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(t.color).toBe('success');
    });

    it('propagates disabled to child toggles', async () => {
      const el = createGroup({ disabled: true });
      const t = addToggle(el, 'x');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(t.disabled).toBe(true);
    });

    it('updates children when size changes', async () => {
      const el = createGroup({ size: 'sm' });
      const t = addToggle(el, 'x');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(t.size).toBe('sm');
      el.size = 'lg';
      await el.updateComplete;
      expect(t.size).toBe('lg');
    });
  });

  describe('void-change event', () => {
    let el: VoidToggleGroup;
    let toggle: VoidToggle;

    beforeEach(async () => {
      el = createGroup();
      toggle = addToggle(el, 'alpha');
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-change when a child toggle is clicked', () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      toggle.click();
      expect(fired).toBe(true);
    });

    it('void-change detail contains value', () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      toggle.click();
      expect(detail?.value).toBe('alpha');
    });

    it('stops propagation of the child void-change event', () => {
      let childFired = false;
      document.body.addEventListener('void-change', (e) => {
        if ((e as CustomEvent).detail?.pressed !== undefined) childFired = true;
      }, { once: true });
      toggle.click();
      expect(childFired).toBe(false);
    });

    it('void-change bubbles from the group', () => {
      let firedOnBody = false;
      document.body.addEventListener('void-change', (e) => {
        if ((e as CustomEvent).detail?.value !== undefined) firedOnBody = true;
      }, { once: true });
      toggle.click();
      expect(firedOnBody).toBe(true);
    });
  });
});
