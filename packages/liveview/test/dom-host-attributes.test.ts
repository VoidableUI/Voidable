import { describe, it, expect, afterEach } from 'vitest';
import '@voidable/ui';
import { VoidDOM } from '../src/dom.js';

// Host attributes through VoidDOM with real components (issue #61).

afterEach(() => {
  document.body.innerHTML = '';
});

const settle = async () => {
  for (let i = 0; i < 4; i++) await new Promise(r => setTimeout(r, 0));
};

function server(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

describe('VoidDOM and host attributes', () => {
  it('copies the component attributes onto toEl where the server markup has none', async () => {
    document.body.innerHTML = '<void-button id="b" variant="filled">Go</void-button>';
    await settle();
    const btn = document.getElementById('b')!;
    const to = server('<void-button id="b" variant="filled" tabindex="-1">Go</void-button>');
    VoidDOM.onBeforeElUpdated(btn, to);
    expect(to.getAttribute('role')).toBe('button');
    expect(to.getAttribute('aria-disabled')).toBe('false');
    expect(to.getAttribute('size')).toBe('md');
    // Values the server markup sets follow the server.
    expect(to.getAttribute('tabindex')).toBe('-1');
    expect(to.getAttribute('variant')).toBe('filled');
  });

  it('does not let the copied attributes become the server baseline', async () => {
    document.body.innerHTML = '<void-switch id="s">N</void-switch>';
    await settle();
    const sw = document.getElementById('s')!;
    VoidDOM.onBeforeElUpdated(sw, server('<void-switch id="s">N</void-switch>'));
    // The server renders aria-checked itself for the first time: a change, so it wins.
    const to = server('<void-switch id="s" aria-checked="mixed">N</void-switch>');
    VoidDOM.onBeforeElUpdated(sw, to);
    expect(to.getAttribute('aria-checked')).toBe('mixed');
  });
});
