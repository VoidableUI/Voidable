// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidAccordion, VoidAccordionItem } from '../../src/components/accordion.js';

const TAG_ACCORDION = 'void-accordion';
const TAG_ITEM = 'void-accordion-item';

function createAccordion(): VoidAccordion {
  return document.createElement(TAG_ACCORDION) as VoidAccordion;
}

function createItem(heading = 'Test', content = 'Content'): VoidAccordionItem {
  const el = document.createElement(TAG_ITEM) as VoidAccordionItem;
  el.heading = heading;
  el.textContent = content;
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

    it('heading defaults to empty string', () => {
      expect(el.heading).toBe('');
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

    it('renders trigger button', () => {
      expect(el.querySelector('.void-accordion-trigger')).not.toBeNull();
    });

    it('renders content div', () => {
      expect(el.querySelector('.void-accordion-content')).not.toBeNull();
    });

    it('trigger contains heading text', () => {
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      expect(trigger.textContent).toContain('My Section');
    });

    it('trigger has aria-expanded="false" when closed', () => {
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('trigger has aria-expanded="true" when open', async () => {
      el.open = true;
      await el.updateComplete;
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('trigger aria-controls matches content id', () => {
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      const content = el.querySelector('.void-accordion-content') as HTMLElement;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('content has role="region"', () => {
      const content = el.querySelector('.void-accordion-content') as HTMLElement;
      expect(content.getAttribute('role')).toBe('region');
    });

    it('content aria-labelledby matches trigger id', () => {
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      const content = el.querySelector('.void-accordion-content') as HTMLElement;
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('renders chevron SVG inside trigger', () => {
      const chevron = el.querySelector('.void-accordion-chevron');
      expect(chevron).not.toBeNull();
    });

    it('user content is placed inside .void-accordion-content', async () => {
      const content = el.querySelector('.void-accordion-content') as HTMLElement;
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
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('closes on second trigger click', async () => {
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
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

    it('Enter key toggles open', async () => {
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('Space key toggles open', async () => {
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('other keys do not toggle', async () => {
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });
  });

  describe('void-toggle event', () => {
    let el: VoidAccordionItem;

    beforeEach(async () => {
      el = createItem();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-toggle on click', async () => {
      let fired = false;
      el.addEventListener('void-toggle', () => { fired = true; });
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-toggle detail contains open state', async () => {
      let detail: { open: boolean } | null = null;
      el.addEventListener('void-toggle', (e) => { detail = (e as CustomEvent).detail; });
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(detail).toEqual({ open: true });
    });

    it('void-toggle bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-toggle', () => { firedOnParent = true; }, { once: true });
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });

    it('void-toggle detail open=false when closing', async () => {
      el.open = true;
      await el.updateComplete;
      let detail: { open: boolean } | null = null;
      el.addEventListener('void-toggle', (e) => { detail = (e as CustomEvent).detail; });
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(detail).toEqual({ open: false });
    });
  });

  describe('single-open mode (multiple=false)', () => {
    it('opening one item closes others', async () => {
      const { items } = buildAccordion(false);
      const [item1, item2, item3] = items;

      await item1.updateComplete;
      await item2.updateComplete;
      await item3.updateComplete;

      const trigger1 = item1.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger1.click();
      await item1.updateComplete;
      await item2.updateComplete;
      expect(item1.open).toBe(true);

      const trigger2 = item2.querySelector('.void-accordion-trigger') as HTMLElement;
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

      const trigger1 = item1.querySelector('.void-accordion-trigger') as HTMLElement;
      trigger1.click();
      await item1.updateComplete;

      const trigger2 = item2.querySelector('.void-accordion-trigger') as HTMLElement;
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
      const trigger = el.querySelector('.void-accordion-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
