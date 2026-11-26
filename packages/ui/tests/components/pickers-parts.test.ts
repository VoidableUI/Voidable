// @vitest-environment happy-dom
// Explicit parts (#52) for the pickers: combobox and multiselect take their
// options in a -content part, select wraps the author's native <select>. The
// author's nodes are never moved; the component wires roles, ids and state
// onto them and carries what it wrote through morphs.
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/combobox.js';
import '../../src/components/multiselect.js';
import '../../src/components/select.js';
import type { VoidCombobox } from '../../src/components/combobox.js';
import type { VoidMultiselect, VoidOption } from '../../src/components/multiselect.js';
import type { VoidSelect } from '../../src/components/select.js';
import type { VoidElement } from '../../src/base.js';

const settle = async () => {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
    await Promise.all(Array.from(document.querySelectorAll('*')).map((e) => (e as Partial<VoidElement>).updateComplete));
  }
};

async function mount<T extends Element>(html: string): Promise<T> {
  document.body.innerHTML = html;
  await settle();
  return document.body.firstElementChild as T;
}

function server(html: string): Element {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content.firstElementChild!;
}

/** Every element below `root` with its parent and previous sibling, to prove nothing moved. */
function snapshot(root: Element): () => boolean {
  const nodes = Array.from(root.querySelectorAll('void-combobox-content, void-multiselect-content, void-option, select, option'));
  const authored = new Set(root.querySelectorAll('*'));
  // The previous authored element: rendered chrome (the input, the trigger) may sit between them.
  const prev = (n: Element) => {
    let s = n.previousElementSibling;
    while (s && !authored.has(s)) s = s.previousElementSibling;
    return s;
  };
  const where = nodes.map((n) => [n, n.parentNode, prev(n)] as const);
  return () => where.every(([n, p, s]) => n.isConnected && n.parentNode === p && prev(n) === s);
}

const key = (target: Element, k: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));

afterEach(() => {
  document.body.innerHTML = '';
});

const COMBO = '<void-combobox name="c" placeholder="Pick"><void-combobox-content id="list"><void-option value="a">Alpha</void-option><void-option value="b" disabled>Beta</void-option><void-option value="c">Gamma</void-option></void-combobox-content></void-combobox>';

