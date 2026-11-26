// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { englishMessages, langOf, localeOf, msg, nameHost, registerMessages } from '../src/messages.js';
import '../src/messages/fr.js';
import '../src/messages/ar.js';

/** An element the registry can redraw: anything with `requestUpdate`. */
function watched(lang?: string, parent: HTMLElement = document.body): HTMLElement & { redraws: number } {
  const el = document.createElement('div') as HTMLElement & { redraws: number; requestUpdate: () => void };
  el.redraws = 0;
  el.requestUpdate = () => { el.redraws++; };
  if (lang !== undefined) el.setAttribute('lang', lang);
  parent.append(el);
  return el;
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('lang');
  // Put the English the test overrode back.
  registerMessages('en', englishMessages as never);
});

describe('lookup', () => {
  it('answers in English for an element with no lang', () => {
    expect(msg(watched(), 'pagination.next')).toBe('Next page');
  });

  it('follows the closest lang, then the page, then English', () => {
    const outer = watched('fr');
    const inner = watched(undefined, outer);
    expect(msg(inner, 'pagination.next')).toBe('Page suivante');
    document.documentElement.lang = 'ar';
    expect(msg(watched(), 'pagination.next')).toBe('الصفحة التالية');
    expect(msg(watched('xx'), 'pagination.next')).toBe('Next page');
  });

  it('ignores an empty lang attribute', () => {
    document.documentElement.lang = 'fr';
    expect(msg(watched(''), 'pagination.next')).toBe('Page suivante');
  });

  it('falls back from the region to the language to English, per key', () => {
    registerMessages('pt', { 'pagination.next': 'Próxima página' });
    registerMessages('pt-BR', { 'pagination.previous': 'Página anterior (BR)' });
    const el = watched('pt-BR');
    expect(msg(el, 'pagination.previous')).toBe('Página anterior (BR)');
    expect(msg(el, 'pagination.next')).toBe('Próxima página');
    expect(msg(el, 'pagination.label')).toBe('Pagination');
    expect(msg(watched('pt-PT'), 'pagination.previous')).toBe('Previous page');
  });

  it('matches a tag whatever its case or separator', () => {
    registerMessages('PT_br', { 'pagination.next': 'Próxima' });
    expect(msg(watched('pt-BR'), 'pagination.next')).toBe('Próxima');
  });

  it('registering a locale again merges and overrides', () => {
    registerMessages('xx-test', { close: 'A', dismiss: 'B' });
    registerMessages('xx-test', { dismiss: 'C' });
    const el = watched('xx-test');
    expect(msg(el, 'close')).toBe('A');
    expect(msg(el, 'dismiss')).toBe('C');
  });

  it('lets an application override the English', () => {
    registerMessages('en', { 'pagination.next': 'Next' });
    expect(msg(watched(), 'pagination.next')).toBe('Next');
  });

  it('formats for the element: lang, an own locale first, en-US without any', () => {
    expect(localeOf(watched())).toBe('en-US');
    expect(localeOf(watched('de-DE'))).toBe('de-DE');
    expect(localeOf(watched('de-DE'), 'fr-CA')).toBe('fr-CA');
    expect(langOf(null)).toBe('en');
  });
});

describe('functions and plurals', () => {
  it('passes the parameters and writes English plurals', () => {
    const el = watched();
    expect(msg(el, 'removeItem', { name: 'a.txt' })).toBe('Remove a.txt');
    expect(msg(el, 'indicator.count', { count: 1 })).toBe('1 notification');
    expect(msg(el, 'indicator.count', { count: 2 })).toBe('2 notifications');
    expect(msg(el, 'carousel.slide', { index: 2, count: 5 })).toBe('2 of 5');
  });

  it('uses the plural rules of the locale: French counts 0 and 1 as one', () => {
    const el = watched('fr');
    expect(msg(el, 'indicator.count', { count: 0 })).toBe('0 notification');
    expect(msg(el, 'indicator.count', { count: 1 })).toBe('1 notification');
    expect(msg(el, 'indicator.count', { count: 5 })).toBe('5 notifications');
  });

  it('uses all six Arabic plural forms', () => {
    const el = watched('ar');
    const text = (count: number) => msg(el, 'indicator.count', { count });
    expect(text(0)).toBe('لا إشعارات');
    expect(text(1)).toBe('إشعار واحد');
    expect(text(2)).toBe('إشعاران');
    expect(text(3)).toContain('إشعارات');
    expect(text(11)).toContain('إشعارًا');
    expect(text(100)).toContain('إشعار');
    const forms = new Set([0, 1, 2, 3, 11, 100].map(text));
    expect(forms.size).toBe(6);
  });

  it('gives a message function the locale it was registered for', () => {
    registerMessages('xx-ctx', { removeItem: (_p, c) => c.locale });
    expect(msg(watched('xx-ctx-ZZ'), 'removeItem', { name: 'n' })).toBe('xx-ctx');
  });
});

