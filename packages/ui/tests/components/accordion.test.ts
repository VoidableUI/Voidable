// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidAccordion, VoidAccordionItem } from '../../src/components/accordion.js';

const TAG_ACCORDION = 'void-accordion';
const TAG_ITEM = 'void-accordion-item';

function createAccordion(): VoidAccordion {
  return document.createElement(TAG_ACCORDION) as VoidAccordion;
}

function createItem(heading = 'Test', content = 'Content'): VoidAccordionItem {
  const el = document.createElement(TAG_ITEM) as VoidAccordionItem;
  const trigger = document.createElement('void-accordion-trigger');
  trigger.textContent = heading;
  const body = document.createElement('void-accordion-content');
  body.textContent = content;
  el.append(trigger, body);
  return el;
}

function buildAccordion(multiple = false): { accordion: VoidAccordion; items: VoidAccordionItem[] } {
  const accordion = createAccordion();
  if (multiple) accordion.multiple = true;
  const items = [
    createItem('Section 1', 'Content 1'),
    createItem('Section 2', 'Content 2'),
    createItem('Section 3', 'Content 3'),
  ];
  for (const item of items) accordion.appendChild(item);
  document.body.appendChild(accordion);
  return { accordion, items };
}

describe('VoidAccordion', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidAccordion)).toBe(VoidElement);
    });

    it('is registered as void-accordion', () => {
      expect(customElements.get(TAG_ACCORDION)).toBe(VoidAccordion);
    });
  });

  describe('default property values', () => {
    let el: VoidAccordion;

    beforeEach(() => {
      el = createAccordion();
    });

    it('multiple defaults to false', () => {
      expect(el.multiple).toBe(false);
    });
  });

  describe('reflection', () => {
    it('multiple reflects to attribute', async () => {
      const el = createAccordion();
      document.body.appendChild(el);
      el.multiple = true;
      await el.updateComplete;
      expect(el.hasAttribute('multiple')).toBe(true);
    });
  });
});

