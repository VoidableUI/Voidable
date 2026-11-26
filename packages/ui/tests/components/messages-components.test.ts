// @vitest-environment happy-dom
// What a component says follows the closest `lang`, an attribute the author wrote wins, and a change of `lang`
// above the component rewrites it.
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/breadcrumbs.js';
import '../../src/components/pagination.js';
import '../../src/components/spinner.js';
import '../../src/components/combobox.js';
import '../../src/components/calendar.js';
import '../../src/components/number-input.js';
import '../../src/components/indicator.js';
import '../../src/components/status-dot.js';
import '../../src/messages/fr.js';
import '../../src/messages/ar.js';
import type { VoidCalendar } from '../../src/components/calendar.js';
import type { VoidNumberInput } from '../../src/components/number-input.js';

const settle = async (el: Element) => {
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
};

function mount<T extends Element>(html: string, lang?: string): { root: HTMLElement; el: T } {
  const root = document.createElement('div');
  if (lang) root.lang = lang;
  root.innerHTML = html;
  document.body.append(root);
  return { root, el: root.firstElementChild as T };
}

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('lang');
});

describe('names and strings', () => {
  it('names a landmark in the language of the page, and renames it when lang changes', async () => {
    const { root, el } = mount('<void-breadcrumbs></void-breadcrumbs>');
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('Breadcrumb');
    root.lang = 'fr';
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('Fil d’Ariane');
    root.lang = 'ar';
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('مسار التنقل');
    root.removeAttribute('lang');
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('keeps the name the author wrote', async () => {
    const { root, el } = mount('<void-breadcrumbs aria-label="Trail"></void-breadcrumbs>', 'fr');
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('Trail');
    root.lang = 'ar';
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('Trail');
  });

  it('writes the buttons of a pagination in the language', async () => {
    const { el } = mount('<void-pagination total="5" value="2"></void-pagination>', 'fr');
    await settle(el);
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Pagination');
    expect(el.querySelector('button[aria-label="Page précédente"]')).not.toBeNull();
    expect(el.querySelector('button[aria-label="Page suivante"]')).not.toBeNull();
  });

  it('a spinner label and a placeholder the author wrote win over the message', async () => {
    const { root, el } = mount('<void-spinner label="Chargement des commandes"></void-spinner>', 'ar');
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('Chargement des commandes');
    const spinner = document.createElement('void-spinner');
    root.append(spinner);
    await settle(spinner);
    expect(spinner.getAttribute('aria-label')).toBe('جارٍ التحميل');
    const combo = document.createElement('void-combobox');
    root.append(combo);
    await settle(combo);
    expect(combo.querySelector('input')?.getAttribute('placeholder')).toBe('بحث...');
    (combo as unknown as { placeholder: string }).placeholder = 'Ville';
    await settle(combo);
    expect(combo.querySelector('input')?.getAttribute('placeholder')).toBe('Ville');
  });

  it('chooses the plural form of an indicator count', async () => {
    const { el } = mount('<void-indicator count="3"></void-indicator>', 'ar');
    await settle(el);
    expect(el.getAttribute('aria-label')).toContain('إشعارات');
    (el as unknown as { count: number }).count = 1;
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('إشعار واحد');
  });

  it('an explicit aria-label on a status dot stays', async () => {
    const { el } = mount('<void-status-dot status="away" aria-label="Back at five"></void-status-dot>', 'fr');
    await settle(el);
    expect(el.getAttribute('aria-label')).toBe('Back at five');
    const plain = document.createElement('void-status-dot');
    plain.setAttribute('status', 'online');
    el.after(plain);
    await settle(plain);
    expect(plain.getAttribute('aria-label')).toBe('En ligne');
  });
});

describe('formatting locale', () => {
  it('a calendar follows lang for names, and the locale attribute wins', async () => {
    const { el } = mount<VoidCalendar>('<void-calendar value="2024-03-15"></void-calendar>', 'fr');
    await settle(el);
    expect(el.querySelector('.void-calendar-title')?.textContent).toMatch(/mars 2024/i);
    expect(el.querySelector('[aria-label="Mois précédent"]')).not.toBeNull();
    const weekdays = [...el.querySelectorAll('.void-calendar-weekday')].map((n) => n.getAttribute('aria-label'));
    expect(weekdays[0]).toMatch(/lundi/i);
    el.locale = 'de-DE';
    await settle(el);
    expect(el.querySelector('.void-calendar-title')?.textContent).toMatch(/März 2024/);
  });

  it('starts the week where the locale does, and first-day overrides it', async () => {
    const { root, el } = mount<VoidCalendar>('<void-calendar value="2024-03-15"></void-calendar>', 'en-US');
    await settle(el);
    expect(el.querySelector('.void-calendar-weekday')?.getAttribute('aria-label')).toMatch(/sunday/i);
    root.lang = 'fr';
    await settle(el);
    expect(el.querySelector('.void-calendar-weekday')?.getAttribute('aria-label')).toMatch(/lundi/i);
    el.firstDay = 6;
    await settle(el);
    expect(el.querySelector('.void-calendar-weekday')?.getAttribute('aria-label')).toMatch(/samedi/i);
  });

  it('is English with no lang anywhere', async () => {
    const { el } = mount<VoidCalendar>('<void-calendar value="2024-03-15"></void-calendar>');
    await settle(el);
    expect(el.querySelector('.void-calendar-title')?.textContent).toBe('March 2024');
    expect(el.querySelector('.void-calendar-weekday')?.getAttribute('aria-label')).toBe('Sunday');
  });

  it('a number input writes and reads numbers the way the language does', async () => {
    const { root, el } = mount<VoidNumberInput>('<void-number-input value="1234.5" precision="2"></void-number-input>', 'fr');
    await settle(el);
    const input = el.querySelector('input')!;
    expect(input.value).toBe('1234,50');
    input.value = '12,25';
    input.dispatchEvent(new Event('change'));
    await settle(el);
    expect(el.value).toBe(12.25);
    root.lang = 'en';
    await settle(el);
    expect(el.querySelector('input')!.value).toBe('12.25');
  });
});
