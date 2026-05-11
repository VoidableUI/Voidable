// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
