/**
 * Turbo morph integration to preserve client-managed attributes on `VOID-*`
 * elements during page morphs.
 *
 * Usage:
 * ```js
 * import { VoidTurbo } from '@voidable/ui-hotwire';
 * VoidTurbo.start();
 * ```
 */

const PRESERVE_ATTRS = [
  'aria-expanded',
  'aria-selected',
  'aria-checked',
  'aria-hidden',
  'open',
  'active',
  'checked',
  'selected',
];

export const VoidTurbo = {
  start(): void {
    document.addEventListener('turbo:before-morph-attribute', ((
      event: CustomEvent<{ attributeName: string }>
    ) => {
      const target = event.target as Element;
      if (!target.tagName?.startsWith('VOID-')) return;

      if (PRESERVE_ATTRS.includes(event.detail.attributeName)) {
        event.preventDefault();
      }
    }) as EventListener);
  },
};
