// @vitest-environment happy-dom
//
// Form participation tests (issue #5).
//
// happy-dom 20 has no ElementInternals (no attachInternals, no form-associated
// custom elements) and its FormData ignores <fieldset disabled> and the
// disabled state of <select>/<textarea>. So:
//  - Strategy (a) controls (inner native control submits) are checked with
//    happy-dom's real FormData where it is faithful, and with `entries()`,
//    a small emulation of the browser's entry-list rules, for fieldsets.
//  - Strategy (b) controls (ElementInternals) are checked against a fake
//    ElementInternals installed on HTMLElement.prototype; `entries()` then
//    combines native entries with what each host passed to setFormValue,
//    which is what a browser does. Browser behaviour itself is not exercised.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/index.js';
import { isInDisabledFieldset } from '../src/form-control.js';
import type { VoidSelect } from '../src/components/select.js';
import type { VoidRadioGroup } from '../src/components/radio-group.js';
import type { VoidInput } from '../src/components/input.js';
import type { VoidTextarea } from '../src/components/textarea.js';
import type { VoidCheckbox } from '../src/components/checkbox.js';
import type { VoidCheckboxGroup } from '../src/components/checkbox-group.js';
import type { VoidSlider } from '../src/components/slider.js';
import type { VoidSwitch } from '../src/components/switch.js';
import type { VoidMultiselect } from '../src/components/multiselect.js';
import type { VoidTagsInput } from '../src/components/tags-input.js';
import type { VoidToggleGroup } from '../src/components/toggle-group.js';
import type { VoidSegmentedControl } from '../src/components/segmented-control.js';
import type { VoidPinInput } from '../src/components/pin-input.js';
import type { VoidNumberInput } from '../src/components/number-input.js';
import type { VoidColorPicker } from '../src/components/color-picker.js';
import type { VoidButton } from '../src/components/button.js';
import type { VoidFileUpload } from '../src/components/file-upload.js';

// ── Fake ElementInternals ──

class FakeInternals {
  value: string | FormData | null = null;
  state: unknown = null;
  validityFlags: ValidityStateFlags = {};
  validationMessage = '';
  constructor(private host: HTMLElement) {}
  get form(): HTMLFormElement | null {
    return this.host.closest('form');
  }
  setFormValue(value: string | FormData | null, state?: unknown): void {
    this.value = value;
    this.state = state ?? null;
  }
  setValidity(flags: ValidityStateFlags = {}, message = ''): void {
    this.validityFlags = flags;
    this.validationMessage = message;
  }
  get validity(): ValidityState {
    return { valid: !Object.values(this.validityFlags).some(Boolean), ...this.validityFlags } as ValidityState;
  }
  get willValidate(): boolean {
    return true;
  }
  checkValidity(): boolean {
    return this.validity.valid;
  }
  reportValidity(): boolean {
    return this.validity.valid;
  }
}

const internalsOf = new WeakMap<HTMLElement, FakeInternals>();

function installFakeInternals(): void {
  (HTMLElement.prototype as unknown as { attachInternals: () => FakeInternals }).attachInternals = function (this: HTMLElement) {
    const fake = new FakeInternals(this);
    internalsOf.set(this, fake);
    return fake;
  };
}

function removeFakeInternals(): void {
  delete (HTMLElement.prototype as unknown as { attachInternals?: unknown }).attachInternals;
}

function isFace(el: Element): boolean {
  return Boolean((el.constructor as { formAssociated?: boolean }).formAssociated);
}

/** Emulates the browser's "construct the entry list" for a form. */
function entries(form: HTMLFormElement): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const barred = (el: Element) => el.hasAttribute('disabled') || isInDisabledFieldset(el);
  for (const el of Array.from(form.querySelectorAll('*'))) {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      if (!el.name || barred(el)) continue;
      if (el instanceof HTMLInputElement) {
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) continue;
        if (['submit', 'reset', 'button', 'file'].includes(el.type)) continue;
      }
      out.push([el.name, el.value]);
    } else if (isFace(el)) {
      const fake = internalsOf.get(el as HTMLElement);
      if (!fake || barred(el) || fake.value === null) continue;
      const name = el.getAttribute('name');
      if (typeof fake.value === 'string') {
        if (name) out.push([name, fake.value]);
      } else {
        for (const [k, v] of fake.value.entries()) out.push([k, typeof v === 'string' ? v : `file:${(v as File).name}`]);
      }
    }
  }
  return out;
}

/** form.reset() as a browser does it: natives reset, then FACE formResetCallback in tree order. */
function browserReset(form: HTMLFormElement): void {
  form.reset();
  for (const el of Array.from(form.querySelectorAll('*'))) {
    if (isFace(el) && internalsOf.has(el as HTMLElement)) {
      (el as unknown as { formResetCallback(): void }).formResetCallback();
    }
  }
}

async function settle(root: ParentNode): Promise<void> {
  // Native-backed hosts mirror their native control in a task after reset.
  await new Promise((r) => setTimeout(r, 0));
  for (let i = 0; i < 3; i++) {
    const els = Array.from(root.querySelectorAll('*')).filter((e) => 'updateComplete' in e) as unknown as Array<{ updateComplete: Promise<unknown> }>;
    await Promise.all(els.map((e) => e.updateComplete));
  }
}

async function mount(html: string): Promise<HTMLFormElement> {
  const form = document.createElement('form');
  form.innerHTML = html;
  document.body.appendChild(form);
  // Browsers call formDisabledCallback(true) for a FACE inserted into a disabled fieldset.
  for (const el of Array.from(form.querySelectorAll('*'))) {
    if (isFace(el) && internalsOf.has(el as HTMLElement) && isInDisabledFieldset(el)) {
      (el as unknown as { formDisabledCallback(d: boolean): void }).formDisabledCallback(true);
    }
  }
  await settle(form);
  return form;
}

/** Toggle a fieldset as a browser does: FACE descendants get formDisabledCallback. */
function setFieldsetDisabled(fs: HTMLFieldSetElement, disabled: boolean): void {
  fs.toggleAttribute('disabled', disabled);
  for (const el of Array.from(fs.querySelectorAll('*'))) {
    if (isFace(el) && internalsOf.has(el as HTMLElement)) {
      const own = el.hasAttribute('disabled');
      (el as unknown as { formDisabledCallback(d: boolean): void }).formDisabledCallback(own || isInDisabledFieldset(el));
    }
  }
}

