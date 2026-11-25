// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidAlert } from '../../src/components/alert.js';

describe('VoidAlert', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidAlert)).toBe(VoidElement);
  });

  it('registers as void-alert custom element', () => {
    expect(customElements.get('void-alert')).toBe(VoidAlert);
  });

  describe('default properties', () => {
    let el: VoidAlert;

    beforeEach(() => {
      el = document.createElement('void-alert') as VoidAlert;
    });

    it('defaults color to "default"', () => {
      expect(el.color).toBe('default');
    });

    it('has no dismissible property any more: the close part says so', () => {
      expect('dismissible' in el).toBe(false);
    });

    it('defaults variant to "subtle"', () => {
      expect(el.variant).toBe('subtle');
    });
  });

  describe('ARIA', () => {
    it('sets role="alert" when connected', () => {
      const el = document.createElement('void-alert') as VoidAlert;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('alert');
    });
  });

  describe('close part', () => {
    let el: VoidAlert;
    const BUTTON = '<button type="button" aria-label="Dismiss">x</button>';

    beforeEach(async () => {
      el = document.createElement('void-alert') as VoidAlert;
      el.innerHTML = `<void-alert-description>Saved</void-alert-description><void-alert-close>${BUTTON}</void-alert-close>`;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('has no shadow root and writes nothing of its own: the author\'s two parts are the only children', () => {
      expect(el.shadowRoot).toBeNull();
      expect(Array.from(el.children).map(c => c.localName)).toEqual(['void-alert-description', 'void-alert-close']);
      expect(el.querySelectorAll('button').length).toBe(1);
    });

    it('dispatches exactly one void-close when the control in the close part is pressed', () => {
      const events: Event[] = [];
      document.addEventListener('void-close', (e) => events.push(e));
      (el.querySelector('void-alert-close button') as HTMLButtonElement).click();
      expect(events).toHaveLength(1);
      expect(events[0].bubbles).toBe(true);
      expect((events[0] as CustomEvent).composed).toBe(true);
      expect(events[0].cancelable).toBe(false);
      expect((events[0] as CustomEvent).detail).toBeNull();
    });

    it('does not fire the old void-dismiss', () => {
      const events: Event[] = [];
      document.addEventListener('void-dismiss', (e) => events.push(e));
      (el.querySelector('button') as HTMLButtonElement).click();
      expect(events).toHaveLength(0);
    });

    it('removes itself from the DOM when closed', () => {
      expect(document.body.contains(el)).toBe(true);
      (el.querySelector('button') as HTMLButtonElement).click();
      expect(document.body.contains(el)).toBe(false);
    });

    it('is not dismissed by a click elsewhere', () => {
      (el.querySelector('void-alert-description') as HTMLElement).click();
      expect(document.body.contains(el)).toBe(true);
    });

    it('ignores a disabled control', () => {
      (el.querySelector('button') as HTMLButtonElement).disabled = true;
      (el.querySelector('void-alert-close') as HTMLElement).click();
      expect(document.body.contains(el)).toBe(true);
    });

    it('has no way to dismiss it without a close part', async () => {
      const plain = document.createElement('void-alert') as VoidAlert;
      plain.innerHTML = '<void-alert-description>Hi</void-alert-description>';
      document.body.appendChild(plain);
      await plain.updateComplete;
      expect(plain.querySelector('button')).toBeNull();
      plain.click();
      expect(document.body.contains(plain)).toBe(true);
      plain.remove();
    });

    it('a close part added later works', async () => {
      const late = document.createElement('void-alert') as VoidAlert;
      late.innerHTML = '<void-alert-description>Hi</void-alert-description>';
      document.body.appendChild(late);
      await late.updateComplete;
      late.insertAdjacentHTML('beforeend', `<void-alert-close>${BUTTON}</void-alert-close>`);
      (late.querySelector('button') as HTMLButtonElement).click();
      expect(late.isConnected).toBe(false);
    });

    it('moves focus to the next focusable element when the dismissed alert held it', () => {
      const before = document.createElement('button');
      const after = document.createElement('button');
      before.textContent = 'before';
      after.textContent = 'after';
      document.body.prepend(before);
      document.body.append(after);
      const button = el.querySelector('button') as HTMLButtonElement;
      button.focus();
      expect(document.activeElement).toBe(button);
      button.click();
      expect(document.activeElement).toBe(after);
      before.remove();
      after.remove();
    });

    it('falls back to the focusable element before it, and leaves focus alone when it was elsewhere', () => {
      const before = document.createElement('button');
      document.body.prepend(before);
      const button = el.querySelector('button') as HTMLButtonElement;
      button.focus();
      button.click();
      expect(document.activeElement).toBe(before);
      const other = document.createElement('button');
      document.body.append(other);
      other.focus();
      const second = document.createElement('void-alert') as VoidAlert;
      second.innerHTML = `<void-alert-description>x</void-alert-description><void-alert-close>${BUTTON}</void-alert-close>`;
      document.body.append(second);
      (second.querySelector('button') as HTMLButtonElement).click();
      expect(document.activeElement).toBe(other);
      before.remove();
      other.remove();
    });
  });

  describe('explicit parts (#52)', () => {
    it('leaves the title and description parts where they are and adds no light-DOM nodes', async () => {
      const el = document.createElement('void-alert') as VoidAlert;
      el.innerHTML = '<void-alert-title>Saved</void-alert-title><void-alert-description>All changes are stored.</void-alert-description>';
      const before = [...el.childNodes];
      document.body.appendChild(el);
      await el.updateComplete;
      expect([...el.childNodes]).toEqual(before);
      expect(el.shadowRoot).toBeNull();
      el.remove();
    });
  });

  describe('Light DOM', () => {
    it('createRenderRoot returns the element itself', () => {
      const el = document.createElement('void-alert') as VoidAlert;
      expect(el.createRenderRoot()).toBe(el);
    });
  });
});
