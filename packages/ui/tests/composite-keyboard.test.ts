// @vitest-environment happy-dom
// Keyboard and ARIA behaviour of the composite widgets that happy-dom can express: key events are
// dispatched on the focused element, state is read from the DOM. What it cannot cover (real focus
// order, the accessibility tree, axe, form submission by Enter, morphs) lives in the browser probes.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VoidCombobox } from '../src/components/combobox.js';
import { VoidMultiselect, VoidOption } from '../src/components/multiselect.js';
import { VoidTabs, VoidTabPanel } from '../src/components/tabs.js';
import { VoidTooltip } from '../src/components/tooltip.js';
import { VoidField } from '../src/components/field.js';
import { VoidInput } from '../src/components/input.js';
import { VoidCheckbox } from '../src/components/checkbox.js';
import { VoidRadio } from '../src/components/radio.js';
import { edgeEnabled, stepEnabled, Typeahead } from '../src/keyboard.js';

void [VoidRadio, VoidCheckbox, VoidCombobox, VoidMultiselect, VoidOption, VoidTabs, VoidTabPanel, VoidTooltip, VoidField, VoidInput];

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function press(el: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
}

interface Opt { value: string; label: string; disabled?: boolean; selected?: boolean }

function options(el: Element, opts: Opt[]): void {
  // The options live in the picker's content part (#52).
  let content = el.querySelector(`${el.localName}-content`);
  if (!content) {
    content = document.createElement(`${el.localName}-content`);
    el.appendChild(content);
  }
  for (const o of opts) {
    const opt = document.createElement('void-option') as VoidOption;
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.disabled) opt.disabled = true;
    if (o.selected) opt.selected = true;
    content.appendChild(opt);
  }
}

type VoidElementLike = HTMLElement & { updateComplete: Promise<boolean> };

const OPTS: Opt[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte', disabled: true },
  { value: 'lit', label: 'Lit' },
];

describe('keyboard helpers', () => {
  it('stepEnabled wraps and skips disabled entries', () => {
    const d = [false, true, false];
    expect(stepEnabled(d, 0, 1)).toBe(2);
    expect(stepEnabled(d, 2, 1)).toBe(0);
    expect(stepEnabled(d, 0, -1)).toBe(2);
    expect(stepEnabled(d, 0, 1, false)).toBe(2);
    expect(stepEnabled(d, 2, 1, false)).toBe(-1);
    expect(stepEnabled([true, true], 0, 1)).toBe(-1);
    expect(stepEnabled([], 0, 1)).toBe(-1);
  });

  it('edgeEnabled finds the first and last enabled entry', () => {
    expect(edgeEnabled([true, false, false, true], 1)).toBe(1);
    expect(edgeEnabled([true, false, false, true], -1)).toBe(2);
    expect(edgeEnabled([true], 1)).toBe(-1);
  });

  it('Typeahead builds a string, cycles repeated characters and times out', () => {
    vi.useFakeTimers();
    const t = new Typeahead(500);
    const labels = ['Apple', 'Avocado', 'Banana', 'Blueberry'];
    const none = [false, false, false, false];
    expect(t.match('a', labels, none, -1)).toBe(0);
    expect(t.match('v', labels, none, 0)).toBe(1);
    vi.advanceTimersByTime(600);
    expect(t.match('b', labels, none, 1)).toBe(2);
    expect(t.match('b', labels, none, 2)).toBe(3);
    vi.advanceTimersByTime(600);
    expect(t.match('z', labels, none, 3)).toBe(-1);
    vi.advanceTimersByTime(600);
    expect(t.match('a', labels, [true, false, false, false], -1)).toBe(1); // Apple disabled: Avocado
  });
});

