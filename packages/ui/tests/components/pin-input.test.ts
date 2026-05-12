// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidPinInput } from '../../src/components/pin-input.js';

if (!customElements.get('void-pin-input')) {
  customElements.define('void-pin-input', VoidPinInput);
}

describe('VoidPinInput', () => {
  let el: VoidPinInput;

  beforeEach(() => {
    el = document.createElement('void-pin-input') as VoidPinInput;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('extends VoidElement', () => {
    expect(el).toBeInstanceOf(VoidElement);
  });

  it('is registered as void-pin-input', () => {
    expect(customElements.get('void-pin-input')).toBe(VoidPinInput);
  });

  it('default length is 6', () => {
    expect(el.length).toBe(6);
  });

  it('default value is empty', () => {
    expect(el.value).toBe('');
  });

  it('default type is numeric', () => {
    expect(el.type).toBe('numeric');
  });

  it('default size is md', () => {
    expect(el.size).toBe('md');
  });

  it('default color is default', () => {
    expect(el.color).toBe('default');
  });

  it('sets role=group', () => {
    expect(el.getAttribute('role')).toBe('group');
  });

  it('renders correct number of cells based on length', async () => {
    await el.updateComplete;
    const cells = el.querySelectorAll('.void-pin-cell');
    expect(cells.length).toBe(6);
  });

  it('renders different number of cells when length changes', async () => {
    el.length = 4;
    await el.updateComplete;
    const cells = el.querySelectorAll('.void-pin-cell');
    expect(cells.length).toBe(4);
  });

  it('value reflects combined cell values', async () => {
    el.value = '123456';
    await el.updateComplete;
    const cells = el.querySelectorAll<HTMLInputElement>('.void-pin-cell');
    expect(cells[0].value).toBe('1');
    expect(cells[1].value).toBe('2');
    expect(cells[2].value).toBe('3');
    expect(cells[3].value).toBe('4');
    expect(cells[4].value).toBe('5');
    expect(cells[5].value).toBe('6');
  });

  it('dispatches void-change on input', async () => {
    await el.updateComplete;
    let detail: any;
    el.addEventListener('void-change', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });
    const cells = el.querySelectorAll<HTMLInputElement>('.void-pin-cell');
    cells[0].value = '7';
    cells[0].dispatchEvent(new Event('input', { bubbles: true }));
    expect(detail).toBeDefined();
    expect(detail.value).toContain('7');
  });

  it('disabled prevents input', async () => {
    el.disabled = true;
    await el.updateComplete;
    const cells = el.querySelectorAll<HTMLInputElement>('.void-pin-cell');
    expect(cells[0].disabled).toBe(true);
  });

  it('numeric type rejects letters', () => {
    expect((el as any)._isValidChar('a')).toBe(false);
    expect((el as any)._isValidChar('5')).toBe(true);
  });

  it('alphanumeric type accepts letters and digits', () => {
    el.type = 'alphanumeric';
    expect((el as any)._isValidChar('a')).toBe(true);
    expect((el as any)._isValidChar('5')).toBe(true);
    expect((el as any)._isValidChar('!')).toBe(false);
  });

  it('cells have correct inputmode for numeric type', async () => {
    await el.updateComplete;
    const cell = el.querySelector<HTMLInputElement>('.void-pin-cell');
    expect(cell?.getAttribute('inputmode')).toBe('numeric');
  });

  it('cells have correct inputmode for alphanumeric type', async () => {
    el.type = 'alphanumeric';
    await el.updateComplete;
    const cell = el.querySelector<HTMLInputElement>('.void-pin-cell');
    expect(cell?.getAttribute('inputmode')).toBe('text');
  });

  it('mask sets input type to password', async () => {
    el.mask = true;
    await el.updateComplete;
    const cell = el.querySelector<HTMLInputElement>('.void-pin-cell');
    expect(cell?.type).toBe('password');
  });

  it('disabled attribute is reflected', async () => {
    el.disabled = true;
    await el.updateComplete;
    expect(el.getAttribute('disabled')).not.toBeNull();
  });
});
