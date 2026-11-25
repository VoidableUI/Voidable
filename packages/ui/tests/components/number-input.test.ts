// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidNumberInput } from '../../src/components/number-input.js';

if (!customElements.get('void-number-input')) {
  customElements.define('void-number-input', VoidNumberInput);
}

describe('VoidNumberInput', () => {
  let el: VoidNumberInput;

  beforeEach(() => {
    el = document.createElement('void-number-input') as VoidNumberInput;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('default value is 0', () => {
    expect(el.value).toBe(0);
  });

  it('default step is 1', () => {
    expect(el.step).toBe(1);
  });

  it('default size is md', () => {
    expect(el.size).toBe('md');
  });

  it('default color is default', () => {
    expect(el.color).toBe('default');
  });

  it('default controls is sides', () => {
    expect(el.controls).toBe('sides');
  });

  it('sets role=spinbutton', () => {
    expect(el.getAttribute('role')).toBe('spinbutton');
  });

  it('renders a native input', async () => {
    await el.updateComplete;
    const input = el.querySelector('input');
    expect(input).not.toBeNull();
  });

  it('renders decrement and increment buttons when controls=sides', async () => {
    await el.updateComplete;
    const btns = el.querySelectorAll('.void-number-input-btn');
    expect(btns.length).toBe(2);
  });

  it('does not render buttons when controls=none', async () => {
    el.controls = 'none';
    await el.updateComplete;
    const btns = el.querySelectorAll('.void-number-input-btn');
    expect(btns.length).toBe(0);
  });

  it('increment increases value by step', () => {
    el.value = 5;
    el.step = 2;
    (el as any)._increment();
    expect(el.value).toBe(7);
  });

  it('decrement decreases value by step', () => {
    el.value = 5;
    el.step = 2;
    (el as any)._decrement();
    expect(el.value).toBe(3);
  });

  it('value is clamped to min', () => {
    el.min = 0;
    el.value = 5;
    (el as any)._commit(-10);
    expect(el.value).toBe(0);
  });

  it('value is clamped to max', () => {
    el.max = 10;
    el.value = 5;
    (el as any)._commit(20);
    expect(el.value).toBe(10);
  });

  it('does not go below min on decrement', () => {
    el.min = 0;
    el.value = 0;
    (el as any)._decrement();
    expect(el.value).toBe(0);
  });

  it('does not go above max on increment', () => {
    el.max = 10;
    el.value = 10;
    (el as any)._increment();
    expect(el.value).toBe(10);
  });

  it('fires void-change event on commit', () => {
    let detail: any;
    el.addEventListener('void-change', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });
    el.value = 5;
    (el as any)._commit(8);
    expect(detail.value).toBe(8);
    expect(detail.previous).toBe(5);
  });

  it('does not fire void-change if value unchanged', () => {
    let called = false;
    el.addEventListener('void-change', () => {
      called = true;
    });
    el.value = 5;
    (el as any)._commit(5);
    expect(called).toBe(false);
  });

  it('_format respects precision', () => {
    el.precision = 2;
    expect((el as any)._format(3.14159)).toBe('3.14');
  });

  it('_format auto precision', () => {
    el.precision = -1;
    expect((el as any)._format(5)).toBe('5');
  });

  it('disabled attribute is reflected', async () => {
    await el.updateComplete;
    el.disabled = true;
    await el.updateComplete;
    expect(el.getAttribute('disabled')).not.toBeNull();
  });

  it('increment button is disabled at max', async () => {
    el.max = 10;
    el.value = 10;
    await el.updateComplete;
    const incBtn = el.querySelector('.void-number-input-btn-inc') as HTMLButtonElement;
    expect(incBtn.disabled).toBe(true);
  });

  it('decrement button is disabled at min', async () => {
    el.min = 0;
    el.value = 0;
    await el.updateComplete;
    const decBtn = el.querySelector('.void-number-input-btn-dec') as HTMLButtonElement;
    expect(decBtn.disabled).toBe(true);
  });
});

describe('VoidNumberInput stepper interaction', () => {
  let el: VoidNumberInput;
  const inc = () => el.querySelector('.void-number-input-btn-inc') as HTMLButtonElement;
  const dec = () => el.querySelector('.void-number-input-btn-dec') as HTMLButtonElement;
  const fire = (t: Element, type: string) => t.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));

  beforeEach(async () => {
    vi.useFakeTimers();
    el = document.createElement('void-number-input') as VoidNumberInput;
    el.value = 5;
    el.min = 0;
    el.max = 8;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
    vi.useRealTimers();
  });

  it('keyboard activation (click with detail 0, as fired by Enter/Space) steps the value', async () => {
    inc().click();
    expect(el.value).toBe(6);
    dec().click();
    dec().click();
    expect(el.value).toBe(4);
  });

  it('a pointer click (detail > 0) does not double-step after pointerdown', async () => {
    fire(inc(), 'pointerdown');
    fire(inc(), 'pointerup');
    inc().dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(el.value).toBe(6);
  });

  it('auto-repeats while held and stops on pointerup', () => {
    el.max = 100;
    fire(inc(), 'pointerdown');
    vi.advanceTimersByTime(400 + 300 * 2);
    const held = el.value;
    expect(held).toBeGreaterThan(6);
    fire(inc(), 'pointerup');
    vi.advanceTimersByTime(3000);
    expect(el.value).toBe(held);
  });

  for (const type of ['pointercancel', 'pointerleave']) {
    it(`stops auto-repeat on ${type}`, () => {
      el.max = 100;
      fire(inc(), 'pointerdown');
      vi.advanceTimersByTime(1000);
      fire(inc(), type);
      const v = el.value;
      vi.advanceTimersByTime(3000);
      expect(el.value).toBe(v);
    });
  }

  it('stops auto-repeat when max is reached', async () => {
    fire(inc(), 'pointerdown');
    vi.advanceTimersByTime(5000);
    expect(el.value).toBe(8);
    expect(vi.getTimerCount()).toBe(0);
    await el.updateComplete;
    expect(inc().disabled).toBe(true);
  });

  it('stops auto-repeat when min is reached', () => {
    fire(dec(), 'pointerdown');
    vi.advanceTimersByTime(5000);
    expect(el.value).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops auto-repeat when the control becomes disabled mid-press', () => {
    el.max = 100;
    fire(inc(), 'pointerdown');
    vi.advanceTimersByTime(1000);
    el.disabled = true;
    const v = el.value;
    vi.advanceTimersByTime(3000);
    expect(el.value).toBe(v);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops auto-repeat on disconnect', () => {
    el.max = 100;
    fire(inc(), 'pointerdown');
    vi.advanceTimersByTime(1000);
    el.remove();
    const v = el.value;
    vi.advanceTimersByTime(3000);
    expect(el.value).toBe(v);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('VoidNumberInput step="any"', () => {
  async function mountAny(): Promise<VoidNumberInput> {
    document.body.innerHTML = '<void-number-input step="any" value="2"></void-number-input>';
    const el = document.body.firstElementChild as VoidNumberInput;
    await el.updateComplete;
    return el;
  }

  it('reads "any" from the attribute instead of NaN', async () => {
    expect((await mountAny()).step).toBe('any');
  });

  it('steps by 1 with the stepper buttons and arrow keys, never NaN', async () => {
    const el = await mountAny();
    const field = el.querySelector('input') as HTMLInputElement;
    el.querySelector<HTMLButtonElement>('.void-number-input-btn-inc')!.click();
    await el.updateComplete;
    expect(el.value).toBe(3);
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await el.updateComplete;
    expect(el.value).toBe(1);
    expect(el.innerHTML).not.toContain('NaN');
  });

  it('keeps typed decimals', async () => {
    const el = await mountAny();
    const field = el.querySelector('input') as HTMLInputElement;
    field.value = '2.375';
    field.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;
    expect(el.value).toBe(2.375);
  });
});

describe('VoidNumberInput precision', () => {
  it('rounds committed values to the precision (precision="0" gives integers)', async () => {
    document.body.innerHTML = '<void-number-input precision="0" value="1"></void-number-input>';
    const el = document.body.firstElementChild as VoidNumberInput;
    await el.updateComplete;
    const field = el.querySelector('input') as HTMLInputElement;
    field.value = '2.6';
    field.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;
    expect(el.value).toBe(3);
  });
});
