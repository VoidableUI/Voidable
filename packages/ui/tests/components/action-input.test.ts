// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidActionInput } from '../../src/components/action-input.js';

const TAG = 'void-action-input';

async function mount(props: Partial<VoidActionInput> = {}): Promise<VoidActionInput> {
  const el = document.createElement(TAG) as VoidActionInput;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const input = (el: Element) => el.querySelector('input.void-action-input-field') as HTMLInputElement;
const button = (el: Element) => el.querySelector('button.void-action-input-btn') as HTMLButtonElement;

function type(el: VoidActionInput, text: string, evt: 'input' | 'change' = 'input'): void {
  const i = input(el);
  i.value = text;
  i.dispatchEvent(new Event(evt, { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidActionInput', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidActionInput.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-action-input', () => {
      expect(customElements.get(TAG)).toBe(VoidActionInput);
    });
  });

  describe('default property values', () => {
    const el = document.createElement(TAG) as VoidActionInput;
    it('value, placeholder, name and autocomplete default to empty', () => {
      expect([el.value, el.placeholder, el.name, el.autocomplete]).toEqual(['', '', '', '']);
    });
    it('disabled and readonly default to false', () => {
      expect(el.disabled).toBe(false);
      expect(el.readonly).toBe(false);
    });
    it('size defaults to "md"', () => expect(el.size).toBe('md'));
    it('color defaults to "default"', () => expect(el.color).toBe('default'));
    it('type defaults to "text"', () => expect(el.type).toBe('text'));
    it('icon defaults to "search"', () => expect(el.icon).toBe('search'));
    it('actionLabel defaults to empty: the actionInput.action message names the button', () => expect(el.actionLabel).toBe(''));
    it('iconSide defaults to "end"', () => expect(el.iconSide).toBe('end'));
    it('tooltipSide defaults to "top"', () => expect(el.tooltipSide).toBe('top'));
  });

  describe('attributes', () => {
    it('reflects configuration properties', async () => {
      const el = await mount({
        placeholder: 'p', disabled: true, readonly: true, name: 'n', size: 'lg', color: 'error',
        type: 'password', icon: 'copy', iconSide: 'start', tooltipSide: 'bottom',
      });
      expect(el.getAttribute('placeholder')).toBe('p');
      expect(el.hasAttribute('disabled')).toBe(true);
      expect(el.hasAttribute('readonly')).toBe(true);
      expect(el.getAttribute('name')).toBe('n');
      expect(el.getAttribute('size')).toBe('lg');
      expect(el.getAttribute('color')).toBe('error');
      expect(el.getAttribute('type')).toBe('password');
      expect(el.getAttribute('icon')).toBe('copy');
      expect(el.getAttribute('icon-side')).toBe('start');
      expect(el.getAttribute('tooltip-side')).toBe('bottom');
    });

    it('maps the action-label attribute to actionLabel', async () => {
      const el = document.createElement(TAG) as VoidActionInput;
      el.setAttribute('action-label', 'Copy link');
      expect(el.actionLabel).toBe('Copy link');
    });

    it('reflects value to the attribute', async () => {
      const el = await mount({ value: 'abc' });
      expect(el.getAttribute('value')).toBe('abc');
    });

    it('reads the value attribute', async () => {
      const el = document.createElement(TAG) as VoidActionInput;
      el.setAttribute('value', 'seed');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(input(el).value).toBe('seed');
    });
  });

  describe('rendered structure', () => {
    it('renders an input and a button, button last by default', async () => {
      const el = await mount();
      expect(input(el)).not.toBeNull();
      expect(button(el)).not.toBeNull();
      const tooltip = el.querySelector('void-tooltip')!;
      expect(tooltip.contains(button(el))).toBe(true);
      expect(Array.from(el.children).map((c) => c.localName)).toEqual(['input', 'void-tooltip']);
    });

    it('puts the button first with icon-side="start"', async () => {
      const el = await mount({ iconSide: 'start' });
      expect(Array.from(el.children).map((c) => c.localName)).toEqual(['void-tooltip', 'input']);
    });

    it('moves the button when iconSide changes', async () => {
      const el = await mount();
      el.iconSide = 'start';
      await el.updateComplete;
      expect(el.children[0]!.localName).toBe('void-tooltip');
      expect(el.querySelectorAll('button')).toHaveLength(1);
    });

    it('button is type="button" so it never submits a surrounding form', async () => {
      const el = await mount();
      expect(button(el).type).toBe('button');
    });

    it('passes input attributes through', async () => {
      const el = await mount({ placeholder: 'Search…', name: 'q', type: 'password', value: 'v' });
      const i = input(el);
      expect(i.getAttribute('placeholder')).toBe('Search…');
      expect(i.getAttribute('name')).toBe('q');
      expect(i.type).toBe('password');
      expect(i.value).toBe('v');
    });

    it('applies disabled to both input and button', async () => {
      const el = await mount({ disabled: true });
      expect(input(el).disabled).toBe(true);
      expect(button(el).disabled).toBe(true);
    });

    it('applies readonly to the input only', async () => {
      const el = await mount({ readonly: true });
      expect(input(el).readOnly).toBe(true);
      expect(button(el).disabled).toBe(false);
    });

    it('passes the action label and side to the tooltip', async () => {
      const el = await mount({ actionLabel: 'Copy', tooltipSide: 'left' });
      const tip = el.querySelector('void-tooltip')!;
      expect(tip.querySelector('void-tooltip-content')!.textContent).toBe('Copy');
      expect(tip.querySelector('void-tooltip-trigger > button')).not.toBeNull();
      expect(tip.getAttribute('side')).toBe('left');
    });

    it('renders an svg icon in the button', async () => {
      const el = await mount();
      expect(button(el).querySelector('svg')).not.toBeNull();
    });

    it('renders a different icon per named icon', async () => {
      const names = ['copy', 'search', 'send', 'eye', 'eye-off', 'check', 'x', 'arrow-right', 'clipboard'];
      const shapes = new Set<string>();
      for (const icon of names) {
        const el = await mount({ icon });
        shapes.add(button(el).querySelector('svg')!.innerHTML.replace(/<!--.*?-->/g, ''));
      }
      expect(shapes.size).toBe(names.length);
    });

    it('falls back to the search icon for unknown names', async () => {
      const unknown = await mount({ icon: 'nope' });
      const search = await mount({ icon: 'search' });
      expect(button(unknown).querySelector('svg')!.innerHTML).toBe(button(search).querySelector('svg')!.innerHTML);
    });

    it('swaps the icon when icon changes', async () => {
      const el = await mount({ icon: 'copy' });
      const before = button(el).querySelector('svg')!.innerHTML;
      el.icon = 'x';
      await el.updateComplete;
      expect(button(el).querySelector('svg')!.innerHTML).not.toBe(before);
    });
  });

  describe('accessibility', () => {
    it('names the button after actionLabel', async () => {
      const el = await mount({ actionLabel: 'Copy link' });
      expect(button(el).getAttribute('aria-label')).toBe('Copy link');
    });

    it('updates the button name when actionLabel changes', async () => {
      const el = await mount();
      el.actionLabel = 'Go';
      await el.updateComplete;
      expect(button(el).getAttribute('aria-label')).toBe('Go');
    });

    it('does not give the input the same accessible name as the action button', async () => {
      const el = await mount({ actionLabel: 'Copy link' });
      expect(input(el).getAttribute('aria-label')).not.toBe(button(el).getAttribute('aria-label'));
    });
  });

  describe('void-input event', () => {
    it('is dispatched on typing with the new value, and value is updated', async () => {
      const el = await mount();
      const details: unknown[] = [];
      el.addEventListener('void-input', (e) => details.push((e as CustomEvent).detail));
      type(el, 'hel');
      type(el, 'hello');
      expect(details).toEqual([{ value: 'hel' }, { value: 'hello' }]);
      expect(el.value).toBe('hello');
    });

    it('bubbles and is composed', async () => {
      const el = await mount();
      let ev: CustomEvent | null = null;
      document.body.addEventListener('void-input', (e) => { ev = e as CustomEvent; }, { once: true });
      type(el, 'x');
      expect(ev!.bubbles).toBe(true);
      expect(ev!.composed).toBe(true);
    });

    it('keeps the input in sync after re-render', async () => {
      const el = await mount();
      type(el, 'typed');
      await el.updateComplete;
      expect(input(el).value).toBe('typed');
    });

    it('does not fire void-change', async () => {
      const el = await mount();
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      type(el, 'x');
      expect(fired).toBe(false);
    });
  });

  describe('void-change event', () => {
    it('is dispatched on commit with the value', async () => {
      const el = await mount();
      let detail: unknown;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      type(el, 'done', 'change');
      expect(detail).toEqual({ value: 'done' });
      expect(el.value).toBe('done');
    });
  });

  describe('programmatic value', () => {
    it('updates the input when value is set', async () => {
      const el = await mount({ value: 'a' });
      el.value = 'b';
      await el.updateComplete;
      expect(input(el).value).toBe('b');
    });

    it('does not dispatch events for programmatic changes', async () => {
      const el = await mount();
      let count = 0;
      el.addEventListener('void-input', () => count++);
      el.addEventListener('void-change', () => count++);
      el.value = 'x';
      await el.updateComplete;
      expect(count).toBe(0);
    });
  });

  describe('void-action event', () => {
    it('is dispatched on button click with the current value', async () => {
      const el = await mount({ value: 'https://example.com' });
      let detail: unknown;
      el.addEventListener('void-action', (e) => { detail = (e as CustomEvent).detail; });
      button(el).click();
      expect(detail).toEqual({ value: 'https://example.com' });
    });

    it('reflects the latest typed value', async () => {
      const el = await mount();
      type(el, 'fresh');
      let detail: unknown;
      el.addEventListener('void-action', (e) => { detail = (e as CustomEvent).detail; });
      button(el).click();
      expect(detail).toEqual({ value: 'fresh' });
    });

    it('bubbles and is composed', async () => {
      const el = await mount();
      let ev: CustomEvent | null = null;
      document.body.addEventListener('void-action', (e) => { ev = e as CustomEvent; }, { once: true });
      button(el).click();
      expect(ev!.bubbles).toBe(true);
      expect(ev!.composed).toBe(true);
    });

    it('is not dispatched when disabled', async () => {
      const el = await mount({ disabled: true });
      let fired = false;
      el.addEventListener('void-action', () => { fired = true; });
      button(el).click();
      expect(fired).toBe(false);
    });

    it('still fires for readonly inputs (e.g. copy-to-clipboard)', async () => {
      const el = await mount({ readonly: true, value: 'copy me' });
      let detail: unknown;
      el.addEventListener('void-action', (e) => { detail = (e as CustomEvent).detail; });
      button(el).click();
      expect(detail).toEqual({ value: 'copy me' });
    });

    it('fires once per click', async () => {
      const el = await mount();
      let count = 0;
      el.addEventListener('void-action', () => count++);
      button(el).click();
      button(el).click();
      expect(count).toBe(2);
    });

    it('re-enables after disabled is cleared', async () => {
      const el = await mount({ disabled: true });
      el.disabled = false;
      await el.updateComplete;
      let fired = false;
      el.addEventListener('void-action', () => { fired = true; });
      button(el).click();
      expect(fired).toBe(true);
    });
  });
});
