// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidRadioGroup } from '../../src/components/radio-group.js';
import { VoidRadio } from '../../src/components/radio.js';

if (!customElements.get('void-radio')) {
  customElements.define('void-radio', VoidRadio);
}
if (!customElements.get('void-radio-group')) {
  customElements.define('void-radio-group', VoidRadioGroup);
}

function createGroup(options: { label?: string; value?: string; name?: string; orientation?: string } = {}): VoidRadioGroup {
  const el = document.createElement('void-radio-group') as VoidRadioGroup;
  if (options.label !== undefined) el.label = options.label;
  if (options.value !== undefined) el.value = options.value;
  if (options.name !== undefined) el.name = options.name;
  if (options.orientation !== undefined) el.orientation = options.orientation as 'vertical' | 'horizontal';
  for (const val of ['a', 'b', 'c']) {
    const radio = document.createElement('void-radio') as VoidRadio;
    radio.value = val;
    radio.textContent = `Option ${val.toUpperCase()}`;
    el.appendChild(radio);
  }
  return el;
}

describe('VoidRadioGroup', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidRadioGroup)).toBe(VoidElement);
    });

    it('is registered as void-radio-group', () => {
      expect(customElements.get('void-radio-group')).toBe(VoidRadioGroup);
    });
  });

  describe('default property values', () => {
    let el: VoidRadioGroup;

    beforeEach(() => {
      el = document.createElement('void-radio-group') as VoidRadioGroup;
    });

    it('label defaults to empty string', () => {
      expect(el.label).toBe('');
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('name defaults to empty string', () => {
      expect(el.name).toBe('');
    });

    it('orientation defaults to "vertical"', () => {
      expect(el.orientation).toBe('vertical');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidRadioGroup;

    beforeEach(async () => {
      el = createGroup({ label: 'Pick one' });
      container.appendChild(el);
      await el.updateComplete;
    });

    it('sets role="radiogroup" on connect', () => {
      expect(el.getAttribute('role')).toBe('radiogroup');
    });

    it('sets aria-label from label property on connect', () => {
      expect(el.getAttribute('aria-label')).toBe('Pick one');
    });

    it('updates aria-label when label changes', async () => {
      el.label = 'New label';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('New label');
    });
  });

  describe('orientation reflection', () => {
    it('reflects orientation attribute', async () => {
      const el = createGroup({ orientation: 'horizontal' });
      container.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('horizontal');
    });

    it('defaults to vertical attribute', async () => {
      const el = createGroup();
      container.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('vertical');
    });
  });

  describe('label rendering', () => {
    it('renders label element when label is set', async () => {
      const el = createGroup({ label: 'Group label' });
      container.appendChild(el);
      await el.updateComplete;
      const labelEl = el.querySelector('.void-radio-group-label');
      expect(labelEl).not.toBeNull();
      expect(labelEl?.textContent).toBe('Group label');
    });

    it('does not render label element when label is empty', async () => {
      const el = createGroup();
      container.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('.void-radio-group-label')).toBeNull();
    });
  });

  describe('name propagation', () => {
    it('sets name on all child radios when name is provided', async () => {
      const el = createGroup({ name: 'my-group' });
      container.appendChild(el);
      await el.updateComplete;
      const radios = Array.from(el.querySelectorAll('void-radio')) as VoidRadio[];
      for (const radio of radios) {
        expect(radio.name).toBe('my-group');
      }
    });

    it('updates child radio names when name property changes', async () => {
      const el = createGroup({ name: 'initial' });
      container.appendChild(el);
      await el.updateComplete;
      el.name = 'updated';
      await el.updateComplete;
      const radios = Array.from(el.querySelectorAll('void-radio')) as VoidRadio[];
      for (const radio of radios) {
        expect(radio.name).toBe('updated');
      }
    });
  });

  describe('single selection enforcement', () => {
    let el: VoidRadioGroup;

    beforeEach(async () => {
      el = createGroup({ value: 'a', name: 'test' });
      container.appendChild(el);
      await el.updateComplete;
    });

    it('only one radio is checked at a time after child click', async () => {
      const radios = Array.from(el.querySelectorAll('void-radio')) as VoidRadio[];
      radios[1].click();
      await el.updateComplete;
      const checkedCount = radios.filter(r => r.checked).length;
      expect(checkedCount).toBe(1);
    });

    it('updates value when a child radio is clicked', async () => {
      const radios = Array.from(el.querySelectorAll('void-radio')) as VoidRadio[];
      radios[1].click();
      await el.updateComplete;
      expect(el.value).toBe('b');
    });

    it('unchecks previously selected radio when new one is clicked', async () => {
      const radios = Array.from(el.querySelectorAll('void-radio')) as VoidRadio[];
      radios[0].checked = true;
      radios[1].click();
      await el.updateComplete;
      expect(radios[0].checked).toBe(false);
      expect(radios[1].checked).toBe(true);
    });
  });

  describe('void-change event', () => {
    let el: VoidRadioGroup;

    beforeEach(async () => {
      el = createGroup({ name: 'test' });
      container.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-change when a child radio is selected', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const radio = el.querySelector('void-radio') as VoidRadio;
      radio.click();
      expect(fired).toBe(true);
    });

    it('void-change detail contains the selected value', async () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const radios = Array.from(el.querySelectorAll('void-radio')) as VoidRadio[];
      radios[2].click();
      expect(detail?.value).toBe('c');
    });

    it('void-change bubbles', async () => {
      let firedOnParent = false;
      container.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const radio = el.querySelector('void-radio') as VoidRadio;
      radio.click();
      expect(firedOnParent).toBe(true);
    });

    it('does not re-emit the child void-change event', async () => {
      const events: Event[] = [];
      el.addEventListener('void-change', (e) => { events.push(e); });
      const radio = el.querySelector('void-radio') as VoidRadio;
      radio.click();
      expect(events.length).toBe(1);
    });
  });

  describe('child preservation', () => {
    it('preserves void-radio children in .void-radio-group-options after render', async () => {
      const el = createGroup({ name: 'test' });
      container.appendChild(el);
      await el.updateComplete;
      const optionsEl = el.querySelector('.void-radio-group-options');
      expect(optionsEl).not.toBeNull();
      const radios = optionsEl?.querySelectorAll('void-radio');
      expect(radios?.length).toBe(3);
    });
  });
});
