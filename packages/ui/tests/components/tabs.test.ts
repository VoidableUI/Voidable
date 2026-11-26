// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTabs } from '../../src/components/tabs.js';

interface Spec { value: string; label?: string; content?: string; disabled?: boolean }

/** Tabs in the explicit-parts form (#52). */
function markup(value: string | null, specs: Spec[]): string {
  const triggers = specs
    .map((s) => `<void-tabs-trigger value="${s.value}"${s.disabled ? ' disabled' : ''}>${s.label ?? s.value.toUpperCase()}</void-tabs-trigger>`)
    .join('');
  const contents = specs.map((s) => `<void-tabs-content value="${s.value}">${s.content ?? `panel ${s.value}`}</void-tabs-content>`).join('');
  return `<void-tabs${value === null ? '' : ` value="${value}"`}><void-tabs-list>${triggers}</void-tabs-list>${contents}</void-tabs>`;
}

async function mount(value: string | null = 'a', specs: Spec[] = [{ value: 'a' }, { value: 'b' }, { value: 'c' }]): Promise<VoidTabs> {
  document.body.innerHTML = markup(value, specs);
  const el = document.querySelector('void-tabs') as VoidTabs;
  await el.updateComplete;
  return el;
}

const triggers = (el: Element) => Array.from(el.querySelectorAll<HTMLElement>('void-tabs-trigger'));
const contents = (el: Element) => Array.from(el.querySelectorAll<HTMLElement>('void-tabs-content'));
const tick = () => new Promise((r) => setTimeout(r, 0));

