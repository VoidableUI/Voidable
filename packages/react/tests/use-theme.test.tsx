import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { useTheme } from '../src/index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  return <span id="theme">{useTheme()}</span>;
}

let root: Root | undefined;
let container: HTMLElement | undefined;

async function mount(): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<Probe />));
  return container;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  root = undefined;
  document.documentElement.removeAttribute('data-theme');
});

describe('useTheme', () => {
  it('defaults to dark when data-theme is unset', async () => {
    const c = await mount();
    expect(c.querySelector('#theme')!.textContent).toBe('dark');
  });

  it('renders dark on the server', () => {
    expect(renderToString(<Probe />)).toContain('dark');
  });

  it('reads light from data-theme', async () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const c = await mount();
    expect(c.querySelector('#theme')!.textContent).toBe('light');
  });

  it('treats unknown values as dark', async () => {
    document.documentElement.setAttribute('data-theme', 'sepia');
    const c = await mount();
    expect(c.querySelector('#theme')!.textContent).toBe('dark');
  });

  it('updates when data-theme changes', async () => {
    const c = await mount();
    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      await Promise.resolve();
    });
    expect(c.querySelector('#theme')!.textContent).toBe('light');
  });
});
