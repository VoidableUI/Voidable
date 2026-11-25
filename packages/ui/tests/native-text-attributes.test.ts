// @vitest-environment happy-dom
//
// void-input, void-textarea and void-action-input declare the standard native
// text attributes and forward each one to their native control.
import { describe, it, expect, afterEach } from 'vitest';
import '../src/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

type El = HTMLElement & Record<string, unknown> & { updateComplete: Promise<unknown> };

async function mount(tag: string, attrs: Record<string, string>): Promise<El> {
  const el = document.createElement(tag) as El;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const controls: Array<[tag: string, selector: string, withPattern: boolean]> = [
  ['void-input', 'input', true],
  ['void-action-input', 'input.void-action-input-field', true],
  ['void-textarea', 'textarea', false],
];

describe.each(controls)('%s forwards native attributes', (tag, selector, withPattern) => {
  const native = (el: El) => el.querySelector(selector) as HTMLElement;

  const forwarded: Array<[attr: string, value: string]> = [
    ['autocomplete', 'current-password'],
    ['minlength', '8'],
    ['maxlength', '20'],
    ['inputmode', 'numeric'],
    ['enterkeyhint', 'send'],
    ['autocapitalize', 'words'],
    ['spellcheck', 'false'],
  ];
  if (withPattern) forwarded.push(['pattern', '[A-Z]{3}']);

  it.each(forwarded)('%s="%s" reaches the native control', async (attr, value) => {
    const el = await mount(tag, { [attr]: value });
    expect(native(el).getAttribute(attr)).toBe(value);
  });

  it('forwards nothing when the attributes are not set', async () => {
    const el = await mount(tag, {});
    for (const attr of ['autocomplete', 'minlength', 'maxlength', 'pattern', 'inputmode', 'enterkeyhint', 'autocapitalize', 'spellcheck']) {
      expect(native(el).hasAttribute(attr), attr).toBe(false);
    }
  });

  it('updates the native control when a property changes, and removes the attribute when cleared', async () => {
    const el = await mount(tag, {});
    el.autocomplete = 'one-time-code';
    el.minlength = 4;
    el.maxlength = 6;
    el.inputMode = 'numeric';
    el.enterKeyHint = 'done';
    el.autocapitalize = 'off';
    el.spellcheck = false;
    await el.updateComplete;
    const n = native(el);
    expect(n.getAttribute('autocomplete')).toBe('one-time-code');
    expect(n.getAttribute('minlength')).toBe('4');
    expect(n.getAttribute('maxlength')).toBe('6');
    expect(n.getAttribute('inputmode')).toBe('numeric');
    expect(n.getAttribute('enterkeyhint')).toBe('done');
    expect(n.getAttribute('autocapitalize')).toBe('off');
    expect(n.getAttribute('spellcheck')).toBe('false');
    el.autocomplete = '';
    el.minlength = undefined;
    el.maxlength = undefined;
    el.inputMode = '';
    el.enterKeyHint = '';
    el.autocapitalize = '';
    el.spellcheck = true;
    await el.updateComplete;
    for (const attr of ['autocomplete', 'minlength', 'maxlength', 'inputmode', 'enterkeyhint', 'autocapitalize', 'spellcheck']) {
      expect(n.hasAttribute(attr), attr).toBe(false);
    }
  });

  it('forwards spellcheck="true" only when the author wrote it', async () => {
    const el = await mount(tag, { spellcheck: 'true' });
    expect(native(el).getAttribute('spellcheck')).toBe('true');
  });

  it('forwards readonly', async () => {
    const el = await mount(tag, { readonly: '' });
    expect((native(el) as HTMLInputElement).readOnly).toBe(true);
  });
});

describe('void-input type', () => {
  it.each(['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'datetime-local', 'month', 'time', 'week'])(
    'forwards type="%s" to the native input',
    async (type) => {
      const el = await mount('void-input', { type });
      expect(el.querySelector('input')!.getAttribute('type')).toBe(type);
    },
  );
});

describe('void-action-input type', () => {
  it.each(['text', 'password', 'search', 'email', 'tel', 'url'])('forwards type="%s" to the native input', async (type) => {
    const el = await mount('void-action-input', { type });
    expect(el.querySelector('input')!.getAttribute('type')).toBe(type);
  });
});

describe('void-action-input accessible name', () => {
  it('names the input from its own aria-label or placeholder, not the action label', async () => {
    const withLabel = await mount('void-action-input', { 'aria-label': 'Search docs', 'action-label': 'Go' });
    expect(withLabel.querySelector('input')!.getAttribute('aria-label')).toBe('Search docs');
    expect(withLabel.querySelector('button')!.getAttribute('aria-label')).toBe('Go');
    document.body.innerHTML = '';
    const withPlaceholder = await mount('void-action-input', { placeholder: 'Find a page', 'action-label': 'Go' });
    expect(withPlaceholder.querySelector('input')!.getAttribute('aria-label')).toBe('Find a page');
  });
});
