// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidButton } from '../../src/components/button.js';

// VoidButton self-registers with a guard; ensure it's defined before tests run.
const TAG = 'void-button';

function createElement(): VoidButton {
  return document.createElement(TAG) as VoidButton;
}

describe('VoidButton', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidButton)).toBe(VoidElement);
    });

    it('is registered as void-button', () => {
      expect(customElements.get(TAG)).toBe(VoidButton);
    });
  });

  describe('default property values', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
    });

    it('variant defaults to outline', () => {
      expect(el.variant).toBe('outline');
    });

    it('color defaults to default', () => {
      expect(el.color).toBe('default');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('type defaults to button', () => {
      expect(el.type).toBe('button');
    });

    it('size defaults to md', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('attribute reflection', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('reflects variant to attribute', async () => {
      el.variant = 'filled';
      await el.updateComplete;
      expect(el.getAttribute('variant')).toBe('filled');
    });

    it('reflects color to attribute', async () => {
      el.color = 'error';
      await el.updateComplete;
      expect(el.getAttribute('color')).toBe('error');
    });

    it('reflects disabled to attribute', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('removes disabled attribute when set to false', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).toBe(false);
    });

    it('reflects size to attribute', async () => {
      el.size = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('sets role="button" on connect', () => {
      expect(el.getAttribute('role')).toBe('button');
    });

    it('sets tabindex="0" on connect', () => {
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('has no aria-disabled while enabled', () => {
      expect(el.hasAttribute('aria-disabled')).toBe(false);
    });

    it('removes aria-disabled again when re-enabled, rather than leaving "false"', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      expect(el.hasAttribute('aria-disabled')).toBe(false);
    });

    it('follows a <fieldset disabled> ancestor without being form-associated', async () => {
      const fs = document.createElement('fieldset');
      document.body.append(fs);
      fs.append(el);
      await el.updateComplete;
      expect((el.constructor as { formAssociated?: boolean }).formAssociated).toBeFalsy();
      fs.disabled = true;
      await new Promise((r) => setTimeout(r, 0));
      expect(el.getAttribute('tabindex')).toBe('-1');
      expect(el.getAttribute('aria-disabled')).toBe('true');
      fs.disabled = false;
      await new Promise((r) => setTimeout(r, 0));
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.hasAttribute('aria-disabled')).toBe(false);
      fs.remove();
    });

    it('updates aria-disabled when disabled changes', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-disabled')).toBe('true');
    });

    it('sets tabindex="-1" when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      expect(el.getAttribute('tabindex')).toBe('-1');
    });

    it('restores tabindex="0" when re-enabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      expect(el.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('void-click event', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('dispatches void-click on click', () => {
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.click();
      expect(fired).toBe(true);
    });

    it('does not dispatch void-click when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;

      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.click();
      expect(fired).toBe(false);
    });

    it('void-click bubbles', () => {
      let firedOnParent = false;
      document.body.addEventListener('void-click', () => { firedOnParent = true; }, { once: true });
      el.click();
      expect(firedOnParent).toBe(true);
    });
  });

  describe('keyboard handling', () => {
    let el: VoidButton;

    beforeEach(() => {
      el = createElement();
      document.body.appendChild(el);
    });

    it('Enter key dispatches void-click', () => {
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('Space key dispatches void-click', () => {
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(fired).toBe(true);
    });

    it('Enter key does not dispatch void-click when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;

      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(fired).toBe(false);
    });

    it('Space key does not dispatch void-click when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;

      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(fired).toBe(false);
    });

    it('Enter and Space produce one real click and one void-click each', () => {
      const seen: string[] = [];
      el.addEventListener('click', () => seen.push('click'));
      el.addEventListener('void-click', () => seen.push('void-click'));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      expect(seen.sort()).toEqual(['click', 'void-click']);
      seen.length = 0;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      expect(seen).toEqual([]);
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
      expect(seen.sort()).toEqual(['click', 'void-click']);
    });

    it('a held Enter does not click again on repeat', () => {
      let clicks = 0;
      el.addEventListener('click', () => clicks++);
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, repeat: true }));
      expect(clicks).toBe(1);
    });

    it('a Space keyup without its keydown on the button does nothing', () => {
      let clicks = 0;
      el.addEventListener('click', () => clicks++);
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(clicks).toBe(0);
    });

    it('aria-disabled stops the keyboard', () => {
      el.setAttribute('aria-disabled', 'true');
      let clicks = 0;
      el.addEventListener('click', () => clicks++);
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(clicks).toBe(0);
    });

    it('a key that lands inside the button (a native control) is left to it', () => {
      const inner = document.createElement('input');
      el.appendChild(inner);
      let clicks = 0;
      el.addEventListener('click', () => clicks++);
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(clicks).toBe(0);
    });

    it('a link button has no keyboard handling of its own: the link takes the keys', () => {
      const a = document.createElement('a');
      a.href = '#x';
      a.addEventListener('click', (e) => e.preventDefault());
      el.appendChild(a);
      const seen: string[] = [];
      el.addEventListener('click', () => seen.push('click'));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(seen).toEqual([]);
    });

    it('other keys do not dispatch void-click', () => {
      let fired = false;
      el.addEventListener('void-click', () => { fired = true; });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(fired).toBe(false);
    });
  });

  describe('link button (a link or a native button as the content)', () => {
    const settle = () => new Promise<void>((r) => setTimeout(r));
    let el: VoidButton;

    function linkButton(inner = '<a href="#docs">Docs</a>'): VoidButton {
      el = createElement();
      el.innerHTML = inner;
      document.body.appendChild(el);
      return el;
    }
    const link = () => el.querySelector('a, button') as HTMLElement;

    it('is presentational: no role, no tabindex, no aria-disabled on the host', async () => {
      linkButton();
      await el.updateComplete;
      for (const a of ['role', 'tabindex', 'aria-disabled', 'aria-pressed']) expect(el.hasAttribute(a)).toBe(false);
    });

    it('leaves the link as it is while enabled', async () => {
      linkButton();
      await el.updateComplete;
      expect(link().getAttribute('href')).toBe('#docs');
      expect(link().hasAttribute('aria-disabled')).toBe(false);
      expect(link().hasAttribute('tabindex')).toBe(false);
    });

    it('treats a native button as the one control too', async () => {
      linkButton('<button type="button">Go</button>');
      await el.updateComplete;
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('tabindex')).toBe(false);
    });

    it('is a normal button for text, and an <a> without href is not a link', async () => {
      linkButton('<a>Not a link</a>');
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('becomes a link button when the link arrives after first render, and a button again when it leaves', async () => {
      el = createElement();
      el.textContent = 'Docs';
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('button');
      el.textContent = '';
      const a = document.createElement('a');
      a.href = '#d';
      a.textContent = 'Docs';
      el.appendChild(a);
      await settle();
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('tabindex')).toBe(false);
      a.remove();
      await settle();
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('follows an href added to a bare <a> later', async () => {
      linkButton('<a>Docs</a>');
      await el.updateComplete;
      link().setAttribute('href', '#d');
      await settle();
      expect(el.hasAttribute('role')).toBe(false);
    });

    it('disabled: the link is aria-disabled and out of the tab order, the host stays presentational', async () => {
      linkButton();
      el.disabled = true;
      await el.updateComplete;
      expect(link().getAttribute('aria-disabled')).toBe('true');
      expect(link().getAttribute('tabindex')).toBe('-1');
      for (const a of ['role', 'tabindex', 'aria-disabled']) expect(el.hasAttribute(a)).toBe(false);
    });

    it('disabled: a click on the link does not navigate or reach listeners', async () => {
      linkButton();
      el.disabled = true;
      await el.updateComplete;
      let reached = 0;
      document.addEventListener('click', () => reached++, { once: true });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      link().dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
      expect(reached).toBe(0);
    });

    it('enabling again takes back exactly what disabling wrote', async () => {
      linkButton();
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      expect(link().hasAttribute('aria-disabled')).toBe(false);
      expect(link().hasAttribute('tabindex')).toBe(false);
    });

    it('disabled leaves an aria-disabled or tabindex the author wrote alone when enabling', async () => {
      linkButton('<a href="#d" tabindex="0" aria-disabled="false">Docs</a>');
      el.disabled = true;
      await el.updateComplete;
      el.disabled = false;
      await el.updateComplete;
      expect(link().getAttribute('tabindex')).toBe('0');
      expect(link().getAttribute('aria-disabled')).toBe('false');
    });

    it('disabled disables a native button inside, and enabling restores it', async () => {
      linkButton('<button type="button">Go</button>');
      el.disabled = true;
      await el.updateComplete;
      expect((link() as HTMLButtonElement).disabled).toBe(true);
      el.disabled = false;
      await el.updateComplete;
      expect((link() as HTMLButtonElement).disabled).toBe(false);
    });

    it('a <fieldset disabled> disables the link too', async () => {
      const fs = document.createElement('fieldset');
      document.body.append(fs);
      el = createElement();
      el.innerHTML = '<a href="#d">Docs</a>';
      fs.append(el);
      fs.setAttribute('disabled', '');
      await settle();
      expect(link().getAttribute('aria-disabled')).toBe('true');
      fs.removeAttribute('disabled');
      await settle();
      expect(link().hasAttribute('aria-disabled')).toBe(false);
      fs.remove();
    });

    it('disabling a replaced link leaves nothing on the old one', async () => {
      linkButton();
      el.disabled = true;
      await el.updateComplete;
      const old = link();
      const next = document.createElement('a');
      next.href = '#n';
      old.replaceWith(next);
      await settle();
      expect(old.hasAttribute('aria-disabled')).toBe(false);
      expect(next.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('form association', () => {
    it('resets the form when type="reset" and clicked', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.name = 'field';
      input.defaultValue = 'initial';
      form.appendChild(input);

      const el = createElement();
      el.type = 'reset';
      form.appendChild(el);
      document.body.appendChild(form);

      input.value = 'changed';
      el.click();
      // After reset, value returns to the element's defaultValue.
      expect(input.value).toBe('initial');
    });
  });
});
