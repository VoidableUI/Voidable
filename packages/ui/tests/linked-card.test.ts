// @vitest-environment happy-dom
// A card that is a link or a button (#116): the card points the control's aria-describedby at its
// description, and the development warnings report a card wrapped in a link or a button and a linked
// card holding a second control, each with the corrected markup.
import { describe, it, expect, beforeEach } from 'vitest';
import '../src/components/card.js';
import { checkLinked } from '../src/dev/rules.js';
import type { DevTable } from '../src/dev/types.js';

const table: DevTable = {
  'void-card': {
    m: 'card',
    a: {},
    e: [],
    k: { p: 'void-card-title', c: ['void-button', 'void-checkbox'], s: 'put the one link or button in the title' },
  },
};

const card = (header: string, rest = '') =>
  `<void-card><void-card-header>${header}</void-card-header><void-card-body>Body</void-card-body>${rest}</void-card>`;

const ready = async (el: Element) => {
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
};

function mount(html: string): Element {
  document.body.innerHTML = html;
  return document.body.querySelector('void-card')!;
}

describe('a card that is a link or a button: wiring', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('points the link at the description, generating an id only when the description has none', async () => {
    const el = mount(card('<void-card-title><a href="/x">Ada</a></void-card-title><void-card-description>One line.</void-card-description>'));
    await ready(el);
    const a = el.querySelector('a')!;
    const description = el.querySelector('void-card-description')!;
    expect(description.id).toMatch(/^void-card-description-/);
    expect(a.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('keeps an id and an aria-describedby the author wrote', async () => {
    const el = mount(
      card('<void-card-title><button type="button" aria-describedby="mine">Go</button></void-card-title><void-card-description id="d">One line.</void-card-description>'),
    );
    await ready(el);
    expect(el.querySelector('void-card-description')!.id).toBe('d');
    expect(el.querySelector('button')!.getAttribute('aria-describedby')).toBe('mine d');
  });

  it('wires a link inside a heading in the title', async () => {
    const el = mount(card('<void-card-title><h3><a href="/x">Ada</a></h3></void-card-title><void-card-description>One line.</void-card-description>'));
    await ready(el);
    expect(el.querySelector('a')!.getAttribute('aria-describedby')).toBe(el.querySelector('void-card-description')!.id);
  });

  it('leaves a static card, and a card with a title but no description, alone', async () => {
    const el = mount(card('<void-card-title>Static</void-card-title><void-card-description>One line.</void-card-description>'));
    await ready(el);
    expect(el.querySelector('void-card-description')!.id).toBe('');
    const bare = mount(card('<void-card-title><a href="/x">Ada</a></void-card-title>'));
    await ready(bare);
    expect(bare.querySelector('a')!.hasAttribute('aria-describedby')).toBe(false);
  });

  it('does not move a node', async () => {
    const el = mount(card('<void-card-title><a href="/x">Ada</a></void-card-title><void-card-description>d</void-card-description>'));
    const before = Array.from(el.querySelectorAll('*'));
    await ready(el);
    expect(Array.from(el.querySelectorAll('*'))).toEqual(before);
  });
});

describe('an unavailable card (aria-disabled)', () => {
  it('marks its link aria-disabled and blocks activation, and unmarks it when it becomes available', async () => {
    const el = mount(
      `<void-card aria-disabled="true"><void-card-header><void-card-title><a href="/x">Ada</a></void-card-title><void-card-description>Needs a plan.</void-card-description></void-card-header><void-card-body>b</void-card-body></void-card>`,
    );
    await ready(el);
    const a = el.querySelector('a')!;
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.hasAttribute('tabindex')).toBe(false);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    el.removeAttribute('aria-disabled');
    await ready(el);
    expect(a.hasAttribute('aria-disabled')).toBe(false);
    const again = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(again);
    expect(again.defaultPrevented).toBe(false);
  });

  it('keeps an aria-disabled the author wrote on the control', async () => {
    const el = mount(card('<void-card-title><button type="button" aria-disabled="true">Go</button></void-card-title>'));
    await ready(el);
    expect(el.querySelector('button')!.getAttribute('aria-disabled')).toBe('true');
  });

  it('points a static unavailable card at its reason', async () => {
    const el = mount(
      `<void-card aria-disabled="true"><void-card-header><void-card-title>T</void-card-title><void-card-description>Reason.</void-card-description></void-card-header><void-card-body>b</void-card-body></void-card>`,
    );
    await ready(el);
    expect(el.getAttribute('aria-describedby')).toBe(el.querySelector('void-card-description')!.id);
  });
});

describe('checkLinked', () => {
  it('reports a card inside a link or a button, with the corrected markup', () => {
    document.body.innerHTML = `<a href="/x">${card('<void-card-title>T</void-card-title>')}</a>`;
    const w = checkLinked(table, document.querySelector('void-card')!)!;
    expect(w.kind).toBe('nested-control');
    expect(w.message).toContain('is inside <a>');
    expect(w.message).toContain('invalid HTML');
    expect(w.message).toContain('put the one link or button in the title');

    document.body.innerHTML = `<button type="button">${card('<void-card-title>T</void-card-title>')}</button>`;
    expect(checkLinked(table, document.querySelector('void-card')!)!.message).toContain('is inside <button>');
  });

  it('reports a second control in a linked card, in the footer, the body or the header', () => {
    for (const html of [
      card('<void-card-title><a href="/x">T</a></void-card-title>', '<void-card-footer><void-button>Edit</void-button></void-card-footer>'),
      card('<void-card-title><button type="button">T</button></void-card-title><void-card-description><a href="/y">y</a></void-card-description>'),
      card('<void-card-title><a href="/x">T</a></void-card-title>', '<void-card-footer><input type="text"></void-card-footer>'),
    ]) {
      document.body.innerHTML = html;
      const w = checkLinked(table, document.querySelector('void-card')!)!;
      expect(w.kind, html).toBe('nested-control');
      expect(w.message).toContain('also holds');
      expect(w.message).toContain('put the one link or button in the title');
    }
  });

  it('accepts a static card with any controls, a linked card with one control, and a void-button around one link', () => {
    for (const html of [
      card('<void-card-title>T</void-card-title>', '<void-card-footer><void-button>Edit</void-button><a href="/z">z</a></void-card-footer>'),
      card('<void-card-title><a href="/x">T</a></void-card-title><void-card-description>d</void-card-description>'),
      card('<void-card-title><a href="/x">T</a></void-card-title>', '<input type="hidden" name="x">'),
      card('<void-card-title>T</void-card-title>', '<void-card-footer><void-button><a href="/x">Open</a></void-button></void-card-footer>'),
    ]) {
      document.body.innerHTML = html;
      expect(checkLinked(table, document.querySelector('void-card')!), html).toBeUndefined();
    }
  });

  it('does the same for a row, from the styled table', () => {
    const styled = { 'void-row': { p: 'void-row-text', c: ['void-switch'], s: 'put the one link in the row text' } };
    document.body.innerHTML = '<a href="/x"><void-row><void-row-text>T</void-row-text></void-row></a>';
    expect(checkLinked(table, document.querySelector('void-row')!, styled)!.message).toContain('is inside <a>');
    document.body.innerHTML = '<void-row><void-row-text><a href="/x">T</a></void-row-text><void-switch aria-label="x"></void-switch></void-row>';
    const w = checkLinked(table, document.querySelector('void-row')!, styled)!;
    expect(w.message).toContain('a linked <void-row>');
    document.body.innerHTML = '<void-row><void-row-text><a href="/x">T</a></void-row-text><void-badge>b</void-badge></void-row>';
    expect(checkLinked(table, document.querySelector('void-row')!, styled)).toBeUndefined();
  });

  it('ignores tags that cannot be linked', () => {
    document.body.innerHTML = '<a href="/x"><void-badge>x</void-badge></a>';
    expect(checkLinked(table, document.querySelector('void-badge')!)).toBeUndefined();
  });
});
