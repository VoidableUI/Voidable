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

    it('has no heading property (the title is a part)', () => {
      expect('heading' in el).toBe(false);
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
      el.variant = 'bordered';
      await el.updateComplete;
      expect(el.getAttribute('variant')).toBe('bordered');
    });

    it('reads variant from attribute', () => {
      el.setAttribute('variant', 'elevated');
      expect(el.variant).toBe('elevated');
    });

    it('reads outlined variant from attribute', () => {
      el.setAttribute('variant', 'bordered');
      expect(el.variant).toBe('bordered');
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

  describe('explicit parts (#52)', () => {
    it('renders nothing and moves nothing: the parts are the card', async () => {
      const el = document.createElement('void-card') as VoidCard;
      el.innerHTML = '<void-card-header><void-card-title>T</void-card-title></void-card-header><void-card-body>B</void-card-body><void-card-footer>F</void-card-footer>';
      const before = [...el.querySelectorAll('*')];
      document.body.appendChild(el);
      await el.updateComplete;
      expect([...el.querySelectorAll('*')]).toEqual(before);
      expect(el.shadowRoot).toBeNull();
      el.remove();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = createElement();
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
