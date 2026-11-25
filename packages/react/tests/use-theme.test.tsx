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
  stubMutationObserver();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  root = undefined;
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
  globalThis.matchMedia = realMatchMedia;
  globalThis.MutationObserver = realMutationObserver;
  observers.clear();
});

/**
 * A MutationObserver the test controls. happy-dom's keeps its callback behind a WeakRef to a closure nothing else
 * holds, so once the garbage collector runs (more likely on a busy machine) it silently stops reporting and the
 * hook never hears about the change. The hook's contract is "re-read the scheme when told <html> changed", so the
 * test tells it, deterministically.
 */
const observers = new Set<{ callback: MutationCallback }>();
const realMutationObserver = globalThis.MutationObserver;

function stubMutationObserver(): void {
  globalThis.MutationObserver = class {
    private entry: { callback: MutationCallback };
    constructor(callback: MutationCallback) { this.entry = { callback }; }
    observe() { observers.add(this.entry); }
    disconnect() { observers.delete(this.entry); }
    takeRecords() { return []; }
  } as unknown as typeof MutationObserver;
}

/** Changes <html> and notifies the observers, as the browser does after the change. */
async function mutateRoot(change: () => void): Promise<void> {
  await act(async () => {
    change();
    for (const o of [...observers]) o.callback([], undefined as never);
  });
}

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
    await mutateRoot(() => document.documentElement.setAttribute('data-theme', 'sepia'));
    expect(text(container!)).toBe('light');
  });

  it('updates when data-theme changes', async () => {
    const c = await mount();
    await mutateRoot(() => document.documentElement.setAttribute('data-theme', 'light'));
    expect(text(c)).toBe('light');
  });
});

describe('useTheme with the theme stylesheet', () => {
  it('reports the scheme the CSS resolves, so a theme or skin preference counts', async () => {
    // Loft prefers light: with data-theme unset the CSS resolves light although the OS is dark.
    resolveInCss('light');
    expect(text(await mount())).toBe('light');
    await mutateRoot(() => resolveInCss('dark'));
    expect(text(container!)).toBe('dark');
  });
});

describe('useTheme on the server', () => {
  it('renders dark, the documented server default', () => {
    expect(renderToString(<Probe />)).toContain('dark');
  });
});
