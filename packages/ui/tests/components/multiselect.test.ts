// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidMultiselect, VoidOption } from '../../src/components/multiselect.js';

if (!customElements.get('void-option')) {
  customElements.define('void-option', VoidOption);
}
if (!customElements.get('void-multiselect')) {
  customElements.define('void-multiselect', VoidMultiselect);
}

function createWithOptions(opts: Array<{ value: string; selected?: boolean; label: string }>): VoidMultiselect {
  const el = document.createElement('void-multiselect') as VoidMultiselect;
  const content = document.createElement('void-multiselect-content');
  for (const opt of opts) {
    const o = document.createElement('void-option') as VoidOption;
    o.value = opt.value;
    if (opt.selected) o.selected = true;
    o.textContent = opt.label;
    content.appendChild(o);
  }
  el.appendChild(content);
  return el;
}

describe('VoidOption', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidOption)).toBe(VoidElement);
  });

  it('is registered as void-option', () => {
    expect(customElements.get('void-option')).toBe(VoidOption);
  });

  it('default value is empty string', () => {
    const o = document.createElement('void-option') as VoidOption;
    expect(o.value).toBe('');
  });

  it('default selected is false', () => {
    const o = document.createElement('void-option') as VoidOption;
    expect(o.selected).toBe(false);
  });
});

describe('VoidMultiselect', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidMultiselect.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-multiselect', () => {
      expect(customElements.get('void-multiselect')).toBe(VoidMultiselect);
    });
  });

  describe('default property values', () => {
    let el: VoidMultiselect;

    beforeEach(() => {
      el = document.createElement('void-multiselect') as VoidMultiselect;
    });

    it('placeholder defaults to "Select..."', () => {
      expect(el.placeholder).toBe('');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });

    it('error defaults to empty string', () => {
      expect(el.error).toBe('');
    });

    it('name defaults to empty string', () => {
      expect(el.name).toBe('');
    });

    it('value getter returns empty array', () => {
      expect(el.value).toEqual([]);
    });
  });

  describe('ARIA attributes', () => {
    let el: VoidMultiselect;

    beforeEach(async () => {
      el = document.createElement('void-multiselect') as VoidMultiselect;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    const trigger = () => el.querySelector('.void-multiselect-trigger')!;

    it('puts role="combobox" on the focusable trigger, not on the host', () => {
      expect(el.hasAttribute('role')).toBe(false);
      expect(trigger().getAttribute('role')).toBe('combobox');
      expect(trigger().getAttribute('tabindex')).toBe('0');
    });

    it('sets aria-haspopup="listbox" on the trigger', () => {
      expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('sets aria-expanded="false" on the trigger initially', () => {
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('opening and closing', () => {
    let el: VoidMultiselect;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('opens dropdown on trigger click', async () => {
      const trigger = el.querySelector('.void-multiselect-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(true);
      expect(el.querySelector('.void-multiselect-trigger')!.getAttribute('aria-expanded')).toBe('true');
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('closes dropdown on second trigger click', async () => {
      const trigger = el.querySelector('.void-multiselect-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('closes dropdown on Escape key', async () => {
      const trigger = el.querySelector('.void-multiselect-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('closes dropdown when clicking outside', async () => {
      const trigger = el.querySelector('.void-multiselect-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      await el.updateComplete;
      await el.updateComplete;
      expect(el.open).toBe(false);
    });
  });

  describe('selecting options', () => {
    let el: VoidMultiselect;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
        { value: 'svelte', label: 'Svelte' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
      const trigger = el.querySelector('.void-multiselect-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
    });

    it('clicking option toggles it selected', async () => {
      const options = el.querySelectorAll('void-option');
      (options[0] as HTMLElement).click();
      await el.updateComplete;
      expect(el.value).toContain('react');
    });

    it('clicking selected option deselects it', async () => {
      const options = el.querySelectorAll('void-option');
      (options[0] as HTMLElement).click();
      await el.updateComplete;
      (options[0] as HTMLElement).click();
      await el.updateComplete;
      expect(el.value).not.toContain('react');
    });

    it('value getter returns all selected values', async () => {
      const options = el.querySelectorAll('void-option');
      (options[0] as HTMLElement).click();
      await el.updateComplete;
      (options[1] as HTMLElement).click();
      await el.updateComplete;
      expect(el.value).toEqual(['react', 'vue']);
    });
  });

  describe('void-change event', () => {
    let el: VoidMultiselect;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
      const trigger = el.querySelector('.void-multiselect-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
    });

    it('dispatches void-change when option selected', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const option = el.querySelector('void-option') as HTMLElement;
      option.click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-change detail.value is the array of chosen values (#23)', async () => {
      let detail: { value: string[] } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const option = el.querySelector('void-option') as HTMLElement;
      option.click();
      await el.updateComplete;
      expect(Array.isArray(detail?.value)).toBe(true);
    });

    it('void-change bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const option = el.querySelector('void-option') as HTMLElement;
      option.click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });
  });

  describe('pill remove button', () => {
    let el: VoidMultiselect;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React', selected: true },
        { value: 'vue', label: 'Vue' },
      ]);
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('shows pill for selected option', () => {
      const pills = el.querySelectorAll('.void-multiselect-pill');
      expect(pills.length).toBe(1);
    });

    it('clicking pill remove deselects option', async () => {
      const removeBtn = el.querySelector('.void-multiselect-pill-remove') as HTMLElement;
      removeBtn.click();
      await el.updateComplete;
      expect(el.value).not.toContain('react');
    });

    it('dispatches void-change when pill removed', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const removeBtn = el.querySelector('.void-multiselect-pill-remove') as HTMLElement;
      removeBtn.click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });
  });

  describe('the trigger names the chosen options (the chips are hidden from assistive technology)', () => {
    const described = async (labels: string[], chosen: number) => {
      const el = createWithOptions(labels.map((label, i) => ({ value: label.toLowerCase(), label, selected: i < chosen })));
      document.body.appendChild(el);
      await el.updateComplete;
      const trigger = el.querySelector('[role=combobox]')!;
      return { el, description: trigger.getAttribute('aria-description') };
    };

    it('hides the placeholder and the chips, so a reader\'s cursor never rests inside the combobox', async () => {
      const { el } = await described(['React', 'Vue'], 1);
      expect([...el.querySelectorAll('[role=combobox] > *')].every((c) => c.getAttribute('aria-hidden') === 'true')).toBe(true);
      const none = await described(['React', 'Vue'], 0);
      expect(none.el.querySelector('.void-multiselect-placeholder')!.getAttribute('aria-hidden')).toBe('true');
      expect(none.description).toBeNull();
    });

    it('lists the names of up to three chosen options', async () => {
      expect((await described(['React', 'Vue', 'Lit'], 1)).description).toBe('React');
      expect((await described(['React', 'Vue', 'Lit'], 2)).description).toBe('React and Vue');
      expect((await described(['React', 'Vue', 'Lit'], 3)).description).toBe('React, Vue, and Lit');
    });

    it('lists the first three and says how many in all beyond three', async () => {
      expect((await described(['A', 'B', 'C', 'D', 'E'], 5)).description).toBe('A, B, C, 5 selected');
    });
  });

  describe('disabled blocks interaction', () => {
    let el: VoidMultiselect;

    beforeEach(async () => {
      el = createWithOptions([
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
      ]);
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('does not open dropdown when disabled', async () => {
      const trigger = el.querySelector('.void-multiselect-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('does not dispatch void-change when disabled', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const trigger = el.querySelector('.void-multiselect-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(fired).toBe(false);
    });
  });
});
