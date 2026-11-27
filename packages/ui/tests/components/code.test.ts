// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCode } from '../../src/components/code.js';
import '../../src/messages/fr.js';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

async function mount(html: string, lang?: string): Promise<VoidCode> {
  const wrap = document.createElement('div');
  if (lang) wrap.lang = lang;
  wrap.innerHTML = html;
  document.body.append(wrap);
  const el = wrap.querySelector('void-code') as VoidCode;
  await el.updateComplete;
  await tick();
  return el;
}

/** Makes the block's `<pre>` report a content width, then lets the watcher measure (happy-dom lays nothing out). */
function resize(el: VoidCode, scrollWidth: number, clientWidth: number): void {
  const pre = el.querySelector('pre')!;
  Object.defineProperty(pre, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(pre, 'clientWidth', { configurable: true, value: clientWidth });
  (el as unknown as { _overflow: { measure(): void } })._overflow.measure();
}

const FULL =
  '<void-code line-numbers><void-code-title>app.js</void-code-title><void-code-copy><button type="button"></button></void-code-copy>' +
  '<pre><code>\n  <void-code-line>const a = 1;</void-code-line>\n  <void-code-line><span class="k">const</span> b = 2;</void-code-line>\n</code></pre></void-code>';

let written: string[] = [];

beforeEach(() => {
  written = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (written.push(text), Promise.resolve()) },
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('VoidCode', () => {
  it('extends VoidElement and registers as void-code', () => {
    expect(Object.getPrototypeOf(VoidCode)).toBe(VoidElement);
    expect(customElements.get('void-code')).toBe(VoidCode);
  });

  it('defaults to no line numbers and no wrapping, and reflects both', async () => {
    const el = await mount('<void-code><pre><code>x</code></pre></void-code>');
    expect(el.lineNumbers).toBe(false);
    expect(el.wrap).toBe(false);
    el.lineNumbers = true;
    el.wrap = true;
    await el.updateComplete;
    expect(el.hasAttribute('line-numbers')).toBe(true);
    expect(el.hasAttribute('wrap')).toBe(true);
  });

  describe('structure', () => {
    it('renders nothing and moves nothing: the children are the nodes the author wrote', async () => {
      const wrap = document.createElement('div');
      wrap.innerHTML = '<void-code><pre><code>npm install</code></pre></void-code>';
      const before = Array.from(wrap.firstElementChild!.childNodes);
      const code = wrap.querySelector('code')!;
      document.body.append(wrap);
      const el = wrap.firstElementChild as VoidCode;
      await el.updateComplete;
      await tick();
      expect(Array.from(el.childNodes)).toEqual(before);
      expect(el.querySelector('code')).toBe(code);
      expect(code.textContent).toBe('npm install');
    });

    it('adds one thing, a hidden live region, and only when there is a copy part', async () => {
      const el = await mount(FULL);
      const added = Array.from(el.children).filter((c) => c.hasAttribute('data-void-announcer'));
      expect(added.length).toBe(1);
      expect(added[0]!.getAttribute('aria-live')).toBe('polite');
      expect(added[0]!.textContent).toBe('');
      expect(el.lastElementChild).toBe(added[0]);
      const lines = el.querySelectorAll('void-code-line');
      expect(lines.length).toBe(2);
      for (const line of Array.from(lines)) expect(line.attributes.length).toBe(0);
    });
  });

  describe('text', () => {
    it('is the text of the <pre> without its last newline', async () => {
      const el = await mount('<void-code><pre><code>one\n  two\n</code></pre></void-code>');
      expect(el.text).toBe('one\n  two');
    });

    it('is the lines joined by newlines, without the white space between them or the highlighter markup', async () => {
      const el = await mount(FULL);
      expect(el.text).toBe('const a = 1;\nconst b = 2;');
    });

    it('keeps empty lines', async () => {
      const el = await mount('<void-code><pre><code><void-code-line>a</void-code-line><void-code-line></void-code-line><void-code-line>b</void-code-line></code></pre></void-code>');
      expect(el.text).toBe('a\n\nb');
    });
  });

  describe('the copy control', () => {
    it('names an empty button from the messages', async () => {
      const el = await mount(FULL);
      expect(el.querySelector('button')!.getAttribute('aria-label')).toBe('Copy code');
    });

    it('names it in the language of the page, and follows a change of language', async () => {
      const el = await mount(FULL, 'fr');
      expect(el.querySelector('button')!.getAttribute('aria-label')).toBe('Copier le code');
      el.parentElement!.lang = 'en';
      await tick();
      await el.updateComplete;
      await tick();
      expect(el.querySelector('button')!.getAttribute('aria-label')).toBe('Copy code');
    });

    it('keeps a name the author wrote, and leaves a button with text alone', async () => {
      const named = await mount('<void-code><void-code-copy><button type="button" aria-label="Copy the command"></button></void-code-copy><pre><code>x</code></pre></void-code>');
      expect(named.querySelector('button')!.getAttribute('aria-label')).toBe('Copy the command');
      const text = await mount('<void-code><void-code-copy><button type="button">Copy</button></void-code-copy><pre><code>x</code></pre></void-code>');
      expect(text.querySelector('button')!.hasAttribute('aria-label')).toBe(false);
    });

    it('names a copy part that arrives later, and takes the name off a control that is no longer one', async () => {
      const el = await mount('<void-code><pre><code>x</code></pre></void-code>');
      const part = document.createElement('void-code-copy');
      const button = document.createElement('button');
      part.append(button);
      el.prepend(part);
      await tick();
      expect(button.getAttribute('aria-label')).toBe('Copy code');
      el.after(button);
      await tick();
      expect(button.hasAttribute('aria-label')).toBe(false);
    });

    it('copies the text when pressed, fires void-copy, marks the part and announces it', async () => {
      const el = await mount(FULL);
      const events: string[] = [];
      el.addEventListener('void-copy', (e) => events.push((e as CustomEvent<{ value: string }>).detail.value));
      el.querySelector('button')!.click();
      await tick();
      expect(written).toEqual(['const a = 1;\nconst b = 2;']);
      expect(events).toEqual(['const a = 1;\nconst b = 2;']);
      expect(el.querySelector('void-code-copy')!.hasAttribute('copied')).toBe(true);
      expect(el.querySelector('[data-void-announcer]')!.textContent).toBe('Copied');
    });

    it('takes copied off the part again after two seconds', async () => {
      const el = await mount(FULL);
      vi.useFakeTimers();
      const done = el.copy();
      await vi.advanceTimersByTimeAsync(0);
      expect(await done).toBe(true);
      expect(el.querySelector('void-code-copy')!.hasAttribute('copied')).toBe(true);
      await vi.advanceTimersByTimeAsync(2000);
      expect(el.querySelector('void-code-copy')!.hasAttribute('copied')).toBe(false);
    });

    it('announces a second copy too', async () => {
      const el = await mount(FULL);
      await el.copy();
      const first = el.querySelector('[data-void-announcer]')!.textContent;
      await el.copy();
      const second = el.querySelector('[data-void-announcer]')!.textContent;
      expect(first).toBe('Copied');
      expect(second).not.toBe(first);
      expect(second!.trim()).toBe('Copied');
    });

    it('does nothing for a disabled control or a press elsewhere in the block', async () => {
      const el = await mount('<void-code><void-code-copy><button type="button" disabled></button></void-code-copy><pre><code>x</code></pre></void-code>');
      el.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      el.querySelector('pre')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await tick();
      expect(written).toEqual([]);
    });

    it('reports a failed copy: no event, no state', async () => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
      const el = await mount(FULL);
      let fired = false;
      el.addEventListener('void-copy', () => (fired = true));
      const exec = document.execCommand;
      (document as unknown as { execCommand: unknown }).execCommand = () => false;
      try {
        expect(await el.copy()).toBe(false);
      } finally {
        (document as unknown as { execCommand: unknown }).execCommand = exec;
      }
      expect(fired).toBe(false);
      expect(el.querySelector('void-code-copy')!.hasAttribute('copied')).toBe(false);
    });
  });

  describe('name', () => {
    it('is a group named by its title, with an id generated only when the title has none', async () => {
      const el = await mount(FULL);
      const title = el.querySelector('void-code-title')!;
      expect(title.id).toMatch(/^void-code-title-/);
      expect(el.getAttribute('role')).toBe('group');
      expect(el.getAttribute('aria-labelledby')).toBe(title.id);
      const own = await mount('<void-code><void-code-title id="file">a.rb</void-code-title><pre><code>x</code></pre></void-code>');
      expect(own.getAttribute('aria-labelledby')).toBe('file');
    });

    it('has no role without a title, and gives both up when the title goes', async () => {
      const plain = await mount('<void-code><pre><code>x</code></pre></void-code>');
      expect(plain.hasAttribute('role')).toBe(false);
      const el = await mount(FULL);
      el.querySelector('void-code-title')!.remove();
      await tick();
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('keeps the name and the role the author wrote', async () => {
      const el = await mount('<void-code aria-label="Install command" role="figure"><void-code-title>sh</void-code-title><pre><code>x</code></pre></void-code>');
      expect(el.getAttribute('aria-label')).toBe('Install command');
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
      expect(el.getAttribute('role')).toBe('figure');
    });
  });

  describe('keyboard scrolling', () => {
    it('puts the <pre> in the tab order only while its content is wider than it', async () => {
      const el = await mount(FULL);
      const pre = el.querySelector('pre')!;
      expect(pre.hasAttribute('tabindex')).toBe(false);
      resize(el, 900, 400);
      expect(pre.getAttribute('tabindex')).toBe('0');
      resize(el, 400, 400);
      expect(pre.hasAttribute('tabindex')).toBe(false);
    });

    it('keeps a tabindex the author wrote', async () => {
      const el = await mount('<void-code><pre tabindex="-1"><code>x</code></pre></void-code>');
      resize(el, 900, 400);
      expect(el.querySelector('pre')!.getAttribute('tabindex')).toBe('-1');
      resize(el, 400, 400);
      expect(el.querySelector('pre')!.getAttribute('tabindex')).toBe('-1');
    });

    it('follows a <pre> that replaces the first one', async () => {
      const el = await mount(FULL);
      resize(el, 900, 400);
      const next = document.createElement('pre');
      next.innerHTML = '<code>y</code>';
      el.querySelector('pre')!.replaceWith(next);
      await tick();
      expect(next.hasAttribute('tabindex')).toBe(false);
      resize(el, 900, 400);
      expect(next.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('morphs', () => {
    it('carries what it wrote onto the server\'s markup, so a morph keeps it', async () => {
      const el = await mount(FULL);
      resize(el, 900, 400);
      const incoming = document.createElement('div');
      incoming.innerHTML = FULL;
      const server = incoming.firstElementChild!;
      el.voidBeforeMorph(server);
      expect(server.querySelector('button')!.getAttribute('aria-label')).toBe('Copy code');
      expect(server.querySelector('pre')!.getAttribute('tabindex')).toBe('0');
      expect(server.querySelector('void-code-title')!.id).toBe(el.querySelector('void-code-title')!.id);
      expect(server.getAttribute('role')).toBe('group');
      expect(server.querySelectorAll(':scope > [data-void-announcer="code"]').length).toBe(1);
      el.voidBeforeMorph(server);
      expect(server.querySelectorAll(':scope > [data-void-announcer="code"]').length).toBe(1);
    });

    it('adopts the live region of markup restored from a snapshot, and adds no second one', async () => {
      const el = await mount(FULL);
      const restored = await mount(el.outerHTML);
      expect(restored.querySelectorAll('[data-void-announcer]').length).toBe(1);
      expect(restored.children.length).toBe(el.children.length);
      await restored.copy();
      expect(restored.querySelector('[data-void-announcer]')!.textContent).toBe('Copied');
    });
  });
});
