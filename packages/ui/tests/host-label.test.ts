// @vitest-environment happy-dom
// aria-label / aria-labelledby on the host of a component whose host is not
// the control (VoidElement.labelTarget): they name the inner control.
import { describe, it, expect, afterEach } from 'vitest';
import type { VoidElement } from '../src/base.js';
import '../src/components/select.js';
import '../src/components/input.js';
import '../src/components/number-input.js';
import '../src/components/combobox.js';
import '../src/components/textarea.js';
import '../src/components/slider.js';
import '../src/components/field.js';

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await new Promise(r => setTimeout(r, 0));
    await Promise.all(Array.from(document.querySelectorAll('*')).map(e => (e as Partial<VoidElement>).updateComplete).filter(Boolean));
  }
}

async function mount(html: string): Promise<HTMLElement> {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  await settle();
  return wrap.firstElementChild as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

const CASES: [string, string, string][] = [
  ['void-select', '<option value="a">A</option>', 'select'],
  ['void-input', '', 'input'],
  ['void-textarea', '', 'textarea'],
  ['void-number-input', '', 'input[role=spinbutton]'],
  ['void-combobox', '', 'input[role=combobox]'],
  ['void-slider', '', 'input'],
];

describe('host labelling', () => {
  for (const [tag, inner, control] of CASES) {
    it(`${tag}: aria-label on the host names the ${control}, and leaves the host`, async () => {
      const el = await mount(`<${tag} aria-label="Country">${inner}</${tag}>`);
      expect(el.querySelector(control)!.getAttribute('aria-label')).toBe('Country');
      expect(el.hasAttribute('aria-label')).toBe(false);
    });

    it(`${tag}: aria-labelledby on the host points the ${control} at the label`, async () => {
      const el = await mount(`<${tag} aria-labelledby="lbl">${inner}</${tag}>`);
      expect(el.querySelector(control)!.getAttribute('aria-labelledby')).toBe('lbl');
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });
  }

  it('setting the attribute again renames; an empty string removes the name', async () => {
    const el = await mount('<void-input aria-label="One"></void-input>');
    el.setAttribute('aria-label', 'Two');
    await settle();
    expect(el.querySelector('input')!.getAttribute('aria-label')).toBe('Two');
    el.setAttribute('aria-label', '');
    await settle();
    expect(el.querySelector('input')!.hasAttribute('aria-label')).toBe(false);
  });

  it('a morph to server markup without the name removes it; with it, keeps it', async () => {
    const el = await mount('<void-input aria-label="Name"></void-input>');
    const tpl = document.createElement('template');
    tpl.innerHTML = '<void-input aria-label="Name"></void-input>';
    (el as unknown as VoidElement).voidBeforeMorph(tpl.content.firstElementChild);
    el.setAttribute('aria-label', 'Name');
    await settle();
    expect(el.querySelector('input')!.getAttribute('aria-label')).toBe('Name');
    tpl.innerHTML = '<void-input></void-input>';
    (el as unknown as VoidElement).voidBeforeMorph(tpl.content.firstElementChild);
    await settle();
    expect(el.querySelector('input')!.hasAttribute('aria-label')).toBe(false);
  });

  it('inside void-field the field label wins over a host aria-labelledby', async () => {
    const field = await mount('<void-field label="Email"><void-input aria-labelledby="other"></void-input></void-field><p id="other">x</p>');
    const input = field.querySelector('input')!;
    const labelId = field.querySelector('.void-field-label')!.id;
    expect(input.getAttribute('aria-labelledby')).toBe(labelId);
  });
});
