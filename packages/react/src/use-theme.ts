import { useSyncExternalStore, useCallback } from 'react';

type Theme = 'dark' | 'light';

function getTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return (document.documentElement.getAttribute('data-theme') as Theme) ?? 'light';
}

function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'data-theme') {
        onStoreChange();
        return;
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return () => observer.disconnect();
}

export function useTheme(): Theme {
  const getSnapshot = useCallback(getTheme, []);
  const getServerSnapshot = useCallback((): Theme => 'light', []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