describe('VoidCombobox keyboard', () => {
  async function mount(opts = OPTS): Promise<{ el: VoidCombobox; input: HTMLInputElement }> {
    const el = document.createElement('void-combobox') as VoidCombobox;
    options(el, opts);
    document.body.appendChild(el);
    await el.updateComplete;
    return { el, input: el.querySelector('input')! };
  }
  const active = (el: Element) => {
    const input = el.querySelector('input')!;
    const id = input.getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
  };

  it('closed: aria-expanded is false and there is no aria-activedescendant or aria-controls', async () => {
    const { input } = await mount();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(input.hasAttribute('aria-controls')).toBe(false);
  });

  it('ArrowDown opens the list and highlights the first enabled option', async () => {
    const { el, input } = await mount();
    const e = press(input, 'ArrowDown');
    await el.updateComplete;
    expect(e.defaultPrevented).toBe(true);
    expect(el.open).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(el.querySelector('[role=listbox]')!.id);
    expect(active(el)!.textContent).toBe('React');
    // The highlight is `active` (and aria-activedescendant); aria-selected marks the chosen option only.
    expect(active(el)!.hasAttribute('active')).toBe(true);
    expect(active(el)!.hasAttribute('aria-selected')).toBe(false);
  });

  it('ArrowUp opens the list on the last enabled option', async () => {
    const { el, input } = await mount();
    press(input, 'ArrowUp');
    await el.updateComplete;
    expect(active(el)!.textContent).toBe('Lit');
  });

  it('ArrowDown and ArrowUp move through the options, wrap, and skip disabled options', async () => {
    const { el, input } = await mount();
    press(input, 'ArrowDown');
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      press(input, 'ArrowDown');
      await el.updateComplete;
      seen.push(active(el)!.textContent!);
    }
    expect(seen).toEqual(['Vue', 'Lit', 'React', 'Vue']);
    press(input, 'ArrowUp');
    await el.updateComplete;
    expect(active(el)!.textContent).toBe('React');
  });

  it('marks the disabled option aria-disabled', async () => {
    const { el, input } = await mount();
    press(input, 'ArrowDown');
    await el.updateComplete;
    const opt = [...el.querySelectorAll('[role=option]')].find(o => o.textContent === 'Svelte')!;
    expect(opt.getAttribute('aria-disabled')).toBe('true');
  });

  it('Enter chooses the highlighted option, closes the list and fires void-change', async () => {
    const { el, input } = await mount();
    const changes: unknown[] = [];
    el.addEventListener('void-change', (e) => changes.push((e as CustomEvent).detail));
    press(input, 'ArrowDown');
    press(input, 'ArrowDown');
    await el.updateComplete;
    const e = press(input, 'Enter');
    await el.updateComplete;
    expect(e.defaultPrevented).toBe(true);
    expect(el.value).toBe('vue');
    expect(el.open).toBe(false);
    expect(changes).toEqual([{ value: 'vue' }]);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('Enter without a highlighted option is left alone, so a surrounding form submits', async () => {
    const { el, input } = await mount();
    expect(press(input, 'Enter').defaultPrevented).toBe(false); // closed
    input.dispatchEvent(new FocusEvent('focus'));
    await el.updateComplete;
    expect(el.open).toBe(true);
    expect(press(input, 'Enter').defaultPrevented).toBe(false); // open, nothing highlighted
    input.value = 'vu';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    expect(press(input, 'Enter').defaultPrevented).toBe(false); // filtered, still nothing highlighted
    expect(el.value).toBe('');
  });

  it('typing filters and clears the highlight', async () => {
    const { el, input } = await mount();
    press(input, 'ArrowDown');
    await el.updateComplete;
    input.value = 'l';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    // Filtered-out options stay in place, hidden (#52).
    expect([...el.querySelectorAll('[role=option]:not([hidden])')].map(o => o.textContent)).toEqual(['Svelte', 'Lit']);
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    press(input, 'ArrowDown');
    await el.updateComplete;
    expect(active(el)!.textContent).toBe('Lit');
  });

  it('Escape closes an open list, stops the key (a dialog around it stays) and a closed list lets it through', async () => {
    const { el, input } = await mount();
    const seen: string[] = [];
    document.addEventListener('keydown', (e) => seen.push(e.key), { once: false });
    press(input, 'ArrowDown');
    await el.updateComplete;
    const e = press(input, 'Escape');
    await el.updateComplete;
    expect(el.open).toBe(false);
    expect(e.defaultPrevented).toBe(true);
    expect(seen).not.toContain('Escape');
    press(input, 'Escape');
    expect(seen).toContain('Escape');
  });

  it('Alt+ArrowDown opens without highlighting', async () => {
    const { el, input } = await mount();
    press(input, 'ArrowDown', { altKey: true });
    await el.updateComplete;
    expect(el.open).toBe(true);
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('ArrowDown on a closed list starts at the chosen option', async () => {
    const { el, input } = await mount();
    el.value = 'lit';
    await el.updateComplete;
    press(input, 'ArrowDown');
    await el.updateComplete;
    expect(active(el)!.textContent).toBe('Lit');
  });

  it('reflects open as an attribute and puts no role or expanded state on the host', async () => {
    const { el, input } = await mount();
    expect(el.hasAttribute('open')).toBe(false);
    press(input, 'ArrowDown');
    await el.updateComplete;
    expect(el.hasAttribute('open')).toBe(true);
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-expanded')).toBe(false);
  });

  it('works with options that arrive after the first render', async () => {
    const { el, input } = await mount([]);
    options(el, [{ value: 'a', label: 'Alpha' }]);
    await new Promise((r) => setTimeout(r));
    await el.updateComplete;
    press(input, 'ArrowDown');
    await el.updateComplete;
    expect(active(el)!.textContent).toBe('Alpha');
  });

  it('a disabled combobox ignores keys', async () => {
    const { el, input } = await mount();
    el.disabled = true;
    await el.updateComplete;
    press(input, 'ArrowDown');
    await el.updateComplete;
    expect(el.open).toBe(false);
  });
});

describe('VoidMultiselect keyboard', () => {
  async function mount(opts = OPTS): Promise<{ el: VoidMultiselect; trigger: HTMLElement }> {
    const el = document.createElement('void-multiselect') as VoidMultiselect;
    options(el, opts);
    document.body.appendChild(el);
    await el.updateComplete;
    return { el, trigger: el.querySelector('.void-multiselect-trigger')! };
  }
  const active = (el: Element) => {
    const id = el.querySelector('.void-multiselect-trigger')!.getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
  };

  it('the trigger is the combobox: focusable, labelled, aria-expanded false', async () => {
    const { trigger } = await mount();
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('tabindex')).toBe('0');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Select...');
  });

  it.each(['Enter', ' ', 'ArrowDown', 'ArrowUp'])('%j opens the list and highlights the first option', async (key) => {
    const { el, trigger } = await mount();
    const e = press(trigger, key);
    await el.updateComplete;
    expect(e.defaultPrevented).toBe(true);
    expect(el.open).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(active(el)!.textContent!.trim()).toBe('React');
  });

  it('Home and End open on the first and last enabled option', async () => {
    const { el, trigger } = await mount();
    press(trigger, 'End');
    await el.updateComplete;
    expect(active(el)!.textContent!.trim()).toBe('Lit');
  });

  it('the listbox is multiselectable and options carry aria-selected', async () => {
    const { el, trigger } = await mount([{ value: 'a', label: 'A', selected: true }, { value: 'b', label: 'B' }]);
    press(trigger, 'Enter');
    await el.updateComplete;
    const list = el.querySelector('[role=listbox]')!;
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
    expect([...list.querySelectorAll('[role=option]')].map(o => o.getAttribute('aria-selected'))).toEqual(['true', null]);
    expect(list.querySelector('[role=option]')!.hasAttribute('tabindex')).toBe(false);
    expect(active(el)!.textContent!.trim()).toBe('A'); // starts on the first selected option
  });

  it('Enter and Space toggle the highlighted option and keep the list open', async () => {
    const { el, trigger } = await mount();
    const changes: unknown[] = [];
    el.addEventListener('void-change', (e) => changes.push((e as CustomEvent).detail));
    press(trigger, 'Enter');
    await el.updateComplete;
    press(trigger, ' ');
    await el.updateComplete;
    expect(el.value).toEqual(['react']);
    press(trigger, 'ArrowDown');
    press(trigger, 'Enter');
    await el.updateComplete;
    expect(el.value).toEqual(['react', 'vue']);
    expect(el.open).toBe(true);
    press(trigger, 'ArrowUp');
    press(trigger, ' ');
    await el.updateComplete;
    expect(el.value).toEqual(['vue']);
    expect(changes).toEqual([{ values: ['react'] }, { values: ['react', 'vue'] }, { values: ['vue'] }]);
  });

  it('skips disabled options and stops at the ends (select-only combobox pattern)', async () => {
    const { el, trigger } = await mount();
    press(trigger, 'End');
    press(trigger, 'ArrowUp');
    await el.updateComplete;
    expect(active(el)!.textContent!.trim()).toBe('Vue'); // Svelte skipped
    press(trigger, 'Home');
    press(trigger, 'ArrowUp');
    await el.updateComplete;
    expect(active(el)!.textContent!.trim()).toBe('React');
    press(trigger, 'End');
    press(trigger, 'ArrowDown');
    await el.updateComplete;
    expect(active(el)!.textContent!.trim()).toBe('Lit');
  });

  it('never toggles a disabled option', async () => {
    const { el, trigger } = await mount();
    press(trigger, 'Enter');
    await el.updateComplete;
    const svelte = [...el.querySelectorAll('[role=option]')].find(o => o.textContent!.includes('Svelte')) as HTMLElement;
    svelte.click();
    expect(el.value).toEqual([]);
  });

  it('typing jumps to the next option starting with the characters', async () => {
    const { el, trigger } = await mount();
    press(trigger, 'Enter');
    press(trigger, 'l');
    await el.updateComplete;
    expect(active(el)!.textContent!.trim()).toBe('Lit');
  });

  it('Escape closes the list and stops the key; Tab closes without preventing it', async () => {
    const { el, trigger } = await mount();
    press(trigger, 'Enter');
    await el.updateComplete;
    const esc = press(trigger, 'Escape');
    expect(esc.defaultPrevented).toBe(true);
    await el.updateComplete;
    expect(el.open).toBe(false);
    press(trigger, 'Enter');
    await el.updateComplete;
    const tab = press(trigger, 'Tab');
    expect(tab.defaultPrevented).toBe(false);
    await el.updateComplete;
    expect(el.open).toBe(false);
  });

  it('does not react to keys that bubble up from inside (a pill remove button)', async () => {
    const { el } = await mount([{ value: 'a', label: 'A', selected: true }]);
    const remove = el.querySelector('.void-multiselect-pill-remove')!;
    expect(remove.getAttribute('tabindex')).toBe('-1');
    press(remove, 'Enter');
    expect(el.open).toBe(false);
  });

  it('reflects open and keeps the host free of widget attributes', async () => {
    const { el, trigger } = await mount();
    press(trigger, 'Enter');
    await el.updateComplete;
    expect(el.hasAttribute('open')).toBe(true);
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-expanded')).toBe(false);
  });
});

// Tabs keyboard behaviour (roving tab stop, arrows, Home/End, activation) is in tests/components/tabs.test.ts.

describe('VoidField control lookup', () => {
  it('labels the visible native input, not the hidden input inside a checkbox, and the host for a checkbox', async () => {
    const el = document.createElement('void-field') as VoidField;
    el.label = 'Agree';
    el.innerHTML = '<void-checkbox></void-checkbox>';
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r));
    const cb = el.querySelector('void-checkbox')!;
    await (cb as VoidElementLike).updateComplete;
    expect(cb.getAttribute('aria-labelledby')).toBe(el.querySelector('.void-field-label')!.id);
    expect(cb.querySelector('input')!.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('labels the focusable combobox of a multiselect', async () => {
    const el = document.createElement('void-field') as VoidField;
    el.label = 'Skills';
    el.innerHTML = '<void-multiselect></void-multiselect>';
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r));
    const trigger = el.querySelector('.void-multiselect-trigger')!;
    expect(trigger.getAttribute('aria-labelledby')).toBe(el.querySelector('.void-field-label')!.id);
  });

  it('wires a control that is appended after the field rendered', async () => {
    const el = document.createElement('void-field') as VoidField;
    el.label = 'Late';
    document.body.appendChild(el);
    await el.updateComplete;
    el.appendChild(document.createElement('void-input'));
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;
    expect(el.querySelector('input')!.getAttribute('aria-labelledby')).toBe(el.querySelector('.void-field-label')!.id);
  });
});

describe('VoidTooltip trigger', () => {
  it('describes a control that arrives after the tooltip connected, never the content itself', async () => {
    const el = document.createElement('void-tooltip') as VoidTooltip;
    el.innerHTML = '<void-tooltip-trigger></void-tooltip-trigger><void-tooltip-content>Tip</void-tooltip-content>';
    document.body.appendChild(el);
    await el.updateComplete;
    const content = el.querySelector('void-tooltip-content')!;
    const button = document.createElement('button');
    el.querySelector('void-tooltip-trigger')!.appendChild(button);
    await new Promise((r) => setTimeout(r));
    expect(button.getAttribute('aria-describedby')).toBe(content.id);
    expect(content.hasAttribute('aria-describedby')).toBe(false);
  });

  it('keeps existing descriptions and releases a control that is replaced', async () => {
    const el = document.createElement('void-tooltip') as VoidTooltip;
    el.innerHTML = '<void-tooltip-trigger><button aria-describedby="other">A</button></void-tooltip-trigger><void-tooltip-content>Tip</void-tooltip-content>';
    document.body.appendChild(el);
    await el.updateComplete;
    const content = el.querySelector('void-tooltip-content')!;
    const a = el.querySelector('button')!;
    expect(a.getAttribute('aria-describedby')).toBe(`other ${content.id}`);
    const b = document.createElement('span');
    a.before(b);
    await new Promise((r) => setTimeout(r));
    expect(b.getAttribute('aria-describedby')).toBe(content.id);
    expect(a.getAttribute('aria-describedby')).toBe('other');
  });
});

describe('checkbox and radio: one widget for assistive technology', () => {
  it.each(['checkbox', 'radio'])('void-%s keeps its native input inert until the browser reports validity', async (name) => {
    const el = document.createElement(`void-${name}`) as VoidElementLike & { required: boolean };
    el.required = true;
    document.body.appendChild(el);
    await el.updateComplete;
    const input = el.querySelector('input')!;
    expect(input.inert).toBe(true);
    expect(input.getAttribute('aria-hidden')).toBe('true');
    input.dispatchEvent(new Event('invalid'));
    expect(input.inert).toBe(false);
    await new Promise((r) => setTimeout(r));
    expect(input.inert).toBe(true);
  });

  it('void-input leaves the textbox role to its native input', async () => {
    const el = document.createElement('void-input');
    document.body.appendChild(el);
    await (el as VoidElementLike).updateComplete;
    expect(el.hasAttribute('role')).toBe(false);
  });
});
