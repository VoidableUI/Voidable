import { describe, it, expect, afterEach, beforeEach } from 'vitest';
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

type Listener = () => void;
let osLight = false;
const listeners = new Set<Listener>();
const realMatchMedia = globalThis.matchMedia;

/** A controllable `prefers-color-scheme` for the test environment. */
function stubMatchMedia(): void {
  globalThis.matchMedia = ((query: string) => ({
    get matches() { return /light/.test(query) ? osLight : !osLight; },
    media: query,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  })) as unknown as typeof matchMedia;
}

async function setOsLight(value: boolean): Promise<void> {
  osLight = value;
  await act(async () => { listeners.forEach((l) => l()); });
}

/** Stands in for the theme stylesheet's resolved `--void-color-scheme`. */
const resolveInCss = (value: string | null) => {
  if (value === null) document.documentElement.style.removeProperty('--void-color-scheme');
  else document.documentElement.style.setProperty('--void-color-scheme', value);
};

beforeEach(() => {
  osLight = false;
  stubMatchMedia();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  root = undefined;
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
  globalThis.matchMedia = realMatchMedia;
});

const text = (c: HTMLElement) => c.querySelector('#theme')!.textContent;

describe('useTheme without the theme stylesheet', () => {
  it('follows the operating system when data-theme is unset', async () => {
    expect(text(await mount())).toBe('dark');
    await setOsLight(true);
    expect(text(container!)).toBe('light');
  });

  it('an explicit data-theme wins over the operating system', async () => {
    osLight = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(text(await mount())).toBe('dark');
  });

  it('data-theme="system" and unknown values follow the operating system', async () => {
    osLight = true;
    document.documentElement.setAttribute('data-theme', 'system');
    expect(text(await mount())).toBe('light');
    await act(async () => { document.documentElement.setAttribute('data-theme', 'sepia'); await Promise.resolve(); });
    expect(text(container!)).toBe('light');
  });

  it('updates when data-theme changes', async () => {
    const c = await mount();
    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      await Promise.resolve();
    });
    expect(text(c)).toBe('light');
  });
});

describe('useTheme with the theme stylesheet', () => {
  it('reports the scheme the CSS resolves, so a theme or skin preference counts', async () => {
    // Loft prefers light: with data-theme unset the CSS resolves light although the OS is dark.
    resolveInCss('light');
    expect(text(await mount())).toBe('light');
    await act(async () => { resolveInCss('dark'); await Promise.resolve(); });
    expect(text(container!)).toBe('dark');
  });
});

describe('useTheme on the server', () => {
  it('renders dark, the documented server default', () => {
    expect(renderToString(<Probe />)).toContain('dark');
  });
});
