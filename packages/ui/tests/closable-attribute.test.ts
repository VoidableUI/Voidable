// @vitest-environment happy-dom
//
// `closable` defaults to true on void-dialog and void-drawer; markup turns it
// off with closable="false" (a plain Lit Boolean attribute could only say true).
import { describe, it, expect, afterEach } from 'vitest';
import '../src/index.js';
import { defaultTrueBoolean } from '../src/converters.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('defaultTrueBoolean', () => {
  it('reads "false" as false and anything else, including no attribute, as true', () => {
    expect(defaultTrueBoolean.fromAttribute!('false', Boolean)).toBe(false);
    expect(defaultTrueBoolean.fromAttribute!('', Boolean)).toBe(true);
    expect(defaultTrueBoolean.fromAttribute!('true', Boolean)).toBe(true);
    expect(defaultTrueBoolean.fromAttribute!(null, Boolean)).toBe(true);
  });

  it('writes true as an empty attribute and false as "false"', () => {
    expect(defaultTrueBoolean.toAttribute!(true, Boolean)).toBe('');
    expect(defaultTrueBoolean.toAttribute!(false, Boolean)).toBe('false');
  });
});

describe.each(['void-dialog', 'void-drawer'])('%s closable attribute', (tag) => {
  async function mount(html: string) {
    document.body.innerHTML = html;
    const el = document.body.firstElementChild as HTMLElement & { closable: boolean; open: boolean; updateComplete: Promise<unknown> };
    await el.updateComplete;
    return el;
  }
  const closeButton = (el: Element) => {
    const b = el.shadowRoot?.querySelector<HTMLElement>('[part="close"]');
    return b && !b.hidden ? b : null;
  };

  it('closable="false" in markup turns it off', async () => {
    const el = await mount(`<${tag} open closable="false"></${tag}>`);
    expect(el.closable).toBe(false);
    expect(closeButton(el)).toBeNull();
  });

  it('no attribute keeps the default (true)', async () => {
    const el = await mount(`<${tag} open></${tag}>`);
    expect(el.closable).toBe(true);
    expect(closeButton(el)).not.toBeNull();
  });

  it('a server changing or removing the attribute updates the property', async () => {
    const el = await mount(`<${tag} open closable="false"></${tag}>`);
    el.setAttribute('closable', 'true');
    await el.updateComplete;
    expect(el.closable).toBe(true);
    el.setAttribute('closable', 'false');
    await el.updateComplete;
    expect(el.closable).toBe(false);
    el.removeAttribute('closable');
    await el.updateComplete;
    expect(el.closable).toBe(true);
  });

  it('Escape does not close a closable="false" element', async () => {
    const el = await mount(`<${tag} open closable="false"></${tag}>`);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(el.open).toBe(true);
  });
});

describe('void-drawer reflects closable', () => {
  it('writes closable="false" when the property is turned off', async () => {
    document.body.innerHTML = '<void-drawer></void-drawer>';
    const el = document.body.firstElementChild as HTMLElement & { closable: boolean; updateComplete: Promise<unknown> };
    await el.updateComplete;
    expect(el.getAttribute('closable')).toBe('');
    el.closable = false;
    await el.updateComplete;
    expect(el.getAttribute('closable')).toBe('false');
  });
});