function key(target: Element, k: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidTabs', () => {
  describe('class and defaults', () => {
    it('extends VoidElement and is registered', () => {
      expect(Object.getPrototypeOf(VoidTabs)).toBe(VoidElement);
      expect(customElements.get('void-tabs')).toBe(VoidTabs);
    });

    it('defaults: value empty, size md, activation manual', () => {
      const el = document.createElement('void-tabs') as VoidTabs;
      expect([el.value, el.size, el.activation]).toEqual(['', 'md', 'manual']);
    });

    it('void-tab-panel is gone', () => {
      expect(customElements.get('void-tab-panel')).toBeUndefined();
    });
  });

  describe('explicit parts (#52)', () => {
    it('moves and renders nothing: every node stays where the author put it', async () => {
      document.body.innerHTML = markup('a', [{ value: 'a' }, { value: 'b' }]);
      const el = document.querySelector('void-tabs') as VoidTabs;
      const before = [...el.querySelectorAll('*')];
      await el.updateComplete;
      expect([...el.querySelectorAll('*')]).toEqual(before);
    });

    it('wires the WAI-ARIA tabs pattern onto the parts', async () => {
      const el = await mount('b');
      expect(el.querySelector('void-tabs-list')!.getAttribute('role')).toBe('tablist');
      const [a, b] = triggers(el);
      const [pa, pb] = contents(el);
      expect(a!.getAttribute('role')).toBe('tab');
      expect(a!.getAttribute('aria-selected')).toBe('false');
      expect(b!.getAttribute('aria-selected')).toBe('true');
      expect(b!.hasAttribute('active')).toBe(true);
      expect(b!.getAttribute('aria-controls')).toBe(pb!.id);
      expect(pb!.getAttribute('role')).toBe('tabpanel');
      expect(pb!.getAttribute('aria-labelledby')).toBe(b!.id);
      expect(pb!.hasAttribute('active')).toBe(true);
      expect(pa!.hasAttribute('active')).toBe(false);
      expect(pb!.getAttribute('tabindex')).toBe('0');
      expect(pa!.hasAttribute('tabindex')).toBe(false);
    });

    it('uses a roving tab stop: only the selected tab is in the tab order', async () => {
      const el = await mount('b');
      expect(triggers(el).map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    });

    it('with no matching value, the first enabled tab is the tab stop', async () => {
      const el = await mount(null, [{ value: 'a', disabled: true }, { value: 'b' }]);
      expect(triggers(el).map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0']);
      expect(triggers(el)[0]!.getAttribute('aria-disabled')).toBe('true');
    });

    it('never replaces a server id', async () => {
      document.body.innerHTML =
        '<void-tabs value="a"><void-tabs-list><void-tabs-trigger id="t-a" value="a">A</void-tabs-trigger></void-tabs-list><void-tabs-content id="p-a" value="a">x</void-tabs-content></void-tabs>';
      const el = document.querySelector('void-tabs') as VoidTabs;
      await el.updateComplete;
      expect(triggers(el)[0]!.id).toBe('t-a');
      expect(contents(el)[0]!.id).toBe('p-a');
      expect(triggers(el)[0]!.getAttribute('aria-controls')).toBe('p-a');
    });

    it('wires a tab and panel added after the upgrade, and releases removed ones', async () => {
      const el = await mount('a', [{ value: 'a' }]);
      const t = document.createElement('void-tabs-trigger');
      t.setAttribute('value', 'z');
      t.textContent = 'Z';
      el.querySelector('void-tabs-list')!.appendChild(t);
      const c = document.createElement('void-tabs-content');
      c.setAttribute('value', 'z');
      el.appendChild(c);
      await tick();
      expect(t.getAttribute('role')).toBe('tab');
      expect(t.getAttribute('aria-controls')).toBe(c.id);
      t.remove();
      c.remove();
      await tick();
      expect(t.hasAttribute('role')).toBe(false);
      expect(c.hasAttribute('role')).toBe(false);
    });

    it('selects another tab when the selected one is removed', async () => {
      const el = await mount('b');
      triggers(el)[1]!.remove();
      contents(el)[1]!.remove();
      await tick();
      await el.updateComplete;
      expect(el.value).toBe('a');
      expect(contents(el)[0]!.hasAttribute('active')).toBe(true);
    });

    it('ignores the parts of nested tabs', async () => {
      document.body.innerHTML =
        '<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">' +
        markup('x', [{ value: 'x' }, { value: 'y' }]).replace('<void-tabs', '<void-tabs id="inner"') +
        '</void-tabs-content></void-tabs>';
      const outer = document.querySelector('void-tabs') as VoidTabs;
      const inner = document.getElementById('inner') as VoidTabs;
      await outer.updateComplete;
      await inner.updateComplete;
      expect(triggers(inner)[0]!.getAttribute('aria-selected')).toBe('true');
      expect(contents(outer)[0]!.getAttribute('aria-labelledby')).toBe(triggers(outer)[0]!.id);
      expect(contents(inner)[1]!.hasAttribute('active')).toBe(false);
    });
  });

  describe('selection', () => {
    it('a click selects the tab, reflects value and fires void-change', async () => {
      const el = await mount('a');
      const seen: string[] = [];
      el.addEventListener('void-change', (e) => seen.push((e as CustomEvent).detail.value));
      triggers(el)[2]!.click();
      await el.updateComplete;
      expect(el.value).toBe('c');
      expect(el.getAttribute('value')).toBe('c');
      expect(seen).toEqual(['c']);
      expect(contents(el)[2]!.hasAttribute('active')).toBe(true);
    });

    it('a click on text inside a trigger selects it', async () => {
      const el = await mount('a', [{ value: 'a' }, { value: 'b', label: '<b>Bold</b>' }]);
      el.querySelector('b')!.click();
      expect(el.value).toBe('b');
    });

    it('a disabled tab cannot be selected', async () => {
      const el = await mount('a', [{ value: 'a' }, { value: 'b', disabled: true }]);
      triggers(el)[1]!.click();
      expect(el.value).toBe('a');
    });

    it('setting value programmatically selects without void-change', async () => {
      const el = await mount('a');
      let fired = false;
      el.addEventListener('void-change', () => (fired = true));
      el.value = 'b';
      await el.updateComplete;
      expect(triggers(el)[1]!.getAttribute('aria-selected')).toBe('true');
      expect(fired).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('ArrowRight and ArrowLeft move focus, wrapping and skipping disabled tabs', async () => {
      const el = await mount('a', [{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }]);
      const [a, , c] = triggers(el);
      a!.focus();
      key(a!, 'ArrowRight');
      expect(document.activeElement).toBe(c);
      key(c!, 'ArrowRight');
      expect(document.activeElement).toBe(a);
      key(a!, 'ArrowLeft');
      expect(document.activeElement).toBe(c);
      expect(el.value).toBe('a');
    });

    it('in right-to-left ArrowLeft moves to the next tab and ArrowRight to the previous', async () => {
      const el = await mount('a');
      el.style.direction = 'rtl';
      const [a, b, c] = triggers(el);
      a!.focus();
      key(a!, 'ArrowLeft');
      expect(document.activeElement).toBe(b);
      key(b!, 'ArrowRight');
      expect(document.activeElement).toBe(a);
      key(a!, 'ArrowRight');
      expect(document.activeElement).toBe(c);
    });

    it('Home and End jump to the first and last enabled tab', async () => {
      const el = await mount('b');
      const [a, b, c] = triggers(el);
      b!.focus();
      key(b!, 'End');
      expect(document.activeElement).toBe(c);
      key(c!, 'Home');
      expect(document.activeElement).toBe(a);
    });

    it('Enter and Space select the focused tab', async () => {
      const el = await mount('a');
      const [, b, c] = triggers(el);
      expect(key(b!, 'Enter').defaultPrevented).toBe(true);
      expect(el.value).toBe('b');
      key(c!, ' ');
      expect(el.value).toBe('c');
    });

    it('activation="auto" selects on arrow keys', async () => {
      const el = await mount('a');
      el.activation = 'auto';
      await el.updateComplete;
      key(triggers(el)[0]!, 'ArrowRight');
      expect(el.value).toBe('b');
    });

    it('modified keys are left alone', async () => {
      const el = await mount('a');
      const e = new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true });
      triggers(el)[0]!.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(false);
    });
  });
});