/** Entries a synchronous submit would see right now (no awaiting). */
function entriesNow(form: HTMLFormElement): Array<[string, string]> {
  return entries(form);
}

afterEach(() => {
  document.body.innerHTML = '';
  removeFakeInternals();
});

// ── Helper ──

describe('isInDisabledFieldset', () => {
  it('detects a disabled fieldset ancestor but not its first legend', () => {
    document.body.innerHTML = '<fieldset disabled><legend><span id="l"></span></legend><span id="c"></span></fieldset><span id="o"></span>';
    expect(isInDisabledFieldset(document.getElementById('c')!)).toBe(true);
    expect(isInDisabledFieldset(document.getElementById('l')!)).toBe(false);
    expect(isInDisabledFieldset(document.getElementById('o')!)).toBe(false);
  });
});

// ── Strategy (a): inner native control ──

describe('native-control strategy', () => {
  it('hosts are not form-associated; the native control is the only participant (no double submission)', async () => {
    installFakeInternals();
    const setFormValue = vi.spyOn(FakeInternals.prototype, 'setFormValue');
    const form = await mount(`
      <void-input name="a" value="1"></void-input>
      <void-textarea name="b" value="2"></void-textarea>
      <void-slider name="c" value="3"></void-slider>
      <void-action-input name="d" value="4"></void-action-input>
      <void-checkbox name="e" checked></void-checkbox>
      <void-select name="f" value="x"><option value="x">X</option></void-select>
      <void-radio-group name="g" value="y"><void-radio value="y"></void-radio></void-radio-group>
      <void-checkbox-group name="h"><void-checkbox value="z" checked></void-checkbox></void-checkbox-group>
    `);
    (form.querySelector('void-input') as VoidInput).value = 'changed';
    (form.querySelector('void-checkbox') as HTMLElement).click();
    await settle(form);
    for (const tag of ['void-input', 'void-textarea', 'void-select', 'void-slider', 'void-action-input', 'void-checkbox', 'void-radio', 'void-radio-group', 'void-checkbox-group']) {
      const host = form.querySelector(tag)! as HTMLElement;
      expect(isFace(host), tag).toBe(false);
      expect(internalsOf.has(host), tag).toBe(false);
    }
    expect(setFormValue).not.toHaveBeenCalled();
    // form.elements resolves each name to the native control, whose value is the real value.
    const named = form.elements.namedItem('a') as HTMLInputElement;
    expect(named.tagName).toBe('INPUT');
    expect(named.value).toBe('changed');
    // Only the inner native controls contribute, once each.
    expect(entries(form)).toEqual([['a', 'changed'], ['b', '2'], ['c', '3'], ['d', '4'], ['f', 'x'], ['g', 'y'], ['h', 'z']]);
    setFormValue.mockRestore();
  });

  it('each control renders exactly one named native descendant', async () => {
    const form = await mount(`
      <void-input name="a" value="1"></void-input>
      <void-textarea name="b" value="2"></void-textarea>
      <void-slider name="c" value="3"></void-slider>
      <void-action-input name="d" value="4"></void-action-input>
      <void-checkbox name="e" checked></void-checkbox>
      <void-select name="f"><option value="x">X</option></void-select>
    `);
    for (const host of Array.from(form.children)) {
      expect(host.querySelectorAll('[name]').length, host.tagName).toBe(1);
    }
  });

  it('submits name/value via the real FormData', async () => {
    const form = await mount(`
      <void-input name="email"></void-input>
      <void-textarea name="bio"></void-textarea>
      <void-slider name="vol"></void-slider>
      <void-action-input name="q"></void-action-input>
      <void-checkbox name="tos"></void-checkbox>
      <void-checkbox name="news" value="yes"></void-checkbox>
    `);
    (form.querySelector('void-input') as VoidInput).value = 'a@b.c';
    (form.querySelector('void-textarea') as VoidTextarea).value = 'hi';
    (form.querySelector('void-slider') as VoidSlider).value = 30;
    (form.querySelector('void-checkbox[name="tos"]') as VoidCheckbox).click();
    await settle(form);
    expect([...new FormData(form).entries()]).toEqual([
      ['email', 'a@b.c'],
      ['bio', 'hi'],
      ['vol', '30'],
      ['q', ''],
      ['tos', 'on'],
    ]);
  });

  it('disabled controls and controls in a disabled fieldset contribute nothing', async () => {
    const form = await mount(`
      <void-input name="a" value="1" disabled></void-input>
      <void-checkbox name="b" checked disabled></void-checkbox>
      <fieldset disabled>
        <void-input name="c" value="3"></void-input>
        <void-select name="d"><option value="x">X</option></void-select>
      </fieldset>
      <void-input name="e" value="5"></void-input>
    `);
    expect(entries(form)).toEqual([['e', '5']]);
    // The disabled state reaches the native control.
    expect(form.querySelector<HTMLInputElement>('void-input[name="a"] input')!.disabled).toBe(true);
  });

  it('checkbox and radio ignore clicks inside a disabled fieldset', async () => {
    const form = await mount(`
      <fieldset disabled>
        <void-checkbox name="a"></void-checkbox>
        <void-radio name="b" value="1"></void-radio>
      </fieldset>
    `);
    const spy = vi.fn();
    form.addEventListener('void-change', spy);
    (form.querySelector('void-checkbox') as VoidCheckbox).click();
    (form.querySelector('void-radio') as HTMLElement).click();
    await settle(form);
    expect((form.querySelector('void-checkbox') as VoidCheckbox).checked).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('form.reset() restores the initial value of host and native control', async () => {
    const form = await mount(`
      <void-input name="a" value="init"></void-input>
      <void-textarea name="b"></void-textarea>
      <void-checkbox name="c"></void-checkbox>
      <void-checkbox name="d" checked></void-checkbox>
      <void-slider name="e" value="10"></void-slider>
      <void-select name="f" value="y"><option value="x">X</option><option value="y">Y</option></void-select>
    `);
    const input = form.querySelector('void-input') as VoidInput;
    const ta = form.querySelector('void-textarea') as VoidTextarea;
    const c = form.querySelector('void-checkbox[name="c"]') as VoidCheckbox;
    const d = form.querySelector('void-checkbox[name="d"]') as VoidCheckbox;
    const slider = form.querySelector('void-slider') as VoidSlider;
    const select = form.querySelector('void-select') as VoidSelect;
    input.value = 'changed';
    ta.value = 'changed';
    c.click();
    d.click();
    slider.value = 90;
    select.value = 'x';
    await settle(form);

    form.reset();
    await settle(form);

    expect(input.value).toBe('init');
    expect(form.querySelector<HTMLInputElement>('void-input input')!.value).toBe('init');
    expect(ta.value).toBe('');
    expect(c.checked).toBe(false);
    expect(d.checked).toBe(true);
    expect(c.getAttribute('aria-checked')).toBe('false');
    expect(slider.value).toBe(10);
    expect(select.value).toBe('y');
    expect(form.querySelector('select')!.value).toBe('y');
    expect([...new FormData(form).entries()]).toEqual([['a', 'init'], ['b', ''], ['d', 'on'], ['e', '10'], ['f', 'y']]);
  });

  it('reset does not fire void-change', async () => {
    const form = await mount('<void-input name="a" value="x"></void-input><void-checkbox name="b"></void-checkbox>');
    (form.querySelector('void-checkbox') as VoidCheckbox).click();
    const spy = vi.fn();
    form.addEventListener('void-change', spy);
    form.reset();
    await settle(form);
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── void-select controlled value + placeholder ──

describe('void-select value and placeholder', () => {
  it('applies programmatic value changes after first render without void-change', async () => {
    const form = await mount('<void-select name="s" value="a"><option value="a">A</option><option value="b">B</option><option value="c">C</option></void-select>');
    const el = form.querySelector('void-select') as VoidSelect;
    const spy = vi.fn();
    el.addEventListener('void-change', spy);
    el.value = 'c';
    await settle(form);
    expect(form.querySelector('select')!.value).toBe('c');
    expect(new FormData(form).get('s')).toBe('c');
    expect(spy).not.toHaveBeenCalled();
  });

  it('user changes update value and fire void-change', async () => {
    const form = await mount('<void-select name="s"><option value="a">A</option><option value="b">B</option></void-select>');
    const el = form.querySelector('void-select') as VoidSelect;
    const spy = vi.fn();
    el.addEventListener('void-change', spy);
    const native = form.querySelector('select')!;
    native.value = 'b';
    native.dispatchEvent(new Event('change'));
    expect(el.value).toBe('b');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('without value or placeholder, value reflects the option the native select shows', async () => {
    const form = await mount('<void-select name="s"><option value="a">A</option><option value="b">B</option></void-select>');
    expect((form.querySelector('void-select') as VoidSelect).value).toBe('a');
  });

  it('renders the placeholder as a hidden, disabled, initially selected empty option', async () => {
    const form = await mount('<void-select name="s" placeholder="Pick one"><option value="a">A</option></void-select>');
    const el = form.querySelector('void-select') as VoidSelect;
    const native = form.querySelector('select')!;
    const ph = native.options[0];
    expect(ph.textContent).toBe('Pick one');
    expect(ph.value).toBe('');
    expect(ph.disabled).toBe(true);
    expect(ph.hidden).toBe(true);
    expect(native.value).toBe('');
    expect(el.value).toBe('');
    el.value = 'a';
    await settle(form);
    expect(native.value).toBe('a');
    form.reset();
    await settle(form);
    expect(el.value).toBe('');
    expect(native.value).toBe('');
  });
});

// ── void-radio-group controlled value ──

describe('void-radio-group value', () => {
  const markup = '<void-radio-group name="plan" value="b"><void-radio value="a"></void-radio><void-radio value="b"></void-radio><void-radio value="c"></void-radio></void-radio-group>';

  it('reflects name and forwards it to the radios', async () => {
    const form = await mount(markup);
    expect(form.querySelector('void-radio-group')!.getAttribute('name')).toBe('plan');
    expect(new FormData(form).getAll('plan')).toEqual(['b']);
  });

  it('applies programmatic value changes without void-change', async () => {
    const form = await mount(markup);
    const group = form.querySelector('void-radio-group') as VoidRadioGroup;
    const spy = vi.fn();
    group.addEventListener('void-change', spy);
    group.value = 'c';
    await settle(form);
    const radios = Array.from(form.querySelectorAll('void-radio')) as Array<HTMLElement & { checked: boolean }>;
    expect(radios.map((r) => r.checked)).toEqual([false, false, true]);
    expect(new FormData(form).getAll('plan')).toEqual(['c']);
    group.value = '';
    await settle(form);
    expect(radios.map((r) => r.checked)).toEqual([false, false, false]);
    expect(new FormData(form).getAll('plan')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('user selection updates value', async () => {
    const form = await mount(markup);
    const group = form.querySelector('void-radio-group') as VoidRadioGroup;
    (form.querySelectorAll('void-radio')[0] as HTMLElement).click();
    await settle(form);
    expect(group.value).toBe('a');
    expect(new FormData(form).getAll('plan')).toEqual(['a']);
  });

  it('form.reset() restores the initial selection', async () => {
    const form = await mount(markup);
    const group = form.querySelector('void-radio-group') as VoidRadioGroup;
    (form.querySelectorAll('void-radio')[2] as HTMLElement).click();
    await settle(form);
    form.reset();
    await settle(form);
    expect(group.value).toBe('b');
    expect(new FormData(form).getAll('plan')).toEqual(['b']);
    const radios = Array.from(form.querySelectorAll('void-radio')) as Array<HTMLElement & { checked: boolean }>;
    expect(radios.map((r) => r.checked)).toEqual([false, true, false]);
  });
});

// ── void-checkbox-group ──

describe('void-checkbox-group', () => {
  const markup = '<void-checkbox-group name="perm"><void-checkbox value="r" checked></void-checkbox><void-checkbox value="w"></void-checkbox><void-checkbox value="x" checked></void-checkbox></void-checkbox-group>';

  it('submits one entry per checked box under the group name', async () => {
    const form = await mount(markup);
    expect(new FormData(form).getAll('perm')).toEqual(['r', 'x']);
  });

  it('value setter checks matching boxes without void-change', async () => {
    const form = await mount(markup);
    const group = form.querySelector('void-checkbox-group') as VoidCheckboxGroup;
    const spy = vi.fn();
    group.addEventListener('void-change', spy);
    group.value = ['w'];
    await settle(form);
    expect(group.value).toEqual(['w']);
    expect(new FormData(form).getAll('perm')).toEqual(['w']);
    expect(spy).not.toHaveBeenCalled();
  });

  it('form.reset() restores each checkbox', async () => {
    const form = await mount(markup);
    const group = form.querySelector('void-checkbox-group') as VoidCheckboxGroup;
    group.value = [];
    await settle(form);
    form.reset();
    await settle(form);
    expect(group.value).toEqual(['r', 'x']);
    expect(new FormData(form).getAll('perm')).toEqual(['r', 'x']);
  });
});

// ── Strategy (b): ElementInternals ──

const INTERNALS_TAGS = [
  'void-switch', 'void-number-input', 'void-date-picker', 'void-calendar', 'void-pin-input', 'void-tags-input',
  'void-color-picker', 'void-toggle-group', 'void-segmented-control', 'void-combobox', 'void-multiselect',
  'void-editable', 'void-file-upload',
];

describe('internals strategy without ElementInternals (happy-dom as-is)', () => {
  it('constructs and renders, contributes nothing, and still resets', async () => {
    const form = await mount('<void-switch name="s"></void-switch><void-segmented-control name="v" value="a"><void-segmented-control-item value="a"></void-segmented-control-item><void-segmented-control-item value="b"></void-segmented-control-item></void-segmented-control>');
    const sw = form.querySelector('void-switch') as VoidSwitch;
    const seg = form.querySelector('void-segmented-control') as VoidSegmentedControl;
    sw.click();
    seg.value = 'b';
    await settle(form);
    expect(sw.checked).toBe(true);
    expect([...new FormData(form).entries()]).toEqual([]);
    expect(sw.checkValidity()).toBe(true);
    form.reset();
    await settle(form);
    expect(sw.checked).toBe(false);
    expect(seg.value).toBe('a');
  });

  it('every host reflects name', async () => {
    for (const tag of INTERNALS_TAGS) {
      const el = document.createElement(tag) as HTMLElement & { name: string; updateComplete: Promise<unknown> };
      document.body.appendChild(el);
      el.name = 'n';
      await el.updateComplete;
      expect(el.getAttribute('name'), tag).toBe('n');
    }
  });
});

describe('internals strategy with ElementInternals (fake)', () => {
  beforeEach(() => installFakeInternals());

  it('hosts are form-associated and render no named native descendants (no double submission)', async () => {
    const form = await mount(INTERNALS_TAGS.map((t) => `<${t} name="n"></${t}>`).join(''));
    for (const tag of INTERNALS_TAGS) {
      const el = form.querySelector(tag)!;
      expect(isFace(el), tag).toBe(true);
      expect(internalsOf.has(el as HTMLElement), tag).toBe(true);
      expect(el.querySelectorAll('[name]').length, tag).toBe(0);
    }
    // Nothing native submits for them: happy-dom FormData only sees native controls.
    expect([...new FormData(form).entries()]).toEqual([]);
  });

  it('submits the expected entries for every control', async () => {
    const form = await mount(`
      <void-switch name="sw-off"></void-switch>
      <void-switch name="sw-on" checked></void-switch>
      <void-switch name="sw-val" value="yes" checked></void-switch>
      <void-number-input name="qty" value="3"></void-number-input>
      <void-date-picker name="date" value="2026-01-02"></void-date-picker>
      <void-calendar name="cal" value="2026-03-04"></void-calendar>
      <void-pin-input name="pin" length="4" value="1234"></void-pin-input>
      <void-tags-input name="tags"></void-tags-input>
      <void-color-picker name="color" value="#ff0000"></void-color-picker>
      <void-toggle-group name="fmt" multiple value="b,i"><void-toggle value="b"></void-toggle><void-toggle value="i"></void-toggle><void-toggle value="u"></void-toggle></void-toggle-group>
      <void-toggle-group name="align" value=""><void-toggle value="l"></void-toggle></void-toggle-group>
      <void-segmented-control name="view" value="grid"><void-segmented-control-item value="grid"></void-segmented-control-item></void-segmented-control>
      <void-combobox name="country" value="nl"><void-option value="nl">NL</void-option></void-combobox>
      <void-multiselect name="roles"><void-option value="a" selected>A</void-option><void-option value="b">B</void-option><void-option value="c" selected>C</void-option></void-multiselect>
      <void-editable name="title" value="Hello"></void-editable>
      <void-file-upload name="files"></void-file-upload>
    `);
    (form.querySelector('void-tags-input') as VoidTagsInput).value = ['x', { text: 'y', color: 'info' }];
    await settle(form);
    expect(entries(form)).toEqual([
      ['sw-on', 'on'],
      ['sw-val', 'yes'],
      ['qty', '3'],
      ['date', '2026-01-02'],
      ['cal', '2026-03-04'],
      ['pin', '1234'],
      ['tags', 'x'],
      ['tags', 'y'],
      ['color', '#ff0000'],
      ['fmt', 'b'],
      ['fmt', 'i'],
      ['view', 'grid'],
      ['country', 'nl'],
      ['roles', 'a'],
      ['roles', 'c'],
      ['title', 'Hello'],
    ]);
  });

  it('a nameless control contributes nothing', async () => {
    const form = await mount('<void-switch checked></void-switch>');
    expect(internalsOf.get(form.querySelector('void-switch')!)!.value).toBeNull();
  });

  it('file-upload submits one entry per file', async () => {
    const form = await mount('<void-file-upload name="docs" multiple></void-file-upload>');
    const el = form.querySelector('void-file-upload') as VoidFileUpload & { _addFiles(f: File[]): void };
    el._addFiles([new File(['a'], 'a.txt'), new File(['b'], 'b.txt')]);
    await settle(form);
    expect(entries(form)).toEqual([['docs', 'file:a.txt'], ['docs', 'file:b.txt']]);
    browserReset(form);
    await settle(form);
    expect(entries(form)).toEqual([]);
  });

  it('tracks user and programmatic changes', async () => {
    const form = await mount(`
      <void-switch name="s"></void-switch>
      <void-multiselect name="m"><void-option value="a">A</void-option><void-option value="b">B</void-option></void-multiselect>
      <void-toggle-group name="t" multiple><void-toggle value="x"></void-toggle><void-toggle value="y"></void-toggle></void-toggle-group>
    `);
    (form.querySelector('void-switch') as HTMLElement).click();
    const ms = form.querySelector('void-multiselect') as VoidMultiselect;
    ms.value = ['b'];
    (form.querySelectorAll('void-toggle')[1] as HTMLElement).click();
    await settle(form);
    expect(entries(form)).toEqual([['s', 'on'], ['m', 'b'], ['t', 'y']]);
    // Programmatic selection on a child option is picked up too.
    (ms.querySelector('void-option[value="a"]') as HTMLElement & { selected: boolean }).selected = true;
    await settle(form);
    expect(ms.value).toEqual(['a', 'b']);
    expect(entries(form)).toEqual([['s', 'on'], ['m', 'a'], ['m', 'b'], ['t', 'y']]);
  });

  it('disabled controls and controls in a disabled fieldset contribute nothing', async () => {
    const form = await mount(`
      <void-switch name="a" checked disabled></void-switch>
      <fieldset disabled><void-switch name="b" checked></void-switch><void-tags-input name="c"></void-tags-input></fieldset>
      <void-switch name="d" checked></void-switch>
    `);
    expect(internalsOf.get(form.querySelector('void-switch[name="a"]')!)!.value).toBeNull();
    expect(entries(form)).toEqual([['d', 'on']]);
  });

  it('host-level interaction is blocked inside a disabled fieldset', async () => {
    const form = await mount(`
      <fieldset disabled>
        <void-switch name="a"></void-switch>
        <void-segmented-control name="b" value="1"><void-segmented-control-item value="1"></void-segmented-control-item><void-segmented-control-item value="2"></void-segmented-control-item></void-segmented-control>
        <void-toggle-group name="c"><void-toggle value="x"></void-toggle></void-toggle-group>
      </fieldset>
    `);
    const spy = vi.fn();
    form.addEventListener('void-change', spy);
    (form.querySelector('void-switch') as HTMLElement).click();
    (form.querySelectorAll('void-segmented-control-item')[1] as HTMLElement).click();
    (form.querySelector('void-toggle') as HTMLElement).click();
    await settle(form);
    expect((form.querySelector('void-switch') as VoidSwitch).checked).toBe(false);
    expect((form.querySelector('void-segmented-control') as VoidSegmentedControl).value).toBe('1');
    expect((form.querySelector('void-toggle-group') as VoidToggleGroup).value).toBe('');
    expect((form.querySelector('void-toggle') as HTMLElement & { pressed: boolean }).pressed).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('fieldset toggles update aria-disabled', async () => {
    const form = await mount('<fieldset><void-switch name="a"></void-switch><void-tags-input name="t"></void-tags-input></fieldset>');
    const fs = form.querySelector('fieldset')!;
    setFieldsetDisabled(fs, true);
    await settle(form);
    expect(form.querySelector('void-switch')!.getAttribute('aria-disabled')).toBe('true');
    expect(form.querySelector('void-tags-input')!.getAttribute('aria-disabled')).toBe('true');
    setFieldsetDisabled(fs, false);
    await settle(form);
    expect(form.querySelector('void-switch')!.getAttribute('aria-disabled')).toBe('false');
    expect(form.querySelector('void-tags-input')!.getAttribute('aria-disabled')).toBe('false');
  });

  it('formResetCallback restores initial values without void-change', async () => {
    const form = await mount(`
      <void-switch name="s" checked></void-switch>
      <void-number-input name="n" value="5"></void-number-input>
      <void-pin-input name="p" length="4" value="12"></void-pin-input>
      <void-color-picker name="c" value="#00ff00"></void-color-picker>
      <void-toggle-group name="t" multiple value="x"><void-toggle value="x"></void-toggle><void-toggle value="y"></void-toggle></void-toggle-group>
      <void-multiselect name="m"><void-option value="a" selected>A</void-option><void-option value="b">B</void-option></void-multiselect>
      <void-tags-input name="g"></void-tags-input>
    `);
    const sw = form.querySelector('void-switch') as VoidSwitch;
    const num = form.querySelector('void-number-input') as VoidNumberInput;
    const pin = form.querySelector('void-pin-input') as VoidPinInput;
    const color = form.querySelector('void-color-picker') as VoidColorPicker;
    const tg = form.querySelector('void-toggle-group') as VoidToggleGroup;
    const ms = form.querySelector('void-multiselect') as VoidMultiselect;
    const tags = form.querySelector('void-tags-input') as VoidTagsInput;
    sw.click();
    num.value = 9;
    pin.value = '9999';
    color.value = '#0000ff';
    tg.value = 'y';
    ms.value = ['b'];
    tags.value = ['z'];
    await settle(form);

    const spy = vi.fn();
    form.addEventListener('void-change', spy);
    browserReset(form);
    await settle(form);

    expect(sw.checked).toBe(true);
    expect(num.value).toBe(5);
    expect(pin.value).toBe('12');
    expect(color.value).toBe('#00ff00');
    expect(tg.value).toBe('x');
    expect(ms.value).toEqual(['a']);
    expect(tags.value).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    // Native descendants reset by the browser to their own defaults are re-synced.
    expect(num.querySelector<HTMLInputElement>('.void-number-input-field')!.value).toBe('5');
    expect(Array.from(pin.querySelectorAll<HTMLInputElement>('.void-pin-cell')).map((c) => c.value).join('')).toBe('12');
    expect(color.querySelector<HTMLInputElement>('.void-color-picker-input')!.value).toBe('#00ff00');
    expect(entries(form)).toEqual([['s', 'on'], ['n', '5'], ['p', '12'], ['c', '#00ff00'], ['t', 'x'], ['m', 'a']]);
  });

  it('formStateRestoreCallback restores from the saved state', async () => {
    const form = await mount('<void-tags-input name="g"></void-tags-input>');
    const tags = form.querySelector('void-tags-input') as VoidTagsInput;
    tags.value = ['a', 'b'];
    await settle(form);
    const state = internalsOf.get(tags)!.state as string;
    tags.value = [];
    tags.formStateRestoreCallback(state, 'restore');
    expect(tags.value).toEqual(['a', 'b']);
  });

  it('required sets valueMissing while empty', async () => {
    const form = await mount('<void-switch name="s" required></void-switch><void-multiselect name="m" required><void-option value="a">A</void-option></void-multiselect>');
    const sw = form.querySelector('void-switch') as VoidSwitch;
    const ms = form.querySelector('void-multiselect') as VoidMultiselect;
    expect(sw.checkValidity()).toBe(false);
    expect(sw.validity!.valueMissing).toBe(true);
    expect(ms.checkValidity()).toBe(false);
    sw.click();
    ms.value = ['a'];
    await settle(form);
    expect(sw.checkValidity()).toBe(true);
    expect(ms.checkValidity()).toBe(true);
  });
});

// ── Cases reported on issue #5 (Rails / voidable-hotwire markup) ──

describe('issue #5 reported cases (fake ElementInternals)', () => {
  beforeEach(() => installFakeInternals());

  it('<void-switch name="user[remember_me]"> submits "on" when checked, nothing when unchecked', async () => {
    const form = await mount('<void-switch name="user[remember_me]"></void-switch>');
    const sw = form.querySelector('void-switch') as VoidSwitch;
    expect(sw.value).toBe('on');
    expect(entries(form)).toEqual([]);
    sw.click();
    await settle(form);
    expect(entries(form)).toEqual([['user[remember_me]', 'on']]);
    sw.click();
    await settle(form);
    expect(entries(form)).toEqual([]);
  });

  it('scaffold markup <void-switch name="sample[active]" checked> submits under the bracketed name', async () => {
    const form = await mount('<void-switch name="sample[active]" checked></void-switch><void-switch name="sample[flag]" value="1" checked></void-switch>');
    expect(entries(form)).toEqual([['sample[active]', 'on'], ['sample[flag]', '1']]);
  });

  it('scaffold markup <void-date-picker name="sample[published_on]" value="YYYY-MM-DD"> submits ISO', async () => {
    const form = await mount('<void-date-picker name="sample[published_on]" value="2026-11-24" format="DD.MM.YYYY"></void-date-picker><void-date-picker name="sample[empty_on]" value=""></void-date-picker>');
    // The display format does not leak into the submission.
    expect(form.querySelector<HTMLInputElement>('.void-date-picker-input')!.value).toBe('24.11.2026');
    expect(entries(form)).toEqual([['sample[published_on]', '2026-11-24'], ['sample[empty_on]', '']]);
  });

  it('a date picked in the calendar submits as YYYY-MM-DD', async () => {
    const form = await mount('<void-date-picker name="d" format="MM/DD/YYYY"></void-date-picker>');
    const picker = form.querySelector('void-date-picker') as HTMLElement & { open: boolean; value: string };
    picker.open = true;
    await settle(form);
    const cal = picker.querySelector('void-calendar')!;
    cal.dispatchEvent(new CustomEvent('void-change', { detail: { value: '2026-02-03', date: new Date(2026, 1, 3) } }));
    await settle(form);
    expect(picker.value).toBe('2026-02-03');
    expect(entries(form)).toEqual([['d', '2026-02-03']]);
  });
});

// ── void-button ──

describe('void-button form behaviour', () => {
  it('type=submit requests submission; type=reset resets; type=button does neither', async () => {
    const form = await mount('<void-input name="a" value="x"></void-input><void-button type="submit"></void-button><void-button type="reset"></void-button><void-button></void-button>');
    const submit = vi.fn((e: Event) => e.preventDefault());
    const reset = vi.fn();
    form.addEventListener('submit', submit);
    form.addEventListener('reset', reset);
    const [s, r, b] = Array.from(form.querySelectorAll('void-button')) as VoidButton[];
    b.click();
    expect(submit).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    s.click();
    expect(submit).toHaveBeenCalledOnce();
    (form.querySelector('void-input') as VoidInput).value = 'changed';
    await settle(form);
    r.click();
    await settle(form);
    expect(reset).toHaveBeenCalledOnce();
    expect((form.querySelector('void-input') as VoidInput).value).toBe('x');
  });

  it('does nothing inside a disabled fieldset', async () => {
    const form = await mount('<fieldset disabled><void-button type="submit"></void-button></fieldset>');
    const submit = vi.fn((e: Event) => e.preventDefault());
    const click = vi.fn();
    form.addEventListener('submit', submit);
    form.addEventListener('void-click', click);
    (form.querySelector('void-button') as VoidButton).click();
    expect(submit).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });
});

// ── Review findings (synchronous submit, fieldset, validity) ──

describe('review: synchronous form value (finding 1)', () => {
  beforeEach(() => installFakeInternals());

  it('a void-change listener that submits sees the new value', async () => {
    const form = await mount(`
      <void-switch name="s"></void-switch>
      <void-segmented-control name="seg" value="one"><void-segmented-control-item value="one"></void-segmented-control-item><void-segmented-control-item value="two"></void-segmented-control-item></void-segmented-control>
      <void-checkbox name="c"></void-checkbox>
      <void-toggle-group name="t" multiple><void-toggle value="x"></void-toggle></void-toggle-group>
    `);
    const seen: Array<Array<[string, string]>> = [];
    form.addEventListener('void-change', () => seen.push(entriesNow(form)));
    (form.querySelector('void-switch') as HTMLElement).click();
    (form.querySelectorAll('void-segmented-control-item')[1] as HTMLElement).click();
    (form.querySelector('void-checkbox') as HTMLElement).click();
    (form.querySelector('void-toggle') as HTMLElement).click();
    expect(seen).toEqual([
      [['s', 'on'], ['seg', 'one']],
      [['s', 'on'], ['seg', 'two']],
      [['s', 'on'], ['seg', 'two'], ['c', 'on']],
      [['s', 'on'], ['seg', 'two'], ['c', 'on'], ['t', 'x']],
    ]);
  });

  it('programmatic sets are visible to a submit in the same tick', async () => {
    const form = await mount(`
      <void-switch name="s"></void-switch>
      <void-checkbox name="c"></void-checkbox>
      <void-input name="i" value="a"></void-input>
      <void-multiselect name="m"><void-option value="a">A</void-option></void-multiselect>
      <void-radio-group name="r" value="x"><void-radio value="x"></void-radio><void-radio value="y"></void-radio></void-radio-group>
    `);
    (form.querySelector('void-switch') as VoidSwitch).checked = true;
    (form.querySelector('void-checkbox') as VoidCheckbox).checked = true;
    (form.querySelector('void-input') as VoidInput).value = 'b';
    (form.querySelector('void-multiselect') as VoidMultiselect).value = ['a'];
    (form.querySelector('void-radio-group') as VoidRadioGroup).value = 'y';
    expect(entriesNow(form)).toEqual([['s', 'on'], ['c', 'on'], ['i', 'b'], ['m', 'a'], ['r', 'y']]);
  });
});

describe('review: fieldset disabled (finding 5)', () => {
  beforeEach(() => installFakeInternals());

  it('number-input steppers and keys do nothing inside a disabled fieldset', async () => {
    const form = await mount('<fieldset disabled><void-number-input name="n" value="5"></void-number-input></fieldset>');
    const num = form.querySelector('void-number-input') as VoidNumberInput;
    const spy = vi.fn();
    form.addEventListener('void-change', spy);
    num.querySelector('.void-number-input-btn-inc')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    num.querySelector('.void-number-input-btn-inc')!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    num.querySelector('.void-number-input-field')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await settle(form);
    expect(num.value).toBe(5);
    expect(spy).not.toHaveBeenCalled();
  });

  it('switch, checkbox and radio reflect fieldset state in aria-disabled and tabindex, and recover', async () => {
    const form = await mount('<fieldset disabled><void-switch name="s"></void-switch><void-checkbox name="c"></void-checkbox><void-radio name="r" value="1"></void-radio></fieldset>');
    const fs = form.querySelector('fieldset')!;
    const hosts = Array.from(fs.children) as HTMLElement[];
    expect(hosts.map((h) => `${h.getAttribute('aria-disabled')}/${h.getAttribute('tabindex')}`)).toEqual(['true/-1', 'true/-1', 'true/-1']);
    setFieldsetDisabled(fs, false);
    await settle(form);
    expect(hosts.map((h) => `${h.getAttribute('aria-disabled')}/${h.getAttribute('tabindex')}`)).toEqual(['false/0', 'false/0', 'false/0']);
  });
});

describe('review: validity after re-enabling (finding 6)', () => {
  beforeEach(() => installFakeInternals());

  it('a required unchecked switch becomes invalid when its fieldset is enabled', async () => {
    const form = await mount('<fieldset disabled><void-switch name="s" required></void-switch></fieldset>');
    const sw = form.querySelector('void-switch') as VoidSwitch;
    expect(sw.checkValidity()).toBe(true);
    setFieldsetDisabled(form.querySelector('fieldset')!, false);
    await settle(form);
    expect(sw.checkValidity()).toBe(false);
  });

  it('a required control becomes invalid when its own disabled is cleared', async () => {
    const form = await mount('<void-switch name="s" required disabled></void-switch>');
    const sw = form.querySelector('void-switch') as VoidSwitch;
    expect(sw.checkValidity()).toBe(true);
    sw.disabled = false;
    await settle(form);
    expect(sw.checkValidity()).toBe(false);
  });
});

describe('review: uncommitted text (finding 2)', () => {
  beforeEach(() => installFakeInternals());

  it('number-input submits typed text before it is committed, and commits on change', async () => {
    const form = await mount('<void-number-input name="n" value="5" max="100"></void-number-input>');
    const num = form.querySelector('void-number-input') as VoidNumberInput;
    const field = num.querySelector<HTMLInputElement>('.void-number-input-field')!;
    field.value = '42';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    expect(entriesNow(form)).toEqual([['n', '42']]);
    expect(num.value).toBe(5);
    field.value = '500';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    expect(entriesNow(form)).toEqual([['n', '100']]);
    const spy = vi.fn();
    num.addEventListener('void-change', spy);
    field.value = '42';
    field.dispatchEvent(new Event('change', { bubbles: true }));
    expect(num.value).toBe(42);
    expect(spy).toHaveBeenCalledOnce();
    expect(entriesNow(form)).toEqual([['n', '42']]);
  });

  it('number-input programmatic sets win over stale field text', async () => {
    const form = await mount('<void-number-input name="n" value="5"></void-number-input>');
    const num = form.querySelector('void-number-input') as VoidNumberInput;
    num.value = 9;
    expect(entriesNow(form)).toEqual([['n', '9']]);
  });

  it('tags-input includes acceptable pending text, once', async () => {
    const form = await mount('<void-tags-input name="t"></void-tags-input>');
    const tags = form.querySelector('void-tags-input') as VoidTagsInput;
    tags.value = ['a'];
    const field = tags.querySelector<HTMLInputElement>('.void-tags-input-field')!;
    field.value = 'b';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    expect(entriesNow(form)).toEqual([['t', 'a'], ['t', 'b']]);
    field.value = 'a';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    expect(entriesNow(form)).toEqual([['t', 'a']]);
    field.value = 'c';
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(tags.value).toEqual(['a', 'c']);
    expect(entriesNow(form)).toEqual([['t', 'a'], ['t', 'c']]);
  });
});

describe('review: required and ARIA (finding 7)', () => {
  beforeEach(() => installFakeInternals());

  it('exposes aria-required, and aria-invalid only after interaction or a failed check', async () => {
    const form = await mount('<void-switch name="s" required></void-switch>');
    const sw = form.querySelector('void-switch') as VoidSwitch;
    expect(sw.getAttribute('aria-required')).toBe('true');
    expect(sw.hasAttribute('aria-invalid')).toBe(false);
    sw.dispatchEvent(new Event('invalid'));
    expect(sw.getAttribute('aria-invalid')).toBe('true');
    sw.click();
    expect(sw.hasAttribute('aria-invalid')).toBe(false);
    sw.required = false;
    await settle(form);
    expect(sw.hasAttribute('aria-required')).toBe(false);
  });

  it('checkbox, radio, radio-group, checkbox-group and action-input validate on the native control', async () => {
    const form = await mount(`
      <void-checkbox name="c" required></void-checkbox>
      <void-radio name="r" value="1" required></void-radio><void-radio name="r" value="2"></void-radio>
      <void-radio-group name="g" required><void-radio value="x"></void-radio></void-radio-group>
      <void-checkbox-group name="h" required><void-checkbox value="z"></void-checkbox><void-checkbox value="w"></void-checkbox></void-checkbox-group>
      <void-action-input name="a" required></void-action-input>
    `);
    const native = (sel: string) => form.querySelector<HTMLInputElement>(sel)!;
    expect(native('void-checkbox[name="c"] input').required).toBe(true);
    expect(native('void-radio[value="1"] input').required).toBe(true);
    expect(native('void-radio[value="x"] input').required).toBe(true);
    expect(native('void-action-input input').required).toBe(true);
    // checkbox-group: "at least one" via a custom validity message on the first checkbox.
    expect(native('void-checkbox[value="z"] input').validationMessage).toBe('Please check at least one box.');
    expect(native('void-checkbox[value="w"] input').validationMessage).toBe('');
    (form.querySelector('void-checkbox[value="w"]') as HTMLElement).click();
    await settle(form);
    expect(native('void-checkbox[value="z"] input').validationMessage).toBe('');
    // Hosts expose aria-required.
    expect(form.querySelector('void-checkbox[name="c"]')!.getAttribute('aria-required')).toBe('true');
    // Focus handed from the aria-hidden native input to the host.
    native('void-checkbox[name="c"] input').focus();
    expect(document.activeElement).toBe(form.querySelector('void-checkbox[name="c"]'));
  });

  it('a required group with no focusable child makes the host focusable instead of failing silently', async () => {
    const form = await mount('<void-toggle-group name="t" required></void-toggle-group>');
    const tg = form.querySelector('void-toggle-group') as VoidToggleGroup;
    expect(tg.checkValidity()).toBe(false);
    expect(tg.getAttribute('tabindex')).toBe('-1');
  });
});

describe('review: valueless checkbox (finding 10a)', () => {
  it('value defaults to "on", matching what it submits', async () => {
    const form = await mount('<void-checkbox-group name="g"><void-checkbox checked></void-checkbox></void-checkbox-group><void-checkbox name="c" checked></void-checkbox>');
    expect((form.querySelector('void-checkbox[name="c"]') as VoidCheckbox).value).toBe('on');
    expect((form.querySelector('void-checkbox-group') as VoidCheckboxGroup).value).toEqual(['on']);
    expect([...new FormData(form).entries()]).toEqual([['g', 'on'], ['c', 'on']]);
  });
});

describe('review: Enter with only a void-button (finding 8)', () => {
  const press = (form: HTMLFormElement) =>
    form.querySelector('void-input input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

  it('submits a multi-field form whose only submit button is a void-button', async () => {
    const form = await mount('<void-input name="a"></void-input><void-input name="b"></void-input><void-button type="submit"></void-button>');
    const submit = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', submit);
    press(form);
    expect(submit).toHaveBeenCalledOnce();
  });

  it('leaves it to the browser when there is a native submit button or a single field', async () => {
    for (const html of [
      '<void-input name="a"></void-input><void-input name="b"></void-input><button>go</button><void-button type="submit"></void-button>',
      '<void-input name="a"></void-input><void-button type="submit"></void-button>',
      '<void-input name="a"></void-input><void-input name="b"></void-input>',
      '<void-input name="a"></void-input><void-input name="b"></void-input><void-button type="submit" disabled></void-button>',
    ]) {
      const form = await mount(html);
      const submit = vi.fn((e: Event) => e.preventDefault());
      form.addEventListener('submit', submit);
      press(form);
      expect(submit, html).not.toHaveBeenCalled();
      form.remove();
    }
  });
});

describe('native-backed: disabled groups and form attribute', () => {
  it('a disabled radio-group / checkbox-group disables its children like a fieldset', async () => {
    const form = await mount(`
      <void-radio-group name="g" value="x" disabled><void-radio value="x"></void-radio></void-radio-group>
      <void-checkbox-group name="h" disabled><void-checkbox value="z" checked></void-checkbox></void-checkbox-group>
    `);
    expect([...new FormData(form).entries()]).toEqual([]);
    expect(form.querySelector('void-radio')!.getAttribute('aria-disabled')).toBe('true');
    const spy = vi.fn();
    form.addEventListener('void-change', spy);
    (form.querySelector('void-checkbox') as HTMLElement).click();
    expect(spy).not.toHaveBeenCalled();
    (form.querySelector('void-checkbox-group') as VoidCheckboxGroup).toggleAttribute('disabled', false);
    await settle(form);
    expect([...new FormData(form).entries()]).toEqual([['h', 'z']]);
    expect(form.querySelector('void-checkbox')!.getAttribute('aria-disabled')).toBe('false');
  });

  it('forwards the form attribute to the native control (and through groups)', async () => {
    document.body.innerHTML = '<form id="other"></form>';
    const form = await mount(`
      <void-input name="a" form="other"></void-input>
      <void-checkbox-group name="h" form="other"><void-checkbox value="z" checked></void-checkbox></void-checkbox-group>
    `);
    expect(form.querySelector('void-input input')!.getAttribute('form')).toBe('other');
    expect(form.querySelector('void-checkbox input')!.getAttribute('form')).toBe('other');
  });
});