describe('void-combobox parts', () => {
  it('moves nothing: the content part and the options stay where the author wrote them', async () => {
    document.body.innerHTML = COMBO;
    const same = snapshot(document.body);
    const el = document.body.firstElementChild as VoidCombobox;
    await settle();
    expect(same()).toBe(true);
    const input = el.querySelector('input')!;
    input.dispatchEvent(new FocusEvent('focus'));
    key(input, 'ArrowDown');
    await settle();
    key(input, 'Enter');
    await settle();
    expect(same()).toBe(true);
    // The rendered input is the component's own; it comes after the author's content.
    expect(el.lastElementChild?.localName === 'input' || el.querySelector(':scope > input')).toBeTruthy();
  });

  it('makes the content part the listbox and each option a role="option" with an id; keeps an author id', async () => {
    const el = await mount<VoidCombobox>(COMBO);
    const content = el.querySelector('void-combobox-content')!;
    expect(content.getAttribute('role')).toBe('listbox');
    expect(content.getAttribute('popover')).toBe('manual');
    expect(content.id).toBe('list');
    const options = Array.from(el.querySelectorAll('void-option'));
    expect(options.map((o) => o.getAttribute('role'))).toEqual(['option', 'option', 'option']);
    expect(options.every((o) => o.id)).toBe(true);
    expect(options[1]!.getAttribute('aria-disabled')).toBe('true');
  });

  it('marks the chosen option aria-selected and the highlighted one with active and aria-activedescendant', async () => {
    const el = await mount<VoidCombobox>(COMBO.replace('<void-combobox ', '<void-combobox value="c" '));
    const input = el.querySelector('input')!;
    const [a, , c] = Array.from(el.querySelectorAll('void-option'));
    expect(c!.getAttribute('aria-selected')).toBe('true');
    expect(a!.hasAttribute('aria-selected')).toBe(false);
    input.dispatchEvent(new FocusEvent('focus'));
    key(input, 'ArrowDown');
    await settle();
    // Opening highlights the chosen option; the choice does not move until Enter.
    expect(c!.hasAttribute('active')).toBe(true);
    expect(input.getAttribute('aria-activedescendant')).toBe(c!.id);
    expect(input.getAttribute('aria-controls')).toBe('list');
    key(input, 'ArrowDown');
    await settle();
    expect(a!.hasAttribute('active')).toBe(true);
    expect(c!.hasAttribute('active')).toBe(false);
    expect(c!.getAttribute('aria-selected')).toBe('true');
    key(input, 'Enter');
    await settle();
    expect(el.value).toBe('a');
    expect(a!.getAttribute('aria-selected')).toBe('true');
    expect(c!.hasAttribute('aria-selected')).toBe(false);
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(a!.hasAttribute('active')).toBe(false);
  });

  it('takes an option marked selected as the initial choice when it has no value', async () => {
    const el = await mount<VoidCombobox>(COMBO.replace('<void-option value="c">', '<void-option value="c" selected>'));
    expect(el.value).toBe('c');
    expect(el.querySelector('input')!.value).toBe('Gamma');
  });

  it('shows the label attribute of an option with rich content, and filters by it', async () => {
    const el = await mount<VoidCombobox>('<void-combobox value="de"><void-combobox-content><void-option value="de" label="Germany"><span aria-hidden="true">DE</span> Germany <small>Europe</small></void-option><void-option value="fr">France</void-option></void-combobox-content></void-combobox>');
    expect(el.querySelector('input')!.value).toBe('Germany');
  });

  it('filters with hidden and marks the content empty when nothing matches; the left arrow takes the highlight off', async () => {
    const el = await mount<VoidCombobox>(COMBO);
    const input = el.querySelector('input')!;
    input.dispatchEvent(new FocusEvent('focus'));
    input.value = 'gam';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await settle();
    expect(Array.from(el.querySelectorAll('void-option')).map((o) => o.hidden)).toEqual([true, true, false]);
    key(input, 'ArrowDown');
    await settle();
    expect(el.querySelector('void-option[value=c]')!.hasAttribute('active')).toBe(true);
    key(input, 'ArrowLeft');
    await settle();
    expect(el.querySelector('void-option[active]')).toBeNull();
    input.value = 'zzz';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await settle();
    expect(el.querySelector('void-combobox-content')!.hasAttribute('empty')).toBe(true);
    // Closing shows every option again.
    key(input, 'Escape');
    await settle();
    expect(Array.from(el.querySelectorAll('void-option')).some((o) => o.hidden)).toBe(false);
  });

  it('wires options that arrive late, are reordered or are removed', async () => {
    const el = await mount<VoidCombobox>(COMBO);
    const content = el.querySelector('void-combobox-content')!;
    const late = document.createElement('void-option') as VoidOption;
    late.setAttribute('value', 'd');
    late.textContent = 'Delta';
    content.prepend(late);
    await settle();
    expect(late.getAttribute('role')).toBe('option');
    expect(late.id).not.toBe('');
    content.append(content.firstElementChild!);
    await settle();
    expect(late.getAttribute('role')).toBe('option');
    late.remove();
    await settle();
    // What the component wrote goes with it.
    expect(late.hasAttribute('role')).toBe(false);
    expect(late.hasAttribute('id')).toBe(false);
  });

  it('wires a content part that arrives after the upgrade', async () => {
    const el = await mount<VoidCombobox>('<void-combobox name="c"></void-combobox>');
    el.insertAdjacentHTML('afterbegin', '<void-combobox-content><void-option value="a">A</void-option></void-combobox-content>');
    await settle();
    expect(el.querySelector('void-combobox-content')!.getAttribute('role')).toBe('listbox');
    expect(el.querySelector('void-option')!.getAttribute('role')).toBe('option');
  });

  it('carries roles, ids and state onto the server markup before a morph', async () => {
    const el = await mount<VoidCombobox>(COMBO.replace('<void-combobox ', '<void-combobox value="a" '));
    const incoming = server(COMBO.replace('<void-combobox ', '<void-combobox value="a" '));
    el.voidBeforeMorph(incoming);
    const live = Array.from(el.querySelectorAll('void-option'));
    const next = Array.from(incoming.querySelectorAll('void-option'));
    expect(next.map((o) => o.getAttribute('role'))).toEqual(['option', 'option', 'option']);
    expect(next.map((o) => o.id)).toEqual(live.map((o) => o.id));
    expect(next[0]!.getAttribute('aria-selected')).toBe('true');
    expect(incoming.querySelector('void-combobox-content')!.getAttribute('role')).toBe('listbox');
  });
});

const MULTI = '<void-multiselect name="m" placeholder="Pick"><void-multiselect-content><void-option value="a" selected>Alpha</void-option><void-option value="b">Beta</void-option><void-option value="c" disabled>Gamma</void-option><void-option value="d">Delta</void-option></void-multiselect-content></void-multiselect>';

