// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTag } from '../../src/components/tag.js';

const TAG = 'void-tag';

function createElement(): VoidTag {
  return document.createElement(TAG) as VoidTag;
}

describe('VoidTag', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidTag)).toBe(VoidElement);
    });

    it('is registered as void-tag', () => {
      expect(customElements.get(TAG)).toBe(VoidTag);
    });
  });

  describe('default property values', () => {
    let el: VoidTag;

    beforeEach(() => {
      el = createElement();
    });

    it('color defaults to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('removable defaults to false', () => {
      expect(el.removable).toBe(false);
    });

    it('size defaults to "md"', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('ARIA', () => {
    it('sets role="listitem" when connected', () => {
      const el = createElement();
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('listitem');
    });
  });

  describe('void-remove event', () => {
    let el: VoidTag;

    beforeEach(() => {
      el = createElement();
      el.removable = true;
      document.body.appendChild(el);
    });

    it('dispatches void-remove when close button is clicked', async () => {
      await el.updateComplete;
      let fired = false;
      document.body.addEventListener('void-remove', () => { fired = true; }, { once: true });
      const btn = el.querySelector('.void-tag-close') as HTMLButtonElement;
      btn.click();
      expect(fired).toBe(true);
    });

    it('removes itself from the DOM after close click', async () => {
      await el.updateComplete;
      const btn = el.querySelector('.void-tag-close') as HTMLButtonElement;
      btn.click();
      expect(document.body.contains(el)).toBe(false);
    });
  });
});
