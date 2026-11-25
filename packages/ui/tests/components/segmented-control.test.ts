// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import {
  VoidSegmentedControl,
  VoidSegmentedControlItem,
} from '../../src/components/segmented-control.js';

const TAG = 'void-segmented-control';
const ITEM = 'void-segmented-control-item';

interface ItemSpec { value: string; disabled?: boolean }

async function mount(
  props: Partial<VoidSegmentedControl> = {},
  items: ItemSpec[] = [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
): Promise<VoidSegmentedControl> {
  const el = document.createElement(TAG) as VoidSegmentedControl;
  for (const spec of items) {
    const item = document.createElement(ITEM) as VoidSegmentedControlItem;
    item.value = spec.value;
    if (spec.disabled) item.disabled = true;
    item.textContent = spec.value.toUpperCase();
    el.appendChild(item);
  }
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await Promise.all(itemsOf(el).map((i) => i.updateComplete));
  return el;
}

const itemsOf = (el: Element) => Array.from(el.querySelectorAll(ITEM)) as VoidSegmentedControlItem[];
const checked = (el: Element) => itemsOf(el).map((i) => i.getAttribute('aria-checked'));

function press(el: Element, key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(e);
  // Space activates on keyup, as on a native button.
  if (key === ' ') el.dispatchEvent(new KeyboardEvent('keyup', { key: key, bubbles: true, cancelable: true }));
  return e;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidSegmentedControlItem', () => {
  it('extends VoidElement and is registered', () => {
    expect(VoidSegmentedControlItem.prototype).toBeInstanceOf(VoidElement);
    expect(customElements.get(ITEM)).toBe(VoidSegmentedControlItem);
  });

  it('defaults value to empty and disabled to false', () => {
    const el = document.createElement(ITEM) as VoidSegmentedControlItem;
    expect(el.value).toBe('');
    expect(el.disabled).toBe(false);
  });

  it('reflects value and disabled', async () => {
    const el = document.createElement(ITEM) as VoidSegmentedControlItem;
    el.value = 'x';
    el.disabled = true;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('value')).toBe('x');
    expect(el.hasAttribute('disabled')).toBe(true);
  });

  it('has role="radio" and aria-checked="false" on its own', async () => {
    const el = document.createElement(ITEM) as VoidSegmentedControlItem;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('radio');
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  it('is focusable by script but not a tab stop when disabled, and exposes aria-disabled', async () => {
    const el = await mount({ value: 'a' }, [{ value: 'a' }, { value: 'b', disabled: true }]);
    const b = itemsOf(el)[1]!;
    expect(b.getAttribute('tabindex')).toBe('-1');
    expect(b.getAttribute('aria-disabled')).toBe('true');
    b.disabled = false;
    await b.updateComplete;
    expect(b.hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('VoidSegmentedControl', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidSegmentedControl.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-segmented-control', () => {
      expect(customElements.get(TAG)).toBe(VoidSegmentedControl);
    });
  });

  describe('defaults and reflection', () => {
    it('has default value, size and color', () => {
      const el = document.createElement(TAG) as VoidSegmentedControl;
      expect(el.value).toBe('');
      expect(el.size).toBe('md');
      expect(el.color).toBe('default');
    });

    it('reflects value, size and color', async () => {
      const el = await mount({ value: 'b', size: 'lg', color: 'highlight' });
      expect(el.getAttribute('value')).toBe('b');
      expect(el.getAttribute('size')).toBe('lg');
      expect(el.getAttribute('color')).toBe('highlight');
    });

    it('reads the value attribute', async () => {
      const el = await mount();
      el.setAttribute('value', 'c');
      await el.updateComplete;
      expect(el.value).toBe('c');
    });
  });

  describe('ARIA', () => {
    it('has role="radiogroup"', async () => {
      const el = await mount();
      expect(el.getAttribute('role')).toBe('radiogroup');
    });

    it('marks no item as checked when value is empty', async () => {
      const el = await mount();
      expect(checked(el)).toEqual(['false', 'false', 'false']);
    });

    it('marks the item matching the initial value as checked', async () => {
      const el = await mount({ value: 'b' });
      expect(checked(el)).toEqual(['false', 'true', 'false']);
    });

    it('updates aria-checked when value is set programmatically', async () => {
      const el = await mount({ value: 'a' });
      el.value = 'c';
      await el.updateComplete;
      expect(checked(el)).toEqual(['false', 'false', 'true']);
    });

    it('checks nothing when value matches no item', async () => {
      const el = await mount({ value: 'zzz' });
      expect(checked(el)).toEqual(['false', 'false', 'false']);
    });

    it('syncs aria-checked on items added after connect', async () => {
      const el = await mount({ value: 'late' }, [{ value: 'a' }]);
      const item = document.createElement(ITEM) as VoidSegmentedControlItem;
      item.value = 'late';
      el.appendChild(item);
      await el.updateComplete;
      await item.updateComplete;
      expect(item.getAttribute('aria-checked')).toBe('true');
    });

    it('uses a single tab stop (roving tabindex) for the checked item', async () => {
      const el = await mount({ value: 'b' });
      expect(itemsOf(el).map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    });

    it('makes the first enabled item the tab stop when nothing is checked', async () => {
      const el = await mount({}, [{ value: 'a', disabled: true }, { value: 'b' }, { value: 'c' }]);
      expect(itemsOf(el).map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    });

    it('moves the tab stop with the selection', async () => {
      const el = await mount({ value: 'a' });
      itemsOf(el)[2]!.click();
      expect(itemsOf(el).map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '-1', '0']);
    });

    it('moves the tab stop when the checked item is removed', async () => {
      const el = await mount({ value: 'b' });
      itemsOf(el)[1]!.remove();
      await new Promise((r) => setTimeout(r));
      expect(itemsOf(el).map((i) => i.getAttribute('tabindex'))).toEqual(['0', '-1']);
    });

    it('has first-paint state the moment an item connects (no await)', () => {
      const el = document.createElement(TAG) as VoidSegmentedControl;
      el.setAttribute('value', 'b');
      document.body.appendChild(el);
      const item = document.createElement(ITEM) as VoidSegmentedControlItem;
      item.setAttribute('value', 'b');
      el.appendChild(item);
      // (happy-dom runs connectedCallback before the item is findable from its parent, so the
      // roving tab stop is only asserted in the browser probes; aria-checked comes from the group.)
      expect(item.getAttribute('aria-checked')).toBe('true');
    });

    it('takes every item out of the tab order when the group is disabled', async () => {
      const el = await mount({ value: 'b', disabled: true });
      expect(itemsOf(el).map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1']);
    });
  });

  describe('click selection', () => {
    it('selects the clicked item and dispatches void-change with its value', async () => {
      const el = await mount();
      const details: unknown[] = [];
      el.addEventListener('void-change', (e) => details.push((e as CustomEvent).detail));
      itemsOf(el)[1]!.click();
      await el.updateComplete;
      expect(el.value).toBe('b');
      expect(details).toEqual([{ value: 'b' }]);
      expect(checked(el)).toEqual(['false', 'true', 'false']);
    });

    it('selects when a descendant of the item is clicked', async () => {
      const el = await mount();
      const item = itemsOf(el)[2]!;
      const inner = document.createElement('span');
      item.appendChild(inner);
      inner.click();
      expect(el.value).toBe('c');
    });

    it('dispatches void-change that bubbles and is composed', async () => {
      const el = await mount();
      let ev: CustomEvent | null = null;
      document.body.addEventListener('void-change', (e) => { ev = e as CustomEvent; }, { once: true });
      itemsOf(el)[0]!.click();
      expect(ev!.bubbles).toBe(true);
      expect(ev!.composed).toBe(true);
    });

    it('ignores disabled items', async () => {
      const el = await mount({ value: 'a' }, [{ value: 'a' }, { value: 'b', disabled: true }]);
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      itemsOf(el)[1]!.click();
      expect(el.value).toBe('a');
      expect(fired).toBe(false);
    });

    it('ignores clicks that are not on an item', async () => {
      const el = await mount({ value: 'a' });
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.click();
      expect(fired).toBe(false);
      expect(el.value).toBe('a');
    });

    it('does not dispatch void-change for programmatic value changes', async () => {
      const el = await mount();
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      el.value = 'b';
      await el.updateComplete;
      expect(fired).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowRight and ArrowDown select the next item and prevent default', async () => {
      const el = await mount({ value: 'a' });
      let e = press(el, 'ArrowRight');
      expect(el.value).toBe('b');
      expect(e.defaultPrevented).toBe(true);
      e = press(el, 'ArrowDown');
      expect(el.value).toBe('c');
      expect(e.defaultPrevented).toBe(true);
    });

    it('ArrowLeft and ArrowUp select the previous item', async () => {
      const el = await mount({ value: 'c' });
      press(el, 'ArrowLeft');
      expect(el.value).toBe('b');
      press(el, 'ArrowUp');
      expect(el.value).toBe('a');
    });

    it('wraps from last to first and first to last', async () => {
      const el = await mount({ value: 'c' });
      press(el, 'ArrowRight');
      expect(el.value).toBe('a');
      press(el, 'ArrowLeft');
      expect(el.value).toBe('c');
    });

    it('dispatches void-change for each keyboard selection', async () => {
      const el = await mount({ value: 'a' });
      const details: unknown[] = [];
      el.addEventListener('void-change', (e) => details.push((e as CustomEvent).detail));
      press(el, 'ArrowRight');
      press(el, 'ArrowRight');
      expect(details).toEqual([{ value: 'b' }, { value: 'c' }]);
    });

    it('skips disabled items', async () => {
      const el = await mount({ value: 'a' }, [{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }]);
      press(el, 'ArrowRight');
      expect(el.value).toBe('c');
      press(el, 'ArrowLeft');
      expect(el.value).toBe('a');
    });

    it('moves focus to the newly selected item', async () => {
      // happy-dom approximates focus; elements with tabindex are focusable.
      const el = await mount({ value: 'a' });
      press(el, 'ArrowRight');
      expect(document.activeElement).toBe(itemsOf(el)[1]);
    });

    it('selects the first item on ArrowRight when nothing is selected', async () => {
      const el = await mount();
      press(el, 'ArrowRight');
      expect(el.value).toBe('a');
    });

    it('selects the last item on ArrowLeft when nothing is selected', async () => {
      const el = await mount();
      press(el, 'ArrowLeft');
      expect(el.value).toBe('c');
    });

    it('moves from the focused item, not from the checked one', async () => {
      const el = await mount({ value: 'a' });
      const items = itemsOf(el);
      items[2]!.focus();
      press(items[2]!, 'ArrowLeft');
      expect(el.value).toBe('b');
      expect(document.activeElement).toBe(items[1]);
    });

    it('Space selects the focused item', async () => {
      const el = await mount({ value: 'a' });
      const e = press(itemsOf(el)[1]!, ' ');
      expect(el.value).toBe('b');
      expect(e.defaultPrevented).toBe(true);
    });

    it('does not fire void-change when the focused item is already checked', async () => {
      const el = await mount({ value: 'a' });
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      press(itemsOf(el)[0]!, ' ');
      expect(fired).toBe(false);
    });

    it('ignores other keys', async () => {
      const el = await mount({ value: 'a' });
      const e = press(el, 'Enter');
      expect(el.value).toBe('a');
      expect(e.defaultPrevented).toBe(false);
    });

    it('stays on the only enabled item', async () => {
      const el = await mount({ value: 'a' }, [{ value: 'a' }, { value: 'b', disabled: true }]);
      press(el, 'ArrowRight');
      expect(el.value).toBe('a');
    });

    it('does not throw when there are no enabled items', async () => {
      const el = await mount({}, []);
      expect(() => {
        const items = Array.from(el.querySelectorAll('void-segmented-control-item:not([disabled])'));
        expect(items).toHaveLength(0);
        // Run the handler synchronously to surface exceptions that happy-dom would swallow.
        (el as unknown as { _handleKeydown: (e: KeyboardEvent) => void })._handleKeydown(
          new KeyboardEvent('keydown', { key: 'ArrowRight' }),
        );
      }).not.toThrow();
    });
  });

  describe('lifecycle', () => {
    it('stops responding after disconnect', async () => {
      const el = await mount();
      el.remove();
      itemsOf(el)[1]!.click();
      expect(el.value).toBe('');
    });

    it('selects exactly once per click after reconnecting', async () => {
      const el = await mount();
      el.remove();
      document.body.appendChild(el);
      await el.updateComplete;
      let count = 0;
      el.addEventListener('void-change', () => count++);
      itemsOf(el)[1]!.click();
      expect(count).toBe(1);
    });

    it('re-syncs aria-checked on reconnect', async () => {
      const el = await mount({ value: 'b' });
      el.remove();
      itemsOf(el)[1]!.removeAttribute('aria-checked');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(checked(el)).toEqual(['false', 'true', 'false']);
    });
  });
});
