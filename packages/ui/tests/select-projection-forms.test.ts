// @vitest-environment happy-dom
//
// void-select is both a projection host (#4: consumer options are projected into
// the native <select>) and a native-backed form control (#5). These cover the
// points where the two meet: the placeholder option inside the projection
// container, value adoption without a second render, synchronous sync for a
// same-tick submit, and options that arrive after the element upgraded.
import { describe, it, expect, afterEach } from 'vitest';
import '../src/index.js';
import type { VoidSelect } from '../src/components/select.js';

async function settle(root: ParentNode): Promise<void> {
  // Native-backed hosts mirror their native control in a task after reset.
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
const values = (select: HTMLSelectElement) => Array.from(select.options).map((o) => o.value);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('void-select placeholder on the projection container', () => {
  it('changing placeholder at runtime keeps the projected options', async () => {
    const form = await mount(`<void-select name="s">${options}</void-select>`);
    const el = form.querySelector('void-select') as VoidSelect;
    const native = form.querySelector('select')!;
    const [a, b] = Array.from(native.options);
    el.placeholder = 'Pick one';
    await settle(form);
    expect(values(native)).toEqual(['', 'a', 'b']);
    expect(native.options[0].textContent).toBe('Pick one');
    el.placeholder = 'Choose';
    await settle(form);
    expect(values(native)).toEqual(['', 'a', 'b']);
    expect(native.options[0].textContent).toBe('Choose');
    el.placeholder = '';
    await settle(form);
    expect(values(native)).toEqual(['a', 'b']);
    // The consumer's option elements kept their identity throughout.
    expect(native.options[0]).toBe(a);
    expect(native.options[1]).toBe(b);
  });

  it('removing the placeholder while empty adopts the option the native select now shows', async () => {
    const form = await mount(`<void-select name="s" placeholder="Pick">${options}</void-select>`);
    const el = form.querySelector('void-select') as VoidSelect;
    expect(el.value).toBe('');
    el.placeholder = '';
    await settle(form);
    expect(el.value).toBe('a');
    expect(new FormData(form).get('s')).toBe('a');
  });

  it('options added later go after the placeholder', async () => {
    const form = await mount(`<void-select name="s" placeholder="Pick">${options}</void-select>`);
    const el = form.querySelector('void-select') as VoidSelect;
    el.insertAdjacentHTML('beforeend', '<option value="c">C</option>');
    el.insertAdjacentHTML('afterbegin', '<option value="z">Z</option>');
    await settle(form);
    expect(values(form.querySelector('select')!)).toEqual(['', 'z', 'a', 'b', 'c']);
    expect(el.value).toBe('');
  });

  it('voidUnproject() returns the host to its server shape without the placeholder, which comes back after', async () => {
    const form = await mount(`<void-select name="s" placeholder="Pick">${options}</void-select>`);
    const el = form.querySelector('void-select') as VoidSelect;
    expect(el.voidUnproject()).toBe(true);
    expect(Array.from(el.children).map((c) => c.outerHTML)).toEqual([
      '<option value="a">A</option>',
      '<option value="b">B</option>',
    ]);
    await el.voidReproject();
    await settle(form);
    expect(values(form.querySelector('select')!)).toEqual(['', 'a', 'b']);
    expect(form.querySelectorAll('option[data-void-placeholder]')).toHaveLength(1);
  });

  it('keeps the reset target when a morph strips default-selected attributes while unprojected', async () => {
    const form = await mount(`<void-select name="s" value="b">${options}</void-select>`);
    const el = form.querySelector('void-select') as VoidSelect;
    const native = form.querySelector('select')!;
    native.value = 'a';
    native.dispatchEvent(new Event('change'));
    expect(el.voidUnproject()).toBe(true);
    // What a morph against server markup without `selected` does to the host's options.
    for (const o of Array.from(el.querySelectorAll('option'))) o.removeAttribute('selected');
    await el.voidReproject();
    await settle(form);
    expect(el.value).toBe('a');
    expect(form.querySelector('select')!.value).toBe('a');
    form.reset();
    await settle(form);
    expect(el.value).toBe('b');
  });

  it('a stale placeholder copy from a serialised host is dropped, not duplicated', async () => {
    const form = await mount(`<void-select name="s" placeholder="Pick">${options}</void-select>`);
    const html = form.innerHTML;
    document.body.innerHTML = '';
    const again = await mount(html.replace(/<form>|<\/form>/g, ''));
    expect(values(again.querySelector('select')!)).toEqual(['', 'a', 'b']);
    expect(again.querySelectorAll('option[data-void-placeholder]')).toHaveLength(1);
  });
});

describe('void-select value adoption and synchronous sync', () => {
  it('a programmatic value is visible to a submit in the same tick', async () => {
    const form = await mount(`<void-select name="s" value="a">${options}</void-select>`);
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

  it('adopts the native choice before the first render, so there is no second render', async () => {
    const proto = customElements.get('void-select')!.prototype as unknown as {
      update(this: unknown, c: Map<string, unknown>): void;
    };
    const original = proto.update;
    const counts = new Map<unknown, number>();
    proto.update = function (this: unknown, changed: Map<string, unknown>) {
      counts.set(this, (counts.get(this) ?? 0) + 1);
      original.call(this, changed);
    };
    try {
      const form = await mount(
        `<void-select name="s">${options}</void-select>` +
          '<void-select name="t"><option value="x">X</option><option value="y" selected>Y</option></void-select>'
      );
      const [s, t] = Array.from(form.querySelectorAll('void-select')) as VoidSelect[];
      expect(s.value).toBe('a');
      expect(t.value).toBe('y');
      expect(counts.get(s)).toBe(1);
      expect(counts.get(t)).toBe(1);
    } finally {
      proto.update = original;
    }
  });

  it('an element upgraded before its options exist adopts, and resets to, the late options', async () => {
    const form = await mount('');
    const el = document.createElement('void-select') as VoidSelect;
    el.name = 's';
    form.appendChild(el);
    await settle(form);
    expect(el.value).toBe('');
    el.insertAdjacentHTML('beforeend', options);
    await settle(form);
    const native = form.querySelector('select')!;
    expect(values(native)).toEqual(['a', 'b']);
    expect(el.value).toBe('a');
    native.value = 'b';
    native.dispatchEvent(new Event('change'));
    expect(el.value).toBe('b');
    form.reset();
    await settle(form);
    expect(el.value).toBe('a');
    expect(native.value).toBe('a');
  });

  it('an explicit value whose option arrives late is selected and stays the reset target', async () => {
    const form = await mount('');
    const el = document.createElement('void-select') as VoidSelect;
    el.name = 's';
    el.value = 'b';
    form.appendChild(el);
    await settle(form);
    el.insertAdjacentHTML('beforeend', options);
    await settle(form);
    const native = form.querySelector('select')!;
    expect(native.value).toBe('b');
    native.value = 'a';
    native.dispatchEvent(new Event('change'));
    // Options changing after the user picked must not move the reset target.
    el.insertAdjacentHTML('beforeend', '<option value="c">C</option>');
    await settle(form);
    expect(el.value).toBe('a');
    form.reset();
    await settle(form);
    expect(el.value).toBe('b');
  });
});
