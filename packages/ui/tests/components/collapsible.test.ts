// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCollapsible } from '../../src/components/collapsible.js';

const TAG = 'void-collapsible';

function create(heading = 'Test', content = 'Content'): VoidCollapsible {
  const el = document.createElement(TAG) as VoidCollapsible;
  el.heading = heading;
  el.textContent = content;
  return el;
}

describe('VoidCollapsible', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidCollapsible)).toBe(VoidElement);
    });

    it('is registered as void-collapsible', () => {
      expect(customElements.get(TAG)).toBe(VoidCollapsible);
    });
  });

  describe('default property values', () => {
    let el: VoidCollapsible;

    beforeEach(() => {
      el = document.createElement(TAG) as VoidCollapsible;
    });

    it('open defaults to false', () => {
      expect(el.open).toBe(false);
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('heading defaults to empty string', () => {
      expect(el.heading).toBe('');
    });
  });

  describe('rendering', () => {
    let el: VoidCollapsible;

    beforeEach(async () => {
      el = create('My Section', 'My Content');
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders trigger button', () => {
      expect(el.querySelector('.void-collapsible-trigger')).not.toBeNull();
    });

    it('renders content div', () => {
      expect(el.querySelector('.void-collapsible-content')).not.toBeNull();
    });

    it('trigger contains heading text', () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      expect(trigger.textContent).toContain('My Section');
    });

    it('user content is placed inside .void-collapsible-content', async () => {
      const content = el.querySelector('.void-collapsible-content') as HTMLElement;
      expect(content.textContent).toContain('My Content');
    });

    it('renders chevron SVG inside trigger', () => {
      const chevron = el.querySelector('.void-collapsible-chevron');
      expect(chevron).not.toBeNull();
    });
  });

  describe('aria attributes', () => {
    let el: VoidCollapsible;

    beforeEach(async () => {
      el = create('Section', 'Content');
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('trigger has aria-expanded="false" when closed', () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('trigger has aria-expanded="true" when open', async () => {
      el.open = true;
      await el.updateComplete;
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('trigger aria-controls matches content id', () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      const content = el.querySelector('.void-collapsible-content') as HTMLElement;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('content has role="region"', () => {
      const content = el.querySelector('.void-collapsible-content') as HTMLElement;
      expect(content.getAttribute('role')).toBe('region');
    });

    it('content aria-labelledby matches trigger id', () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      const content = el.querySelector('.void-collapsible-content') as HTMLElement;
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });
  });

  describe('toggle on click', () => {
    let el: VoidCollapsible;

    beforeEach(async () => {
      el = create();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('opens on trigger click', async () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('closes on second trigger click', async () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });
  });

  describe('disabled prevents toggle', () => {
    let el: VoidCollapsible;

    beforeEach(async () => {
      el = create();
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('click does not toggle when disabled', async () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('keyboard does not toggle when disabled', async () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('does not dispatch void-toggle when disabled', async () => {
      let fired = false;
      el.addEventListener('void-toggle', () => { fired = true; });
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(fired).toBe(false);
    });
  });

  describe('void-toggle event', () => {
    let el: VoidCollapsible;

    beforeEach(async () => {
      el = create();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-toggle on click', async () => {
      let fired = false;
      el.addEventListener('void-toggle', () => { fired = true; });
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-toggle detail contains open state', async () => {
      let detail: { open: boolean } | null = null;
      el.addEventListener('void-toggle', (e) => { detail = (e as CustomEvent).detail; });
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(detail).toEqual({ open: true });
    });

    it('void-toggle bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-toggle', () => { firedOnParent = true; }, { once: true });
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });

    it('void-toggle detail open=false when closing', async () => {
      el.open = true;
      await el.updateComplete;
      let detail: { open: boolean } | null = null;
      el.addEventListener('void-toggle', (e) => { detail = (e as CustomEvent).detail; });
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(detail).toEqual({ open: false });
    });
  });

  describe('keyboard handling', () => {
    let el: VoidCollapsible;

    beforeEach(async () => {
      el = create();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('Enter key toggles open', async () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('Space key toggles open', async () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('other keys do not toggle', async () => {
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });
  });

  describe('open reflection', () => {
    it('open reflects to attribute', async () => {
      const el = create();
      document.body.appendChild(el);
      el.open = true;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('open attribute removed when false', async () => {
      const el = create();
      el.setAttribute('open', '');
      document.body.appendChild(el);
      await el.updateComplete;
      el.open = false;
      await el.updateComplete;
      expect(el.hasAttribute('open')).toBe(false);
    });

    it('disabled reflects to attribute', async () => {
      const el = create();
      document.body.appendChild(el);
      el.disabled = true;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('initial open state', () => {
    it('collapsible with open attribute starts expanded', async () => {
      const el = create('Section', 'Content');
      el.open = true;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.open).toBe(true);
      const trigger = el.querySelector('.void-collapsible-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
