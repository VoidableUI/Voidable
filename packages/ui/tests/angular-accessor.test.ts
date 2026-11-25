// The generated Angular ControlValueAccessor (dist/angular/index.js), driven
// against the real elements. The partial declarations in that file are normally
// linked by the Angular CLI; here @angular/compiler is loaded first so
// @angular/core can JIT them, which is enough to construct the class.
// Requires a prior build; `mise run test` depends on `mise run build`.
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ElementRef } from '@angular/core';

// Registers every element (each module calls customElements.define).
import.meta.glob('../src/components/*.ts', { eager: true });

const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist/angular/index.js');
const { VoidValueAccessor } = (await import(/* @vite-ignore */ dist)) as {
  VoidValueAccessor: new (ref: ElementRef<HTMLElement>) => {
    writeValue(v: unknown): void;
    registerOnChange(fn: (v: unknown) => void): void;
    registerOnTouched(fn: () => void): void;
    setDisabledState(d: boolean): void;
    handleEvent(e: Event): void;
  };
};

/** The tags the accessor's selector claims, read from the shipped file. */
const source = readFileSync(dist, 'utf8');
const selector = /selector: '([^']+)'/.exec(source)![1];
const tags = [...new Set([...selector.matchAll(/(void-[a-z-]+)\[ngModel\]/g)].map((m) => m[1]))];

async function mount(html: string) {
  const host = document.createElement('div');
  document.body.append(host);
  host.innerHTML = html;
  const el = host.firstElementChild as HTMLElement & Record<string, unknown>;
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  const accessor = new VoidValueAccessor(new ElementRef(el));
  const onChange = vi.fn();
  const onTouched = vi.fn();
  accessor.registerOnChange(onChange);
  accessor.registerOnTouched(onTouched);
  // Angular wires the host listeners declared in the directive; do the same here.
  for (const type of ['void-input', 'void-change']) el.addEventListener(type, (e) => accessor.handleEvent(e));
  return { el, accessor, onChange, onTouched };
}

describe('VoidValueAccessor', () => {
  it('claims a selector for every form control and for nothing else', () => {
    expect(tags.length).toBeGreaterThanOrEqual(15);
    for (const tag of tags) expect(customElements.get(tag), `${tag} is not a registered element`).toBeTruthy();
    for (const tag of ['void-input', 'void-select', 'void-checkbox', 'void-switch', 'void-number-input', 'void-multiselect']) {
      expect(tags).toContain(tag);
    }
    // Not form controls, or driven by a group instead.
    for (const tag of ['void-button', 'void-radio', 'void-tabs', 'void-carousel', 'void-pagination']) {
      expect(tags).not.toContain(tag);
    }
    for (const kind of ['ngModel', 'formControl', 'formControlName']) {
      expect(selector).toContain(`void-input[${kind}]`);
    }
  });

  it('writes the empty value for null on every claimed tag, without throwing', async () => {
    for (const tag of tags) {
      const { accessor, el } = await mount(`<${tag}></${tag}>`);
      expect(() => accessor.writeValue(null), tag).not.toThrow();
      expect(el.isConnected).toBe(true);
    }
  });

  it('text input: writes the value and reports typing', async () => {
    const { el, accessor, onChange } = await mount('<void-input></void-input>');
    accessor.writeValue('hello');
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('hello');
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith('typed');
  });

  it('checkbox: writes `checked` and reports a click', async () => {
    const { el, accessor, onChange } = await mount('<void-checkbox>C</void-checkbox>');
    accessor.writeValue(true);
    expect(el.checked).toBe(true);
    accessor.writeValue(null);
    expect(el.checked).toBe(false);
    el.click();
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it('select: writes the value and reports a choice', async () => {
    const { el, accessor, onChange } = await mount(
      '<void-select><option value="a">A</option><option value="b">B</option></void-select>',
    );
    accessor.writeValue('b');
    expect(el.value).toBe('b');
    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = 'a';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  it('array-valued control: the multiselect value is the `values` of its event', async () => {
    const { el, accessor } = await mount('<void-multiselect><void-option value="a">A</void-option><void-option value="b">B</void-option></void-multiselect>');
    accessor.writeValue(['a', 'b']);
    expect(el.value).toEqual(['a', 'b']);
    accessor.writeValue(null);
    expect(el.value).toEqual([]);
  });

  it('ignores events that bubble up from a nested control', async () => {
    const { el, onChange } = await mount(
      '<void-checkbox-group><void-checkbox value="a">A</void-checkbox></void-checkbox-group>',
    );
    (el.querySelector('void-checkbox') as HTMLElement).click();
    // The nested checkbox's void-change bubbles to the group; the group's own
    // accessor must not treat `{ checked }` as the group's value.
    expect(onChange).not.toHaveBeenCalledWith(true);
  });

  it('propagates the disabled state to the element', async () => {
    const { el, accessor } = await mount('<void-input></void-input>');
    accessor.setDisabledState(true);
    expect(el.disabled).toBe(true);
    accessor.setDisabledState(false);
    expect(el.disabled).toBe(false);
  });
});
