import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { Tabs, TabsList, TabsTrigger, TabsContent, Dialog } from '../src/index.js';

// `keys` (#90) is an object in React, written as the JSON `keys` attribute the element reads, so a
// server-rendered page and a client render agree and a change of the object updates the element.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLElement | undefined;

async function render(node: React.ReactElement): Promise<HTMLElement> {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
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

const trigger = (value: string, tabsEl: Element) => tabsEl.querySelector(`void-tabs-trigger[value="${value}"]`) as HTMLElement;
const press = (el: HTMLElement, key: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('keys prop', () => {
  it('is written as the JSON keys attribute in server rendering', () => {
    expect(renderToString(<Dialog keys={{ close: [] }}>x</Dialog>)).toContain('keys="{&quot;close&quot;:[]}"');
  });

  it('rebinds the element: the new key works, the old one stops', async () => {
    const c = await render(
      <Tabs value="a" keys={{ next: ['j'] }}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">a</TabsContent>
        <TabsContent value="b">b</TabsContent>
      </Tabs>,
    );
    const el = c.querySelector('void-tabs') as HTMLElement & { updateComplete: Promise<unknown> };
    await el.updateComplete;
    const a = trigger('a', el);
    a.focus();
    expect(press(a, 'ArrowRight')).toBe(true);
    expect(press(a, 'j')).toBe(false);
  });

  it('follows the object when it changes, and switches an action off with an empty list', async () => {
    const make = (keys: Record<string, string[]>) => (
      <Tabs value="a" keys={keys}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">a</TabsContent>
        <TabsContent value="b">b</TabsContent>
      </Tabs>
    );
    const c = await render(make({ next: ['j'] }));
    const el = c.querySelector('void-tabs') as HTMLElement & { updateComplete: Promise<unknown> };
    await el.updateComplete;
    const a = trigger('a', el);
    expect(press(a, 'j')).toBe(false);
    await render(make({ next: ['l'] }));
    expect(press(a, 'j')).toBe(true);
    expect(press(a, 'l')).toBe(false);
    await render(make({ next: [] }));
    expect(press(a, 'l')).toBe(true);
  });

});
