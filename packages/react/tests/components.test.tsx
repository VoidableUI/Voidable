import { describe, it, expect, afterEach, vi } from 'vitest';
import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
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
  Textarea,
  Code,
  CodeCopy,
  CodeLine,
  CodeTitle,
  Diff,
  DiffHeader,
  DiffHunk,
  DiffLine,
  DiffTitle,
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
    // The element reflects the array as JSON (#67); React never wrote "[object Object]".
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(el.getAttribute('value')).toBe(JSON.stringify(tags));
  });

  it('passes object data to charts as the JSON data attribute, which the chart reads', async () => {
    const data = { series: [{ name: 'a', values: [1, 2] }], labels: ['x', 'y'] };
    const c = await render(<BarChart data={data} />);
    const el = c.querySelector('void-bar-chart') as HTMLElement & { data: unknown };
    expect(el.data).toEqual(data);
    expect(el.getAttribute('data') ?? JSON.stringify(el.data)).toBe(JSON.stringify(data));
  });

  it('server-renders a chart with its data in the markup', () => {
    const data = { series: [{ name: 'a', values: [1, 2] }], labels: ['x', 'y'] };
    const html = renderToString(<BarChart data={data} aria-label="Sales" />);
    expect(html).toContain(`data="${JSON.stringify(data).replace(/"/g, '&quot;')}"`);
  });

  it('does not touch a chart whose data did not change', async () => {
    const data = { series: [{ name: 'a', values: [1, 2] }], labels: ['x', 'y'] };
    const c = await render(<BarChart data={data} />);
    const el = c.querySelector('void-bar-chart') as HTMLElement & { data: unknown };
    const before = el.data;
    await rerender(<BarChart data={{ ...data, series: [{ name: 'a', values: [1, 2] }] }} />);
    expect(el.data).toBe(before);
  });

  it('sets camelCase props via their property, not a mangled attribute', async () => {
    const c = await render(<Calendar firstDay={1} />);
    const el = c.querySelector('void-calendar') as HTMLElement & { firstDay: number };
    expect(el.firstDay).toBe(1);
  });

  it('sets a textarea autosize and maxRows, which reflect to autosize and max-rows', async () => {
    const c = await render(<Textarea autosize maxRows={6} />);
    const el = c.querySelector('void-textarea') as HTMLElement & { autosize: boolean; maxRows: number };
    expect(el.autosize).toBe(true);
    expect(el.maxRows).toBe(6);
    await (el as any).updateComplete;
    expect(el.hasAttribute('autosize')).toBe(true);
    expect(el.getAttribute('max-rows')).toBe('6');
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

  it('passes aria-disabled and aria-describedby through, and keeps aria-disabled on the button (#105)', async () => {
    const c = await render(<Button aria-disabled="true" aria-describedby="why">x</Button>);
    const el = c.querySelector('void-button')!;
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.getAttribute('aria-describedby')).toBe('why');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('passes plain string attributes', async () => {
    const c = await render(<Button variant="filled" color="error">x</Button>);
    const el = c.querySelector('void-button')!;
    expect(el.getAttribute('variant')).toBe('filled');
    expect(el.getAttribute('color')).toBe('error');
  });
});

describe('code and diff', () => {
  it('renders a code block and its parts as the tags, with booleans as attributes, and delivers onVoidCopy', async () => {
    let copied = '';
    const c = await render(
      <Code lineNumbers onVoidCopy={(e) => { copied = e.detail.value; }}>
        <CodeTitle>a.js</CodeTitle>
        <CodeCopy><button type="button" /></CodeCopy>
        <pre><code>{['a', 'b'].map((line, i) => <CodeLine key={i} number={String(i + 40)}>{line}</CodeLine>)}</code></pre>
      </Code>,
    );
    const el = c.querySelector('void-code') as HTMLElement & { lineNumbers: boolean; text: string; updateComplete: Promise<boolean> };
    await el.updateComplete;
    expect(el.lineNumbers).toBe(true);
    expect(el.hasAttribute('line-numbers')).toBe(true);
    expect(el.text).toBe('a\nb');
    expect(c.querySelector('void-code-title')!.textContent).toBe('a.js');
    expect(c.querySelectorAll('void-code-copy > button').length).toBe(1);
    expect(c.querySelector('void-code-line')!.getAttribute('number')).toBe('40');
    el.dispatchEvent(new CustomEvent('void-copy', { detail: { value: 'a\nb' } }));
    expect(copied).toBe('a\nb');
  });

  it('renders a diff and its parts as the tags, with kind, old and new as attributes', async () => {
    const c = await render(
      <Diff lineNumbers wrap>
        <DiffTitle>a.js</DiffTitle>
        <DiffHunk>
          <DiffHeader>@@ -1 +1 @@</DiffHeader>
          <DiffLine kind="del" old="1">a <del>b</del></DiffLine>
          <DiffLine kind="add" new="1">a <ins>c</ins></DiffLine>
        </DiffHunk>
      </Diff>,
    );
    const el = c.querySelector('void-diff') as HTMLElement & { wrap: boolean; updateComplete: Promise<boolean> };
    await el.updateComplete;
    expect(el.wrap).toBe(true);
    expect(el.hasAttribute('line-numbers')).toBe(true);
    const lines = c.querySelectorAll('void-diff-hunk > void-diff-line');
    expect(lines.length).toBe(2);
    expect([lines[0].getAttribute('kind'), lines[0].getAttribute('old'), lines[0].hasAttribute('new')]).toEqual(['del', '1', false]);
    expect([lines[1].getAttribute('kind'), lines[1].getAttribute('new')]).toEqual(['add', '1']);
    expect(c.querySelector('void-diff-header')!.textContent).toBe('@@ -1 +1 @@');
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
