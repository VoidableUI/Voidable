// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCollapsible } from '../../src/components/collapsible.js';

const TAG = 'void-collapsible';

function create(heading = 'Test', content = 'Content'): VoidCollapsible {
  const el = document.createElement(TAG) as VoidCollapsible;
  const trigger = document.createElement('void-collapsible-trigger');
  trigger.textContent = heading;
  const body = document.createElement('void-collapsible-content');
  body.textContent = content;
  el.append(trigger, body);
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
  });

  describe('parts', () => {
    let el: VoidCollapsible;

    beforeEach(async () => {
      el = create('My Section', 'My Content');
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders nothing of its own: the author\'s two parts are its only children', () => {
      expect(Array.from(el.children).map(c => c.localName)).toEqual(['void-collapsible-trigger', 'void-collapsible-content']);
      expect(el.querySelector('button, svg, .void-collapsible-trigger')).toBeNull();
    });

    it('never moves the author\'s nodes', async () => {
      const before = Array.from(el.children);
      el.open = true;
      await el.updateComplete;
      (before[0] as HTMLElement).click();
      await el.updateComplete;
      expect(Array.from(el.children)).toEqual(before);
    });

    it('the trigger is a focusable button', () => {
      const trigger = el.querySelector('void-collapsible-trigger')!;
      expect(trigger.getAttribute('role')).toBe('button');
      expect(trigger.getAttribute('tabindex')).toBe('0');
      expect(trigger.textContent).toBe('My Section');
    });

    it('keeps an author id and generates one only where missing', async () => {
      const own = create();
      own.querySelector('void-collapsible-trigger')!.id = 'mine';
      document.body.appendChild(own);
      await own.updateComplete;
      expect(own.querySelector('void-collapsible-trigger')!.id).toBe('mine');
      expect(own.querySelector('void-collapsible-content')!.getAttribute('aria-labelledby')).toBe('mine');
      expect(own.querySelector('void-collapsible-content')!.id).toMatch(/^void-collapsible-content-/);
    });

    it('wires a content part that arrives late', async () => {
      const late = document.createElement(TAG) as VoidCollapsible;
      const trigger = document.createElement('void-collapsible-trigger');
      trigger.textContent = 'T';
      late.append(trigger);
      document.body.appendChild(late);
      await late.updateComplete;
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
      const content = document.createElement('void-collapsible-content');
      late.append(content);
      await new Promise(r => setTimeout(r, 0));
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('role')).toBe('region');
    });

    it('takes what it wrote off a part that is removed', async () => {
      const trigger = el.querySelector('void-collapsible-trigger')!;
      trigger.remove();
      await new Promise(r => setTimeout(r, 0));
      expect(trigger.hasAttribute('role')).toBe(false);
      expect(trigger.hasAttribute('aria-expanded')).toBe(false);
      expect(el.querySelector('void-collapsible-content')!.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('a nested collapsible keeps its own parts', async () => {
      const outer = create('Outer', '');
      const inner = create('Inner', 'inner body');
      outer.querySelector('void-collapsible-content')!.append(inner);
      document.body.appendChild(outer);
      await outer.updateComplete;
      await inner.updateComplete;
      (inner.querySelector('void-collapsible-trigger') as HTMLElement).click();
      await inner.updateComplete;
      expect(inner.open).toBe(true);
      expect(outer.open).toBe(false);
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
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('trigger has aria-expanded="true" when open', async () => {
      el.open = true;
      await el.updateComplete;
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('trigger aria-controls matches content id', () => {
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      const content = el.querySelector('void-collapsible-content') as HTMLElement;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('content has role="region"', () => {
      const content = el.querySelector('void-collapsible-content') as HTMLElement;
      expect(content.getAttribute('role')).toBe('region');
    });

    it('content aria-labelledby matches trigger id', () => {
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      const content = el.querySelector('void-collapsible-content') as HTMLElement;
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
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('closes on second trigger click', async () => {
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
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
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('marks the trigger aria-disabled and out of the tab order', () => {
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      expect(trigger.getAttribute('tabindex')).toBe('-1');
    });

    it('keyboard does not toggle when disabled', async () => {
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(false);
    });

    it('does not dispatch void-toggle when disabled', async () => {
      let fired = false;
      el.addEventListener('void-toggle', () => { fired = true; });
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
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
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-toggle detail contains open state', async () => {
      let detail: { open: boolean } | null = null;
      el.addEventListener('void-toggle', (e) => { detail = (e as CustomEvent).detail; });
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(detail).toEqual({ open: true });
    });

    it('void-toggle bubbles', async () => {
      let firedOnParent = false;
      document.body.addEventListener('void-toggle', () => { firedOnParent = true; }, { once: true });
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });

    it('void-toggle detail open=false when closing', async () => {
      el.open = true;
      await el.updateComplete;
      let detail: { open: boolean } | null = null;
      el.addEventListener('void-toggle', (e) => { detail = (e as CustomEvent).detail; });
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
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
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('Space key toggles open', async () => {
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      await el.updateComplete;
      expect(el.open).toBe(true);
    });

    it('other keys do not toggle', async () => {
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
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
      const trigger = el.querySelector('void-collapsible-trigger') as HTMLElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });
  });
});

describe('closed content is hidden="until-found" where the browser supports it', () => {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  beforeAll(() => { proto.onbeforematch = null; });
  afterAll(() => { delete proto.onbeforematch; });

  it('marks closed content, takes the mark off on opening and puts it back after closing', async () => {
    const el = create();
    document.body.appendChild(el);
    await el.updateComplete;
    const content = el.querySelector('void-collapsible-content') as HTMLElement;
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
    const el = create();
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.querySelector('void-collapsible-content')!.hasAttribute('hidden')).toBe(false);
    el.remove();
  });

  it('opens when find-in-page reaches the closed content (beforematch), and says so', async () => {
    const el = create();
    document.body.appendChild(el);
    await el.updateComplete;
    const toggles: boolean[] = [];
    el.addEventListener('void-toggle', (e) => toggles.push((e as CustomEvent).detail.open));
    el.querySelector('void-collapsible-content')!.dispatchEvent(new Event('beforematch', { bubbles: true }));
    await el.updateComplete;
    expect(el.open).toBe(true);
    expect(toggles).toEqual([true]);
    expect(el.querySelector('void-collapsible-content')!.hasAttribute('hidden')).toBe(false);
    el.remove();
  });

  it('writes nothing where the browser lacks it', async () => {
    delete proto.onbeforematch;
    const el = create();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.querySelector('void-collapsible-content')!.hasAttribute('hidden')).toBe(false);
    el.remove();
    proto.onbeforematch = null;
  });
});
