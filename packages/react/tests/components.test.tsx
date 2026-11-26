import { describe, it, expect, afterEach, vi } from 'vitest';
import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  Button,
  Calendar,
  Gauge,
  Input,
  NavBar,
  NumberInput,
  ErrorFallback,
  TagsInput,
  Switch,
  BarChart,
} from '../src/index.js';
import type { VoidButton } from '@voidable/ui';

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

async function rerender(node: React.ReactElement): Promise<void> {
  await act(async () => {
    root!.render(node);
  });
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe('registration', () => {
  it('defines the custom element when a wrapper is rendered', async () => {
    const c = await render(<Button>Hi</Button>);
    const el = c.querySelector('void-button')!;
    expect(customElements.get('void-button')).toBeDefined();
    expect(el.constructor).toBe(customElements.get('void-button'));
  });

  it('defines the chart elements too', async () => {
    await render(<BarChart />);
    for (const tag of ['void-bar-chart', 'void-line-chart', 'void-donut-chart', 'void-gauge']) {
      expect(customElements.get(tag), tag).toBeDefined();
    }
  });
});

describe('hide-* booleans (no attribute defaults to true, #23)', () => {
  it('turns the icon off with hideIcon and back on without it', async () => {
    const c = await render(<ErrorFallback hideIcon />);
    const el = c.querySelector('void-error-fallback') as HTMLElement & { hideIcon: boolean; updateComplete: Promise<boolean> };
    await el.updateComplete;
    expect(el.hideIcon).toBe(true);
    expect(el.hasAttribute('hide-icon')).toBe(true);
    await rerender(<ErrorFallback hideIcon={false} />);
    await el.updateComplete;
    expect(el.hideIcon).toBe(false);
  });

  it('works for nav-bar hideBorder', async () => {
    const c = await render(<NavBar hideBorder>x</NavBar>);
    const el = c.querySelector('void-nav-bar') as HTMLElement & { hideBorder: boolean };
    expect(el.hideBorder).toBe(true);
  });
});

describe('native input attributes', () => {
  it('forwards autocomplete, minlength and inputMode to the native input', async () => {
    const c = await render(<Input type="password" autocomplete="current-password" minlength={8} inputMode="text" spellcheck={false} />);
    const el = c.querySelector('void-input') as HTMLElement & { updateComplete: Promise<boolean> };
    await el.updateComplete;
    const native = el.querySelector('input')!;
    expect(native.getAttribute('autocomplete')).toBe('current-password');
    expect(native.getAttribute('minlength')).toBe('8');
    expect(native.getAttribute('inputmode')).toBe('text');
    expect(native.getAttribute('spellcheck')).toBe('false');
  });
});

describe('props', () => {
  it('does not turn false booleans into truthy attributes', async () => {
    const c = await render(<Button disabled={false}>x</Button>);
    const el = c.querySelector('void-button') as HTMLElement & { disabled: boolean };
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(el.disabled).toBe(false);
  });

  it('sets true booleans as properties and reflects them', async () => {
    const c = await render(<Button disabled>x</Button>);
    const el = c.querySelector('void-button') as HTMLElement & { disabled: boolean };
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(el.disabled).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(true);
  });

  it('toggles a boolean back to false', async () => {
    const c = await render(<Switch checked />);
    const el = c.querySelector('void-switch') as HTMLElement & { checked: boolean; updateComplete: Promise<boolean> };
    expect(el.checked).toBe(true);
    await rerender(<Switch checked={false} />);
    await el.updateComplete;
    expect(el.checked).toBe(false);
    expect(el.hasAttribute('checked')).toBe(false);
  });

  it('sets hide-* booleans as properties', async () => {
    const c = await render(<Gauge hideValue />);
    const el = c.querySelector('void-gauge') as HTMLElement & { hideValue: boolean };
    expect(el.hideValue).toBe(true);
  });

  it('passes arrays as properties, not strings', async () => {
    const tags = ['a', { text: 'b', color: 'error' }];
    const c = await render(<TagsInput value={tags} />);
    const el = c.querySelector('void-tags-input') as HTMLElement & { value: unknown };
    expect(el.value).toBe(tags);
    expect(el.hasAttribute('value')).toBe(false);
  });

  it('passes object data to charts as a property', async () => {
    const data = { series: [{ name: 'a', values: [1, 2] }], labels: ['x', 'y'] };
    const c = await render(<BarChart data={data} />);
    const el = c.querySelector('void-bar-chart') as HTMLElement & { data: unknown };
    expect(el.data).toBe(data);
  });

  it('sets camelCase props via their property, not a mangled attribute', async () => {
    const c = await render(<Calendar firstDay={1} />);
    const el = c.querySelector('void-calendar') as HTMLElement & { firstDay: number };
    expect(el.firstDay).toBe(1);
  });

  it('supports number-input prefix and unit', async () => {
    const c = await render(<NumberInput prefix="$" unit="kg" />);
    const el = c.querySelector('void-number-input') as HTMLElement & { prefix: string; unit: string };
    expect(el.prefix).toBe('$');
    expect(el.unit).toBe('kg');
  });

  it('maps className to class and passes aria/data attributes through', async () => {
    const c = await render(<Button className="foo bar" aria-label="go" data-x="1">x</Button>);
    const el = c.querySelector('void-button')!;
    expect(el.getAttribute('class')).toBe('foo bar');
    expect(el.getAttribute('aria-label')).toBe('go');
    expect(el.getAttribute('data-x')).toBe('1');
  });

  it('passes plain string attributes', async () => {
    const c = await render(<Button variant="filled" color="error">x</Button>);
    const el = c.querySelector('void-button')!;
    expect(el.getAttribute('variant')).toBe('filled');
    expect(el.getAttribute('color')).toBe('error');
  });
});

describe('events', () => {
  it('invokes onVoidClick with the custom event', async () => {
    const handler = vi.fn();
    const c = await render(<Button onVoidClick={handler}>x</Button>);
    const el = c.querySelector('void-button')!;
    el.dispatchEvent(new CustomEvent('void-click', { bubbles: true, composed: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
  });

  it('types detail for onVoidChange and delivers it', async () => {
    let seen: number | undefined;
    const c = await render(
      <NumberInput onVoidChange={(e) => { seen = (e.detail.value ?? 0) + (e.detail.previous ?? 0); }} />,
    );
    c.querySelector('void-number-input')!.dispatchEvent(
      new CustomEvent('void-change', { detail: { value: 2, previous: 1 } }),
    );
    expect(seen).toBe(3);
  });

  it('swaps the listener when the handler changes, without double calls', async () => {
    const a = vi.fn();
    const b = vi.fn();
    const c = await render(<Button onVoidClick={a}>x</Button>);
    const el = c.querySelector('void-button')!;
    await rerender(<Button onVoidClick={b}>x</Button>);
    el.dispatchEvent(new CustomEvent('void-click'));
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('removes the listener when the prop is dropped', async () => {
    const a = vi.fn();
    const c = await render(<Button onVoidClick={a}>x</Button>);
    const el = c.querySelector('void-button')!;
    await rerender(<Button>x</Button>);
    el.dispatchEvent(new CustomEvent('void-click'));
    expect(a).not.toHaveBeenCalled();
  });

  it('removes listeners on unmount', async () => {
    const a = vi.fn();
    const c = await render(<Button onVoidClick={a}>x</Button>);
    const el = c.querySelector('void-button')!;
    await act(async () => root!.unmount());
    root = undefined;
    el.dispatchEvent(new CustomEvent('void-click'));
    expect(a).not.toHaveBeenCalled();
  });

  it('does not leak onVoid props as attributes', async () => {
    const c = await render(<Button onVoidClick={() => {}}>x</Button>);
    const el = c.querySelector('void-button')!;
    expect([...el.attributes].some((a) => a.name.startsWith('onvoid'))).toBe(false);
  });
});

describe('refs', () => {
  it('forwards object refs to the element', async () => {
    const ref = createRef<VoidButton>();
    const c = await render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBe(c.querySelector('void-button'));
  });

  it('forwards callback refs and clears them on unmount', async () => {
    const calls: Array<Element | null> = [];
    const c = await render(<Button ref={(el) => { calls.push(el); }}>x</Button>);
    expect(calls[0]).toBe(c.querySelector('void-button'));
    await act(async () => root!.unmount());
    root = undefined;
    expect(calls[calls.length - 1]).toBeNull();
  });
});
