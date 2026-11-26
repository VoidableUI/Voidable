// @vitest-environment happy-dom
// One rule (#67): a control's `value` is reflected to the `value` attribute whenever it changes (the user,
// a property set), setting the attribute sets the property, and the form reset target stays what the
// control started with. A password field and a masked PIN input keep their text out of the attribute.
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidInput } from '../src/components/input.js';
import { VoidTextarea } from '../src/components/textarea.js';
import { VoidActionInput } from '../src/components/action-input.js';
import { VoidComposeInput } from '../src/components/compose-input.js';
import { VoidSlider } from '../src/components/slider.js';
import { VoidGauge } from '../src/components/gauge.js';
import { VoidPinInput } from '../src/components/pin-input.js';
import { VoidRadioGroup } from '../src/components/radio-group.js';
import { VoidRadio } from '../src/components/radio.js';
import { VoidSelect } from '../src/components/select.js';
import { VoidCombobox } from '../src/components/combobox.js';
import { VoidMultiselect, VoidOption } from '../src/components/multiselect.js';
import { VoidCheckboxGroup } from '../src/components/checkbox-group.js';
import { VoidCheckbox } from '../src/components/checkbox.js';
import { VoidTagsInput } from '../src/components/tags-input.js';
import { VoidToggle } from '../src/components/toggle.js';

const defs: Array<[string, CustomElementConstructor]> = [
  ['void-input', VoidInput], ['void-textarea', VoidTextarea], ['void-action-input', VoidActionInput],
  ['void-compose-input', VoidComposeInput], ['void-slider', VoidSlider], ['void-gauge', VoidGauge],
  ['void-pin-input', VoidPinInput], ['void-radio-group', VoidRadioGroup], ['void-radio', VoidRadio],
  ['void-select', VoidSelect], ['void-combobox', VoidCombobox], ['void-multiselect', VoidMultiselect],
  ['void-option', VoidOption], ['void-checkbox-group', VoidCheckboxGroup], ['void-checkbox', VoidCheckbox],
  ['void-tags-input', VoidTagsInput], ['void-toggle', VoidToggle],
];
for (const [tag, ctor] of defs) if (!customElements.get(tag)) customElements.define(tag, ctor);

const settle = (el: Element & { updateComplete: Promise<boolean> }) => el.updateComplete.then(() => el.updateComplete);

async function mount<T extends HTMLElement & { updateComplete: Promise<boolean> }>(html: string, tag: string): Promise<T> {
  document.body.innerHTML = html;
  const el = document.querySelector(tag) as T;
  await settle(el);
  return el;
}

