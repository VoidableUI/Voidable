// @vitest-environment happy-dom
//
// void-select enhances the author's native <select> in place (#52): the select
// is the form control, so submission, reset and validity are native. These
// cover where the component's `value` meets it: a value set in code reaching a
// same-tick submit, a value whose option arrives late, a select that arrives
// after the upgrade, the `value` attribute as the reset target, and a removed
// option.
import { describe, it, expect, afterEach } from 'vitest';
import '../src/index.js';
import type { VoidSelect } from '../src/components/select.js';

async function settle(root: ParentNode): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  for (let i = 0; i < 3; i++) {
    const els = Array.from(root.querySelectorAll('*')).filter((e) => 'updateComplete' in e) as unknown as Array<{
      updateComplete: Promise<unknown>;
    }>;
    await Promise.all(els.map((e) => e.updateComplete));
  }
}

async function mount(html: string): Promise<HTMLFormElement> {
  const form = document.createElement('form');
  form.innerHTML = html;
  document.body.appendChild(form);
  await settle(form);
  return form;
}

const options = '<option value="a">A</option><option value="b">B</option>';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('void-select value and the native select', () => {
  it('a programmatic value is visible to a submit in the same tick', async () => {
    const form = await mount(`<void-select value="a"><select name="s">${options}</select></void-select>`);
    const el = form.querySelector('void-select') as VoidSelect;
    el.value = 'b';
    expect(new FormData(form).get('s')).toBe('b');
    const submitted: Array<FormDataEntryValue | null> = [];
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitted.push(new FormData(form).get('s'));
    });
    el.value = 'a';
    form.requestSubmit();
    expect(submitted).toEqual(['a']);
  });

  it('without a value attribute the options decide, as in plain HTML', async () => {
    const form = await mount(
      `<void-select><select name="s">${options}</select></void-select>` +
        '<void-select><select name="t"><option value="x">X</option><option value="y" selected>Y</option></select></void-select>',
    );
    const [s, t] = Array.from(form.querySelectorAll('void-select')) as VoidSelect[];
    expect(s.value).toBe('a');
    expect(t.value).toBe('y');
  });

  it('enhances a select that arrives after the upgrade', async () => {
    const form = await mount('');
    const el = document.createElement('void-select') as VoidSelect;
    el.setAttribute('value', 'b');
    form.appendChild(el);
    await settle(form);
    expect(el.value).toBe('b');
    el.insertAdjacentHTML('beforeend', `<select name="s">${options}</select>`);
    await settle(form);
    expect(form.querySelector('select')!.value).toBe('b');
    expect(new FormData(form).get('s')).toBe('b');
  });

  it('a reset goes back to the value attribute when there is one, else to the options', async () => {
    const form = await mount(
      `<void-select value="b"><select name="s">${options}</select></void-select>` +
        `<void-select><select name="t">${options}</select></void-select>`,
    );
    const [s, t] = Array.from(form.querySelectorAll('void-select')) as VoidSelect[];
    s.value = 'a';
    t.value = 'b';
    form.reset();
    await settle(form);
    expect(s.value).toBe('b');
    expect(t.value).toBe('a');
  });

  it('when the chosen option is removed, the property, the native select and the form agree; no void-change', async () => {
    const form = await mount(`<void-select value="b"><select name="s">${options}<option value="c">C</option></select></void-select>`);
    const el = form.querySelector('void-select') as VoidSelect;
    const native = form.querySelector('select')!;
    let changes = 0;
    el.addEventListener('void-change', () => changes++);
    Array.from(native.options).find((o) => o.value === 'b')!.remove();
    await settle(form);
    expect(el.value).toBe(native.value);
    expect(new FormData(form).get('s')).toBe(native.value);
    expect(changes).toBe(0);
  });
});
