import { Injectable, signal, DestroyRef, inject } from '@angular/core';

type Theme = 'dark' | 'light';

function getCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(getCurrentTheme());

  private observer: MutationObserver | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (typeof document !== 'undefined') {
      this.observer = new MutationObserver(() => {
        this.theme.set(getCurrentTheme());
      });
      this.observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }
    destroyRef.onDestroy(() => this.observer?.disconnect());
  }
}
