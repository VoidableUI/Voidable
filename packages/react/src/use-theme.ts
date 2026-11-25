import { useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';

/**
 * What the server renders, and what the first client render of a hydrating tree uses (React then re-renders with
 * the real value, so there is no hydration mismatch). The server cannot know the visitor's operating system.
 */
const SERVER_THEME: Theme = 'dark';

const LIGHT_QUERY = '(prefers-color-scheme: light)';

/** Attributes that can change which scheme the theme resolves: the choice, a theme, a skin, or a rule keyed on them. */
const WATCHED = ['data-theme', 'data-void-theme', 'data-void-skin', 'class', 'style'];

/**
 * The scheme the page is in. The theme stylesheet resolves it in CSS (an explicit `data-theme`, including
 * `system`, then the scheme a theme or skin prefers, then the operating system) and exposes the result as the
 * `--void-color-scheme` custom property, so it is read from there. Without the theme stylesheet it falls back to
 * `data-theme`, then the operating system.
 */
function getSnapshot(): Theme {
  if (typeof document === 'undefined') return SERVER_THEME;
  const root = document.documentElement;
  const resolved = getComputedStyle(root).getPropertyValue('--void-color-scheme').trim();
  if (resolved === 'light' || resolved === 'dark') return resolved;
  const attr = root.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  const light = typeof matchMedia === 'function' && matchMedia(LIGHT_QUERY).matches;
  return light ? 'light' : 'dark';
}

function getServerSnapshot(): Theme {
  return SERVER_THEME;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {};

  let observer: MutationObserver | undefined;
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(onStoreChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: WATCHED });
  }
  const media = typeof matchMedia === 'function' ? matchMedia(LIGHT_QUERY) : undefined;
  media?.addEventListener('change', onStoreChange);

  return () => {
    observer?.disconnect();
    media?.removeEventListener('change', onStoreChange);
  };
}

/**
 * The colour scheme in force, `'dark'` or `'light'`: what the page actually shows, not just the attribute. With
 * `<html data-theme>` unset or `"system"` it follows the theme or skin's preferred scheme (Loft prefers light)
 * and otherwise the operating system. It updates when the attribute or the operating system preference changes.
 * During server rendering (and the first render of a hydrating tree) it is `'dark'`. It is read-only: change the
 * scheme by setting `data-theme` on `<html>`.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
