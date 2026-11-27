// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDiff } from '../../src/components/diff.js';
import '../../src/messages/fr.js';
import '../../src/messages/ar.js';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

async function mount(html: string, lang?: string): Promise<VoidDiff> {
  const wrap = document.createElement('div');
  if (lang) wrap.lang = lang;
  wrap.innerHTML = html;
  document.body.append(wrap);
  const el = wrap.querySelector('void-diff') as VoidDiff;
  await el.updateComplete;
  await tick();
  return el;
}

/** Makes the diff report a content width, then lets the watcher measure (happy-dom lays nothing out). */
function resize(el: VoidDiff, scrollWidth: number, clientWidth: number): void {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  (el as unknown as { _overflow: { measure(): void } })._overflow.measure();
}

const HUNK =
  '<void-diff-hunk><void-diff-header>@@ -1,2 +1,2 @@</void-diff-header>' +
  '<void-diff-line old="1" new="1">const a = 1;</void-diff-line>' +
  '<void-diff-line kind="del" old="2">const b = <del>2</del>;</void-diff-line>' +
  '<void-diff-line kind="add" new="2">const b = <ins>3</ins>;</void-diff-line></void-diff-hunk>';
const FULL = `<void-diff line-numbers><void-diff-title>src/app.js</void-diff-title>${HUNK}</void-diff>`;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidDiff', () => {
  it('extends VoidElement and registers as void-diff', () => {
    expect(Object.getPrototypeOf(VoidDiff)).toBe(VoidElement);
    expect(customElements.get('void-diff')).toBe(VoidDiff);
  });

  it('defaults to no line numbers and no wrapping, and reflects both', async () => {
    const el = await mount(`<void-diff>${HUNK}</void-diff>`);
    expect(el.lineNumbers).toBe(false);
    expect(el.wrap).toBe(false);
    el.lineNumbers = true;
    el.wrap = true;
    await el.updateComplete;
    expect(el.hasAttribute('line-numbers')).toBe(true);
    expect(el.hasAttribute('wrap')).toBe(true);
  });

  describe('structure', () => {
    it('renders nothing, moves nothing and writes nothing on a hunk or a line', async () => {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<void-diff>${HUNK}</void-diff>`;
      const html = wrap.firstElementChild!.innerHTML;
      const nodes = Array.from(wrap.firstElementChild!.childNodes);
      document.body.append(wrap);
      const el = wrap.firstElementChild as VoidDiff;
      await el.updateComplete;
      await tick();
      expect(Array.from(el.childNodes)).toEqual(nodes);
      expect(el.innerHTML).toBe(html);
    });

    it('writes nothing on any line of a large diff', async () => {
      const lines = Array.from({ length: 2000 }, (_, i) => `<void-diff-line kind="${i % 3 === 0 ? 'add' : 'context'}" new="${i + 1}">line ${i}</void-diff-line>`).join('');
      const el = await mount(`<void-diff line-numbers><void-diff-hunk>${lines}</void-diff-hunk></void-diff>`);
      resize(el, 2000, 400);
      const all = el.querySelectorAll('void-diff-line');
      expect(all.length).toBe(2000);
      for (const line of Array.from(all)) expect(line.attributes.length).toBe(2);
    });
  });

  describe('text alternatives of the markers', () => {
    it('hands the theme "added" and "removed" as CSS strings', async () => {
      const el = await mount(FULL);
      expect(el.style.getPropertyValue('--_void-diff-added')).toBe('"added"');
      expect(el.style.getPropertyValue('--_void-diff-removed')).toBe('"removed"');
    });

    it('in the language of the page, following a change of language', async () => {
      const el = await mount(FULL, 'fr');
      expect(el.style.getPropertyValue('--_void-diff-added')).toBe('"ajout"');
      expect(el.style.getPropertyValue('--_void-diff-removed')).toBe('"suppression"');
      el.parentElement!.lang = 'ar';
      await tick();
      await el.updateComplete;
      expect(el.style.getPropertyValue('--_void-diff-added')).toBe('"إضافة"');
      expect(el.style.getPropertyValue('--_void-diff-removed')).toBe('"حذف"');
    });
  });

  describe('name', () => {
    it('is a group named by its title, with an id generated only when the title has none', async () => {
      const el = await mount(FULL);
      const title = el.querySelector('void-diff-title')!;
      expect(title.id).toMatch(/^void-diff-title-/);
      expect(el.getAttribute('role')).toBe('group');
      expect(el.getAttribute('aria-labelledby')).toBe(title.id);
      const own = await mount(`<void-diff><void-diff-title id="file">a.rb</void-diff-title>${HUNK}</void-diff>`);
      expect(own.getAttribute('aria-labelledby')).toBe('file');
    });

    it('has no role without a title or a name, and takes a title that arrives later', async () => {
      const el = await mount(`<void-diff>${HUNK}</void-diff>`);
      expect(el.hasAttribute('role')).toBe(false);
      const title = document.createElement('void-diff-title');
      title.textContent = 'late.js';
      el.prepend(title);
      await tick();
      expect(el.getAttribute('role')).toBe('group');
      expect(el.getAttribute('aria-labelledby')).toBe(title.id);
      title.remove();
      await tick();
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('keeps a name the author wrote', async () => {
      const el = await mount(`<void-diff aria-label="Changes to the invoice"><void-diff-title>a.js</void-diff-title>${HUNK}</void-diff>`);
      expect(el.getAttribute('aria-label')).toBe('Changes to the invoice');
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
      expect(el.getAttribute('role')).toBe('group');
    });
  });

  describe('keyboard scrolling', () => {
    it('is in the tab order only while a line is wider than it', async () => {
      const el = await mount(FULL);
      expect(el.hasAttribute('tabindex')).toBe(false);
      resize(el, 900, 400);
      expect(el.getAttribute('tabindex')).toBe('0');
      resize(el, 400, 400);
      expect(el.hasAttribute('tabindex')).toBe(false);
    });

    it('keeps a tabindex the author wrote', async () => {
      const el = await mount(`<void-diff tabindex="-1">${HUNK}</void-diff>`);
      resize(el, 900, 400);
      expect(el.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('morphs', () => {
    it('carries what it wrote onto the server\'s markup, so a morph keeps it', async () => {
      const el = await mount(FULL);
      resize(el, 900, 400);
      const incoming = document.createElement('div');
      incoming.innerHTML = FULL;
      const server = incoming.firstElementChild as HTMLElement;
      el.voidBeforeMorph(server);
      expect(server.getAttribute('tabindex')).toBe('0');
      expect(server.getAttribute('role')).toBe('group');
      expect(server.querySelector('void-diff-title')!.id).toBe(el.querySelector('void-diff-title')!.id);
      expect(server.getAttribute('aria-labelledby')).toBe(el.getAttribute('aria-labelledby'));
      expect(server.style.getPropertyValue('--_void-diff-added')).toBe('"added"');
    });
  });
});