describe('the shipped locales', () => {
  it.each(['fr', 'ar'])('%s has a message for every key', (lang) => {
    const el = watched(lang);
    for (const key of Object.keys(englishMessages) as Array<keyof typeof englishMessages>) {
      const params = { name: 'n', limit: 'l', browse: 'b', format: 'f', date: 'd', index: 1, count: 2 } as never;
      const text = msg(el, key, params);
      expect(text, key).not.toBe('');
      if (lang === 'ar') {
        expect(text, `${lang} ${key} is still the English`).not.toBe(msg(watched(), key, params));
      }
    }
  });
});

describe('nameHost', () => {
  const write = (el: Element) => (name: string, value: string | null) => {
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  };

  it('names the host, and renames it when the text changes', () => {
    const el = watched();
    nameHost(el, 'One', write(el));
    expect(el.getAttribute('aria-label')).toBe('One');
    nameHost(el, 'Two', write(el));
    expect(el.getAttribute('aria-label')).toBe('Two');
  });

  it('never replaces a name the author wrote', () => {
    const el = watched();
    el.setAttribute('aria-label', 'Mine');
    nameHost(el, 'One', write(el));
    expect(el.getAttribute('aria-label')).toBe('Mine');
    // Nor one the author wrote after the component's own.
    const other = watched();
    nameHost(other, 'One', write(other));
    other.setAttribute('aria-label', 'Theirs');
    nameHost(other, 'Two', write(other));
    expect(other.getAttribute('aria-label')).toBe('Theirs');
  });
});

describe('reaction', () => {
  let el: ReturnType<typeof watched>;
  beforeEach(() => {
    el = watched();
    msg(el, 'close');
  });

  it('redraws an element when the lang of an ancestor changes', async () => {
    const section = document.createElement('section');
    document.body.append(section);
    const inside = watched(undefined, section);
    msg(inside, 'close');
    const outside = el;
    await tick();
    inside.redraws = outside.redraws = 0;
    section.setAttribute('lang', 'fr');
    await tick();
    expect(inside.redraws).toBe(1);
    expect(outside.redraws).toBe(0);
    expect(msg(inside, 'close')).toBe('Fermer');
  });

  it('redraws on a change of the page lang, and of its own', async () => {
    await tick();
    el.redraws = 0;
    document.documentElement.setAttribute('lang', 'ar');
    await tick();
    expect(el.redraws).toBe(1);
    el.setAttribute('lang', 'fr');
    await tick();
    expect(el.redraws).toBe(2);
  });

  it('redraws when a locale is registered', () => {
    el.redraws = 0;
    registerMessages('zz', { close: 'Z' });
    expect(el.redraws).toBe(1);
  });

  it('uses one observer for every element', () => {
    const state = (globalThis as unknown as Record<symbol, { observer: MutationObserver | null }>)[Symbol.for('@voidable/ui/messages')];
    const observer = state.observer;
    expect(observer).not.toBeNull();
    for (let i = 0; i < 50; i++) msg(watched(), 'close');
    expect(state.observer).toBe(observer);
  });

  it('does not watch an element that cannot redraw', async () => {
    const plain = document.createElement('div');
    document.body.append(plain);
    expect(msg(plain, 'close')).toBe('Close');
    expect(() => registerMessages('zz', {})).not.toThrow();
  });
});
