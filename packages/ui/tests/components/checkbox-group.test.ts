// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCheckboxGroup } from '../../src/components/checkbox-group.js';
import { VoidCheckbox } from '../../src/components/checkbox.js';

if (!customElements.get('void-checkbox')) {
  customElements.define('void-checkbox', VoidCheckbox);
}
if (!customElements.get('void-checkbox-group')) {
  customElements.define('void-checkbox-group', VoidCheckboxGroup);
}

const TAG = 'void-checkbox-group';

function createGroup(label = '', orientation: 'vertical' | 'horizontal' = 'vertical'): VoidCheckboxGroup {
  const el = document.createElement(TAG) as VoidCheckboxGroup;
  if (label) el.label = label;
  el.orientation = orientation;
  return el;
}

function addCheckbox(group: VoidCheckboxGroup, value: string, checked = false): VoidCheckbox {
  const cb = document.createElement('void-checkbox') as VoidCheckbox;
  cb.value = value;
  if (checked) cb.checked = true;
  group.appendChild(cb);
  return cb;
}

describe('VoidCheckboxGroup', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidCheckboxGroup)).toBe(VoidElement);
    });

    it('is registered as void-checkbox-group', () => {
      expect(customElements.get(TAG)).toBe(VoidCheckboxGroup);
    });
  });

  describe('default property values', () => {
    let el: VoidCheckboxGroup;

    beforeEach(() => {
      el = createGroup();
    });

    it('label defaults to empty string', () => {
      expect(el.label).toBe('');
    });

    it('orientation defaults to "vertical"', () => {
      expect(el.orientation).toBe('vertical');
    });

    it('value defaults to empty array', () => {
      expect(el.value).toEqual([]);
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidCheckboxGroup;

    beforeEach(() => {
      el = createGroup('Pick options');
      document.body.appendChild(el);
    });

    it('sets role="group" on connect', () => {
      expect(el.getAttribute('role')).toBe('group');
    });

    it('sets aria-label from label on connect', () => {
      expect(el.getAttribute('aria-label')).toBe('Pick options');
    });

    it('updates aria-label when label changes', async () => {
      el.label = 'New label';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('New label');
    });

    it('removes aria-label when label cleared', async () => {
      el.label = '';
      await el.updateComplete;
      expect(el.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('orientation attribute', () => {
    it('reflects orientation="vertical"', async () => {
      const el = createGroup('', 'vertical');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('vertical');
    });

    it('reflects orientation="horizontal"', async () => {
      const el = createGroup('', 'horizontal');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('horizontal');
    });
  });

  describe('value getter', () => {
    let el: VoidCheckboxGroup;

    beforeEach(async () => {
      el = createGroup('Test');
      addCheckbox(el, 'a', true);
      addCheckbox(el, 'b', false);
      addCheckbox(el, 'c', true);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('returns values of checked checkboxes', () => {
      expect(el.value).toContain('a');
      expect(el.value).toContain('c');
    });

    it('does not include unchecked checkbox values', () => {
      expect(el.value).not.toContain('b');
    });

    it('returns empty array when no checkboxes checked', async () => {
      const el2 = createGroup('Empty');
      addCheckbox(el2, 'x', false);
      document.body.appendChild(el2);
      await el2.updateComplete;
      expect(el2.value).toEqual([]);
    });
  });

  describe('label rendering', () => {
    it('renders label span when label is set', async () => {
      const el = createGroup('My Group');
      document.body.appendChild(el);
      await el.updateComplete;
      const span = el.querySelector('.void-checkbox-group-label');
      expect(span?.textContent).toBe('My Group');
    });

    it('does not render label span when label is empty', async () => {
      const el = createGroup('');
      document.body.appendChild(el);
      await el.updateComplete;
      const span = el.querySelector('.void-checkbox-group-label');
      expect(span).toBeNull();
    });
  });

  describe('items container', () => {
    it('renders .void-checkbox-group-items container', async () => {
      const el = createGroup('Test');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('.void-checkbox-group-items')).not.toBeNull();
    });

    it('moves child checkboxes into items container after setup', async () => {
      const el = createGroup('Test');
      addCheckbox(el, 'a');
      addCheckbox(el, 'b');
      document.body.appendChild(el);
      await el.updateComplete;
      const container = el.querySelector('.void-checkbox-group-items');
      expect(container?.querySelectorAll('void-checkbox').length).toBe(2);
    });
  });

  describe('void-change event', () => {
    let el: VoidCheckboxGroup;
    let cb: VoidCheckbox;

    beforeEach(async () => {
      el = createGroup('Events');
      cb = addCheckbox(el, 'alpha');
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-change when a child checkbox is clicked', () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      cb.click();
      expect(fired).toBe(true);
    });

    it('void-change detail contains values array', () => {
      let detail: { values: string[] } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      cb.click();
      expect(detail).not.toBeNull();
      expect(Array.isArray(detail!.values)).toBe(true);
    });

    it('void-change detail.values includes newly checked value', () => {
      let detail: { values: string[] } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      cb.click();
      expect(detail!.values).toContain('alpha');
    });

    it('stops propagation of the child void-change event', () => {
      let outerFired = false;
      document.body.addEventListener('void-change', (e) => {
        if ((e as CustomEvent).detail?.checked !== undefined) outerFired = true;
      }, { once: true });
      cb.click();
      expect(outerFired).toBe(false);
    });

    it('void-change bubbles from the group', () => {
      let firedOnBody = false;
      document.body.addEventListener('void-change', (e) => {
        if ((e as CustomEvent).detail?.values) firedOnBody = true;
      }, { once: true });
      cb.click();
      expect(firedOnBody).toBe(true);
    });
  });
});