/** What the user does to a native text control: type, which fires `input`. */
function type(control: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  control.value = text;
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe.each([
  ['void-input', 'input'],
  ['void-textarea', 'textarea'],
  ['void-action-input', 'input'],
] as const)('%s', (tag, inner) => {
  it('reflects what the user types, and a property set', async () => {
    const el = await mount<VoidInput>(`<${tag} name="n"></${tag}>`, tag);
    type(el.querySelector(inner)!, 'typed');
    await settle(el);
    expect(el.getAttribute('value')).toBe('typed');
    el.value = 'set';
    await settle(el);
    expect(el.getAttribute('value')).toBe('set');
    expect(el.querySelector(inner)!.value).toBe('set');
  });

  it('sets the property from the attribute', async () => {
    const el = await mount<VoidInput>(`<${tag} value="seed"></${tag}>`, tag);
    expect(el.value).toBe('seed');
    el.setAttribute('value', 'next');
    await settle(el);
    expect(el.value).toBe('next');
    expect(el.querySelector(inner)!.value).toBe('next');
  });

  it('keeps the value the control started with as the form reset target', async () => {
    document.body.innerHTML = `<form><${tag} name="n" value="start"></${tag}></form>`;
    const el = document.querySelector(tag) as VoidInput;
    await settle(el);
    type(el.querySelector(inner)!, 'edited');
    await settle(el);
    expect(el.getAttribute('value')).toBe('edited');
    el.closest('form')!.reset();
    await new Promise((r) => setTimeout(r, 10));
    await settle(el);
    expect(el.value).toBe('start');
    expect(el.getAttribute('value')).toBe('start');
  });

  it('does not touch the native control while the user types (caret and composition stay)', async () => {
    const el = await mount<VoidInput>(`<${tag}></${tag}>`, tag);
    const control = el.querySelector(inner)!;
    let writes = 0;
    const proto = Object.getPrototypeOf(control);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')!;
    Object.defineProperty(control, 'value', {
      configurable: true,
      get: () => desc.get!.call(control),
      set: (v) => { writes++; desc.set!.call(control, v); },
    });
    type(control, 'a');
    await settle(el);
    type(control, 'ab');
    await settle(el);
    // The test's own two writes are the only ones: reflecting to the host does not write back.
    expect(writes).toBe(2);
    expect(el.getAttribute('value')).toBe('ab');
  });
});

describe('secrets stay out of the attribute', () => {
  it('a password void-input does not reflect what is typed', async () => {
    const el = await mount<VoidInput>('<void-input type="password"></void-input>', 'void-input');
    type(el.querySelector('input')!, 'hunter2');
    await settle(el);
    expect(el.value).toBe('hunter2');
    el.value = 'swordfish';
    await settle(el);
    expect(el.getAttribute('value') ?? '').not.toContain('hunter2');
    expect(el.getAttribute('value') ?? '').not.toContain('swordfish');
  });

  it('a field switched to password takes back the text it reflected', async () => {
    const el = await mount<VoidInput>('<void-input></void-input>', 'void-input');
    el.value = 'visible';
    await settle(el);
    expect(el.getAttribute('value')).toBe('visible');
    el.type = 'password';
    await settle(el);
    await settle(el);
    expect(el.hasAttribute('value')).toBe(false);
    expect(el.value).toBe('visible');
  });

  it('a password action input does not reflect', async () => {
    const el = await mount<VoidActionInput>('<void-action-input type="password"></void-action-input>', 'void-action-input');
    type(el.querySelector('input')!, 'hunter2');
    await settle(el);
    expect(el.getAttribute('value') ?? '').not.toContain('hunter2');
  });

  it('a masked pin input does not reflect, an unmasked one does', async () => {
    const masked = await mount<VoidPinInput>('<void-pin-input mask length="4"></void-pin-input>', 'void-pin-input');
    masked.value = '1234';
    await settle(masked);
    expect(masked.getAttribute('value') ?? '').not.toContain('1234');
    const open = await mount<VoidPinInput>('<void-pin-input length="4"></void-pin-input>', 'void-pin-input');
    open.value = '1234';
    await settle(open);
    expect(open.getAttribute('value')).toBe('1234');
  });
});

describe('void-compose-input', () => {
  it('reflects the draft and clears the attribute value after a send', async () => {
    const el = await mount<VoidComposeInput>('<void-compose-input></void-compose-input>', 'void-compose-input');
    type(el.querySelector('textarea')!, 'hello');
    await settle(el);
    expect(el.getAttribute('value')).toBe('hello');
    el.querySelector<HTMLButtonElement>('.void-compose-input-send')!.click();
    await settle(el);
    expect(el.getAttribute('value')).toBe('');
  });
});

describe('numbers and strings', () => {
  it('slider reflects the position and follows the attribute', async () => {
    const el = await mount<VoidSlider>('<void-slider></void-slider>', 'void-slider');
    expect(el.getAttribute('value')).toBe('50');
    const range = el.querySelector('input')!;
    range.value = '70';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
    expect(el.getAttribute('value')).toBe('70');
    el.setAttribute('value', '20');
    await settle(el);
    expect(el.value).toBe(20);
    expect(range.value).toBe('20');
  });

  it('gauge reflects a property set', async () => {
    const el = await mount<VoidGauge>('<void-gauge value="10"></void-gauge>', 'void-gauge');
    el.value = 64;
    await settle(el);
    expect(el.getAttribute('value')).toBe('64');
  });

  it('pin input reflects what the cells hold', async () => {
    const el = await mount<VoidPinInput>('<void-pin-input length="4"></void-pin-input>', 'void-pin-input');
    const cells = el.querySelectorAll<HTMLInputElement>('.void-pin-cell');
    cells[0]!.value = '1';
    cells[0]!.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
    expect(el.getAttribute('value')).toBe('1');
  });

  it('toggle reflects the value it stands for', async () => {
    const el = await mount<VoidToggle>('<void-toggle>Bold</void-toggle>', 'void-toggle');
    el.value = 'bold';
    await settle(el);
    expect(el.getAttribute('value')).toBe('bold');
  });

  it('radio group reflects the chosen radio and follows the attribute', async () => {
    const el = await mount<VoidRadioGroup>(
      '<void-radio-group name="s" value="s"><void-radio value="s">S</void-radio><void-radio value="l">L</void-radio></void-radio-group>',
      'void-radio-group',
    );
    expect(el.getAttribute('value')).toBe('s');
    el.querySelector<VoidRadio>('void-radio[value="l"]')!.click();
    await settle(el);
    expect(el.getAttribute('value')).toBe('l');
    el.setAttribute('value', 's');
    await settle(el);
    expect(el.value).toBe('s');
  });

  it('tags input reflects the tags as a JSON array and parses it back', async () => {
    const el = await mount<VoidTagsInput>('<void-tags-input></void-tags-input>', 'void-tags-input');
    el.value = ['a', 'b'];
    await settle(el);
    expect(el.getAttribute('value')).toBe('["a","b"]');
    el.setAttribute('value', '["c"]');
    await settle(el);
    expect(el.value).toEqual(['c']);
  });
});

describe('void-select', () => {
  const html = '<void-select><select name="s"><option value="a">A</option><option value="b">B</option></select></void-select>';

  it('reflects the user choice and a property set', async () => {
    const el = await mount<VoidSelect>(html, 'void-select');
    expect(el.getAttribute('value')).toBe('a');
    const select = el.querySelector('select')!;
    select.value = 'b';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(el);
    expect(el.getAttribute('value')).toBe('b');
    el.value = 'a';
    await settle(el);
    expect(el.getAttribute('value')).toBe('a');
    expect(select.value).toBe('a');
  });

  it('sets the choice from the attribute', async () => {
    const el = await mount<VoidSelect>(html, 'void-select');
    el.setAttribute('value', 'b');
    await settle(el);
    expect(el.querySelector('select')!.value).toBe('b');
  });

  it('a form reset returns to the attribute the markup wrote, not the reflected choice', async () => {
    document.body.innerHTML = `<form>${html.replace('<void-select>', '<void-select value="b">')}</form>`;
    const el = document.querySelector('void-select') as VoidSelect;
    await settle(el);
    expect(el.value).toBe('b');
    el.value = 'a';
    await settle(el);
    expect(el.getAttribute('value')).toBe('a');
    el.closest('form')!.reset();
    await new Promise((r) => setTimeout(r, 10));
    await settle(el);
    expect(el.value).toBe('b');
    expect(el.getAttribute('value')).toBe('b');
  });
});

describe('void-combobox', () => {
  const html = '<void-combobox name="f"><void-combobox-content><void-option value="a">Apple</void-option><void-option value="b">Banana</void-option></void-combobox-content></void-combobox>';

  it('reflects the choice and follows the attribute', async () => {
    const el = await mount<VoidCombobox>(html, 'void-combobox');
    el.value = 'b';
    await settle(el);
    expect(el.getAttribute('value')).toBe('b');
    el.setAttribute('value', 'a');
    await settle(el);
    expect(el.value).toBe('a');
  });

  it('still adopts an option marked selected when the markup has no value attribute', async () => {
    const el = await mount<VoidCombobox>(html.replace('value="b"', 'value="b" selected'), 'void-combobox');
    await settle(el);
    expect(el.value).toBe('b');
    expect(el.getAttribute('value')).toBe('b');
  });
});

describe('list values are a JSON array', () => {
  it('multiselect reflects its chosen options and chooses the ones the attribute lists', async () => {
    const el = await mount<VoidMultiselect>(
      '<void-multiselect><void-multiselect-content><void-option value="a">A</void-option><void-option value="b">B</void-option><void-option value="c">C</void-option></void-multiselect-content></void-multiselect>',
      'void-multiselect',
    );
    expect(el.getAttribute('value')).toBe('[]');
    el.querySelector<VoidOption>('void-option[value="b"]')!.selected = true;
    await settle(el);
    expect(el.getAttribute('value')).toBe('["b"]');
    el.value = ['a', 'c'];
    await settle(el);
    expect(el.getAttribute('value')).toBe('["a","c"]');
    el.setAttribute('value', '["b"]');
    await settle(el);
    expect(el.value).toEqual(['b']);
    expect(el.querySelector<VoidOption>('void-option[value="a"]')!.selected).toBe(false);
  });

  it('multiselect keeps a value written in markup, whichever is parsed first', async () => {
    const el = await mount<VoidMultiselect>(
      '<void-multiselect value=\'["c"]\'><void-multiselect-content><void-option value="a">A</void-option><void-option value="c">C</void-option></void-multiselect-content></void-multiselect>',
      'void-multiselect',
    );
    await settle(el);
    expect(el.value).toEqual(['c']);
    expect(el.getAttribute('value')).toBe('["c"]');
  });

  it('checkbox group reflects the checked boxes and checks the ones the attribute lists', async () => {
    const el = await mount<VoidCheckboxGroup>(
      '<void-checkbox-group name="p"><void-checkbox value="r">R</void-checkbox><void-checkbox value="w">W</void-checkbox></void-checkbox-group>',
      'void-checkbox-group',
    );
    expect(el.getAttribute('value')).toBe('[]');
    el.querySelector<VoidCheckbox>('void-checkbox[value="w"]')!.click();
    await settle(el);
    expect(el.getAttribute('value')).toBe('["w"]');
    el.setAttribute('value', '["r","w"]');
    await settle(el);
    expect(el.querySelector<VoidCheckbox>('void-checkbox[value="r"]')!.checked).toBe(true);
    expect(el.value).toEqual(['r', 'w']);
  });
});