describe('VoidAccordionItem', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidAccordionItem)).toBe(VoidElement);
    });

    it('is registered as void-accordion-item', () => {
      expect(customElements.get(TAG_ITEM)).toBe(VoidAccordionItem);
    });
  });

  describe('default property values', () => {
    let el: VoidAccordionItem;

    beforeEach(() => {
      el = document.createElement(TAG_ITEM) as VoidAccordionItem;
    });

    it('has no heading property (the heading is the trigger part)', () => {
      expect('heading' in el).toBe(false);
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });
  });

  describe('rendering', () => {
    let el: VoidAccordionItem;

    beforeEach(async () => {
      el = createItem('My Section', 'My Content');
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders nothing of its own: the item holds exactly the author parts', () => {
      expect([...el.children].map((c) => c.localName)).toEqual(['void-accordion-trigger', 'void-accordion-content']);
    });

    it('makes the trigger a focusable button', () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      expect(trigger.getAttribute('role')).toBe('button');
      expect(trigger.getAttribute('tabindex')).toBe('0');
    });

    it('trigger contains heading text', () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      expect(trigger.textContent).toContain('My Section');
    });

    it('trigger has aria-expanded="false" when closed', () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('trigger has aria-expanded="true" when open', async () => {
      el.open = true;
      await el.updateComplete;
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('trigger aria-controls matches content id', () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      const content = el.querySelector('void-accordion-content') as HTMLElement;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('content has role="region"', () => {
      const content = el.querySelector('void-accordion-content') as HTMLElement;
      expect(content.getAttribute('role')).toBe('region');
    });

    it('content aria-labelledby matches trigger id', () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      const content = el.querySelector('void-accordion-content') as HTMLElement;
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('keeps an author id on the content and points aria-controls at it', async () => {
      const item = createItem('Ids', 'Body');
      item.querySelector('void-accordion-content')!.id = 'server-id';
      document.body.appendChild(item);
      await item.updateComplete;
      expect(item.querySelector('void-accordion-content')!.id).toBe('server-id');
      expect(item.querySelector('void-accordion-trigger')!.getAttribute('aria-controls')).toBe('server-id');
    });

    it('user content stays inside the content part', async () => {
      const content = el.querySelector('void-accordion-content') as HTMLElement;
      expect(content.textContent).toContain('My Content');
    });
  });

  describe('open reflection', () => {
    it('open reflects to attribute', async () => {
      const el = createItem();
      document.body.appendChild(el);
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('open attribute removed when false', async () => {
      const el = createItem();
      el.setAttribute('open', '');
      document.body.appendChild(el);
      await el.updateComplete;
      el.open = false;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(false);
    });
  });

  describe('toggle on click', () => {
    let el: VoidAccordionItem;

    beforeEach(async () => {
      el = createItem();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('opens on trigger click', async () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('closes on second trigger click', async () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });
  });

  describe('keyboard handling', () => {
    let el: VoidAccordionItem;

    beforeEach(async () => {
      el = createItem();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    /**
     * The trigger part is a role="button" element, not a native <button>: the
     * browser synthesises no click for Enter or Space, so the item handles the
     * keydown itself.
     */
    function press(trigger: HTMLElement, key: 'Enter' | ' '): void {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      trigger.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
    }

    it('Enter key toggles open exactly once', async () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      const events: string[] = [];
      el.addEventListener('void-open', (e) => events.push((e as CustomEvent).detail.reason));
      press(trigger, 'Enter');
      await el.updateComplete;
      expect(el.open).toBe(true);
      expect(events).toEqual(['keyboard']);
    });

    it('Space key toggles open exactly once', async () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      const events: string[] = [];
      el.addEventListener('void-open', (e) => events.push((e as CustomEvent).detail.reason));
      press(trigger, ' ');
      await el.updateComplete;
      expect(el.open).toBe(true);
      expect(events).toEqual(['keyboard']);
    });

    it('a second Enter / Space activation closes it again', async () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      press(trigger, 'Enter');
      press(trigger, ' ');
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('other keys do not toggle', async () => {
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });
  });

  describe('void-open and void-close (#23)', () => {
    let el: VoidAccordionItem;
    const trigger = () => el.querySelector('void-accordion-trigger') as HTMLElement;

    beforeEach(async () => {
      el = createItem();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-open with reason trigger on click', async () => {
      let detail: unknown = null;
      el.addEventListener('void-open', (e) => { detail = (e as CustomEvent).detail; });
      trigger().click();
      await el.updateComplete;
      expect(detail).toEqual({ reason: 'trigger' });
    });

    it('does not bubble', async () => {
      let firedOnParent = false;
      const hear = () => { firedOnParent = true; };
      document.body.addEventListener('void-open', hear);
      trigger().click();
      await el.updateComplete;
      document.body.removeEventListener('void-open', hear);
      expect(firedOnParent).toBe(false);
    });

    it('dispatches a cancelable void-close before closing; preventDefault keeps it open', async () => {
      el.open = true;
      await el.updateComplete;
      let detail: unknown = null;
      el.addEventListener('void-close', (e) => { detail = (e as CustomEvent).detail; e.preventDefault(); }, { once: true });
      trigger().click();
      await el.updateComplete;
      expect(detail).toEqual({ reason: 'trigger' });
      expect(el.open).toBe(true);
      trigger().click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('in a single-open accordion, the item closed by another opening gets void-close with reason outside', async () => {
      const acc = document.createElement('void-accordion');
      const other = createItem();
      other.open = true;
      acc.append(el, other);
      document.body.appendChild(acc);
      await other.updateComplete;
      let detail: unknown = null;
      other.addEventListener('void-close', (e) => { detail = (e as CustomEvent).detail; });
      trigger().click();
      await el.updateComplete;
      expect(other.open).toBe(false);
      expect(detail).toEqual({ reason: 'outside' });
      acc.remove();
    });
  });

  describe('single-open mode (multiple=false)', () => {
    it('opening one item closes others', async () => {
      const { items } = buildAccordion(false);
      const [item1, item2, item3] = items;

      await item1.updateComplete;
      await item2.updateComplete;
      await item3.updateComplete;

      const trigger1 = item1.querySelector('void-accordion-trigger') as HTMLElement;
      trigger1.click();
      await item1.updateComplete;
      await item2.updateComplete;
      expect(item1.open).toBe(true);

      const trigger2 = item2.querySelector('void-accordion-trigger') as HTMLElement;
      trigger2.click();
      await item1.updateComplete;
      await item2.updateComplete;
      expect(item2.open).toBe(true);
      expect(item1.open).toBe(false);
    });

    it('does not close siblings when multiple=true', async () => {
      const { items } = buildAccordion(true);
      const [item1, item2] = items;

      await item1.updateComplete;
      await item2.updateComplete;

      const trigger1 = item1.querySelector('void-accordion-trigger') as HTMLElement;
      trigger1.click();
      await item1.updateComplete;

      const trigger2 = item2.querySelector('void-accordion-trigger') as HTMLElement;
      trigger2.click();
      await item2.updateComplete;

      expect(item1.open).toBe(true);
      expect(item2.open).toBe(true);
    });
  });

  describe('initial open state', () => {
    it('item with open attribute starts expanded', async () => {
      const el = createItem('Section', 'Content');
      el.open = true;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.open).toBe(true);
      const trigger = el.querySelector('void-accordion-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });
  });
});

describe('closed content is hidden="until-found" where the browser supports it', () => {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  beforeAll(() => { proto.onbeforematch = null; });
  afterAll(() => { delete proto.onbeforematch; });

  it('marks closed content, takes the mark off on opening and puts it back after closing', async () => {
    const el = createItem();
    document.body.appendChild(el);
    await el.updateComplete;
    const content = el.querySelector('void-accordion-content') as HTMLElement;
    expect(content.getAttribute('hidden')).toBe('until-found');
    el.open = true;
    await el.updateComplete;
    expect(content.hasAttribute('hidden')).toBe(false);
    el.open = false;
    await el.updateComplete;
    expect(content.getAttribute('hidden')).toBe('until-found');
    el.remove();
  });

  it('a content part that starts open is never marked', async () => {
    const el = createItem();
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.querySelector('void-accordion-content')!.hasAttribute('hidden')).toBe(false);
    el.remove();
  });

  it('opens when find-in-page reaches the closed content (beforematch), and says so', async () => {
    const el = createItem();
    document.body.appendChild(el);
    await el.updateComplete;
    const toggles: string[] = [];
    el.addEventListener('void-open', (e) => toggles.push((e as CustomEvent).detail.reason));
    el.querySelector('void-accordion-content')!.dispatchEvent(new Event('beforematch', { bubbles: true }));
    await el.updateComplete;
    expect(el.open).toBe(true);
    expect(toggles).toEqual(['find']);
    expect(el.querySelector('void-accordion-content')!.hasAttribute('hidden')).toBe(false);
    el.remove();
  });

  it('writes nothing where the browser lacks it', async () => {
    delete proto.onbeforematch;
    const el = createItem();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.querySelector('void-accordion-content')!.hasAttribute('hidden')).toBe(false);
    el.remove();
    proto.onbeforematch = null;
  });
});
