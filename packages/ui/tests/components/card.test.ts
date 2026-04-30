// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCard } from '../../src/components/card.js';

const TAG = 'void-card';

function createElement(): VoidCard {
  return document.createElement(TAG) as VoidCard;
}

describe('VoidCard', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidCard)).toBe(VoidElement);
    });

    it('is registered as void-card', () => {
      expect(customElements.get(TAG)).toBe(VoidCard);
    });
  });

  describe('default property values', () => {
    let el: VoidCard;

    beforeEach(() => {
      el = createElement();
    });

    it('heading defaults to empty string', () => {
      expect(el.heading).toBe('');
    });

    it('variant defaults to "default"', () => {
      expect(el.variant).toBe('default');
    });

    it('padding defaults to "md"', () => {
      expect(el.padding).toBe('md');
    });
  });

  describe('variant reflection', () => {
    let el: VoidCard;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('reflects variant property to attribute', async () => {
      el.variant = 'elevated';
      await el.updateComplete;
      expect(el.getAttribute('variant')).toBe('elevated');
    });

    it('reflects outlined variant to attribute', async () => {
      el.variant = 'outlined';
      await el.updateComplete;
      expect(el.getAttribute('variant')).toBe('outlined');
    });

    it('reads variant from attribute', () => {
      el.setAttribute('variant', 'elevated');
      expect(el.variant).toBe('elevated');
    });

    it('reads outlined variant from attribute', () => {
      el.setAttribute('variant', 'outlined');
      expect(el.variant).toBe('outlined');
    });

    it('reads default variant from attribute', () => {
      el.setAttribute('variant', 'default');
      expect(el.variant).toBe('default');
    });
  });

  describe('padding reflection', () => {
    let el: VoidCard;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('reflects padding property to attribute', async () => {
      el.padding = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('padding')).toBe('lg');
    });

    it('reflects none padding to attribute', async () => {
      el.padding = 'none';
      await el.updateComplete;
      expect(el.getAttribute('padding')).toBe('none');
    });

    it('reflects sm padding to attribute', async () => {
      el.padding = 'sm';
      await el.updateComplete;
      expect(el.getAttribute('padding')).toBe('sm');
    });

    it('reads padding from attribute', () => {
      el.setAttribute('padding', 'none');
      expect(el.padding).toBe('none');
    });

    it('reads sm padding from attribute', () => {
      el.setAttribute('padding', 'sm');
      expect(el.padding).toBe('sm');
    });

    it('reads lg padding from attribute', () => {
      el.setAttribute('padding', 'lg');
      expect(el.padding).toBe('lg');
    });

    it('reads md padding from attribute', () => {
      el.setAttribute('padding', 'md');
      expect(el.padding).toBe('md');
    });
  });

  describe('heading rendering', () => {
    it('renders header and heading when heading is set', async () => {
      const el = createElement();
      el.heading = 'Card Title';
      document.body.appendChild(el);
      await el.updateComplete;
      const header = el.querySelector('.void-card-header');
      const heading = el.querySelector('.void-card-heading');
      expect(header).not.toBeNull();
      expect(heading).not.toBeNull();
      expect(heading?.textContent).toBe('Card Title');
    });

    it('does not render header when heading is empty', async () => {
      const el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('.void-card-header')).toBeNull();
    });
  });

  describe('card body', () => {
    it('always renders void-card-body div', async () => {
      const el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('.void-card-body')).not.toBeNull();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