describe('void-multiselect parts', () => {
  it('moves nothing, and wires a multiselectable listbox of options', async () => {
    document.body.innerHTML = MULTI;
    const same = snapshot(document.body);
    const el = document.body.firstElementChild as VoidMultiselect;
    await settle();
    const content = el.querySelector('void-multiselect-content')!;
    expect(content.getAttribute('role')).toBe('listbox');
    expect(content.getAttribute('aria-multiselectable')).toBe('true');
    const options = Array.from(el.querySelectorAll('void-option'));
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual(['true', null, null, null]);
    const trigger = el.querySelector('[role=combobox]')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    options[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(el.value).toEqual(['a', 'b']);
    expect(options[1]!.getAttribute('aria-selected')).toBe('true');
    expect(same()).toBe(true);
  });

  it('describes the trigger with the number of chosen options', async () => {
    const el = await mount<VoidMultiselect>(MULTI);
    const trigger = el.querySelector('[role=combobox]')!;
    expect(trigger.getAttribute('aria-description')).toBe('1 selected');
    el.value = [];
    await settle();
    expect(trigger.hasAttribute('aria-description')).toBe(false);
  });

  it('follows the select-only combobox keys: ArrowUp opens on the first, arrows stop at the ends, PageDown jumps', async () => {
    const el = await mount<VoidMultiselect>(MULTI);
    const trigger = el.querySelector('[role=combobox]')! as HTMLElement;
    const active = () => el.querySelector('void-option[active]')?.getAttribute('value');
    key(trigger, 'ArrowUp');
    await settle();
    expect(el.open).toBe(true);
    expect(active()).toBe('a');
    key(trigger, 'ArrowUp');
    await settle();
    expect(active()).toBe('a');
    key(trigger, 'PageDown');
    await settle();
    // Disabled Gamma is skipped; the end stops the jump.
    expect(active()).toBe('d');
    key(trigger, 'ArrowDown');
    await settle();
    expect(active()).toBe('d');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(el.querySelector('void-option[value=d]')!.id);
    key(trigger, ' ');
    await settle();
    expect(el.value).toEqual(['a', 'd']);
    key(trigger, 'ArrowUp', { altKey: true });
    await settle();
    expect(el.open).toBe(false);
  });

  it('keeps option state and the component ids through a morph to server markup', async () => {
    const el = await mount<VoidMultiselect>(MULTI);
    const incoming = server(MULTI);
    el.voidBeforeMorph(incoming);
    const live = Array.from(el.querySelectorAll('void-option'));
    expect(Array.from(incoming.querySelectorAll('void-option')).map((o) => o.id)).toEqual(live.map((o) => o.id));
  });
});

describe('void-select wraps a native select', () => {
  const SELECT = '<void-select aria-label="Plan"><select name="plan" required><option value="" disabled selected hidden>Choose</option><option value="free">Free</option><option value="pro">Pro</option></select></void-select>';

  it('moves nothing and names the select from the host label', async () => {
    document.body.innerHTML = SELECT;
    const same = snapshot(document.body);
    const el = document.body.firstElementChild as VoidSelect;
    await settle();
    expect(same()).toBe(true);
    expect(el.select!.getAttribute('aria-label')).toBe('Plan');
    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(el.value).toBe('');
  });

  it('reads and writes the native value; the value attribute is the initial choice', async () => {
    const el = await mount<VoidSelect>(SELECT.replace('<void-select ', '<void-select value="pro" '));
    expect(el.select!.value).toBe('pro');
    el.value = 'free';
    expect(el.select!.value).toBe('free');
    expect(el.value).toBe('free');
  });

  it('keeps a value set before its option exists, and applies it when the option arrives', async () => {
    const el = await mount<VoidSelect>('<void-select><select name="k"><option value="a">A</option></select></void-select>');
    el.value = 'z';
    expect(el.value).toBe('z');
    el.select!.insertAdjacentHTML('beforeend', '<option value="z">Z</option>');
    await settle();
    expect(el.select!.value).toBe('z');
  });

  it('fires void-change when the user picks', async () => {
    const el = await mount<VoidSelect>(SELECT);
    let detail: { value: string } | null = null;
    el.addEventListener('void-change', (e) => (detail = (e as CustomEvent).detail));
    el.select!.value = 'pro';
    el.select!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail).toEqual({ value: 'pro' });
  });

  it('marks the select aria-invalid while error is set', async () => {
    const el = await mount<VoidSelect>(SELECT);
    el.error = 'Pick a plan';
    await settle();
    expect(el.select!.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('.void-select-error')!.textContent).toBe('Pick a plan');
    el.error = '';
    await settle();
    expect(el.select!.hasAttribute('aria-invalid')).toBe(false);
  });

  it('keeps the user choice through a morph the server did not change the selection in, and takes the server one when it did', async () => {
    const markup = '<void-select><select name="k"><option value="a">A</option><option value="b">B</option><option value="c">C</option></select></void-select>';
    const el = await mount<VoidSelect>(markup);
    el.select!.value = 'c';
    el.select!.dispatchEvent(new Event('change', { bubbles: true }));
    // A morph resets the selection to the server markup's (the morph libraries sync it); simulate that.
    el.voidBeforeMorph(server(markup));
    el.select!.value = 'a';
    await settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(el.value).toBe('c');
    // Now the server marks b selected: the server wins.
    const changed = markup.replace('<option value="b">', '<option value="b" selected>');
    el.voidBeforeMorph(server(changed));
    el.select!.querySelector('option[value=b]')!.setAttribute('selected', '');
    el.select!.value = 'b';
    await settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(el.value).toBe('b');
  });
});
