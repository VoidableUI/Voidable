// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Input, Slider, TagsInput } from '../src/index.js';
import type { VoidInput, VoidSlider } from '@voidable/ui';

// Value reflection (#67): the element writes its current value to the `value` attribute. A controlled
// wrapper must neither loop nor lose a user's edit because of it.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLElement | undefined;

async function render(node: React.ReactElement): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(node);
  });
  return container;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

const settle = (el: Element & { updateComplete?: Promise<boolean> }) =>
  act(async () => {
    await el.updateComplete;
    await el.updateComplete;
  });

describe('controlled value through the wrappers', () => {
  it('an Input follows React state and its attribute follows the user without a render loop', async () => {
    let renders = 0;
    let state = '';
    function App() {
      const [value, setValue] = useState('seed');
      renders++;
      state = value;
      return <Input value={value} onVoidInput={(e) => setValue(e.detail.value)} />;
    }
    const host = await render(<App />);
    const el = host.querySelector('void-input') as VoidInput;
    await settle(el);
    expect(el.getAttribute('value')).toBe('seed');

    const native = el.querySelector('input')!;
    native.value = 'typed';
    await act(async () => {
      native.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await settle(el);
    expect(state).toBe('typed');
    expect(el.value).toBe('typed');
    expect(el.getAttribute('value')).toBe('typed');
    expect(native.value).toBe('typed');
    const settled = renders;
    await settle(el);
    expect(renders).toBe(settled);
  });

  it('a Slider keeps the number React holds and the attribute shows it', async () => {
    function App() {
      const [value, setValue] = useState(20);
      return <Slider value={value} onVoidChange={(e) => setValue(e.detail.value as number)} />;
    }
    const host = await render(<App />);
    const el = host.querySelector('void-slider') as VoidSlider;
    await settle(el);
    expect(el.getAttribute('value')).toBe('20');
    const range = el.querySelector('input')!;
    range.value = '65';
    await act(async () => {
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await settle(el);
    expect(el.value).toBe(65);
    expect(el.getAttribute('value')).toBe('65');
  });

  it('a TagsInput set from an array reflects a JSON array and keeps the array property', async () => {
    const host = await render(<TagsInput value={['a', 'b']} />);
    const el = host.querySelector('void-tags-input') as HTMLElement & { value: string[]; updateComplete: Promise<boolean> };
    await settle(el);
    expect(el.value).toEqual(['a', 'b']);
    expect(el.getAttribute('value')).toBe('["a","b"]');
  });
});
