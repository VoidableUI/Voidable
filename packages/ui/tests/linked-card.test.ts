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

  it('ignores tags that cannot be linked', () => {
    document.body.innerHTML = '<a href="/x"><void-badge>x</void-badge></a>';
    expect(checkLinked(table, document.querySelector('void-badge')!)).toBeUndefined();
  });
});
