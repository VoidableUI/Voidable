import type { LitElement } from 'lit';

/**
 * Chart elements animate via requestAnimationFrame and read
 * `--void-anim-scale` from computed style. Setting it to 0 makes the
 * element jump straight to its final state, so tests can assert on the
 * resting SVG instead of an in-flight animation frame.
 */
export function noAnimation(el: HTMLElement): void {
  el.style.setProperty('--void-anim-scale', '0');
}

/** Wait for Lit updates plus the rAF queued by connectedCallback / data setters. */
export async function settle(el: LitElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => setTimeout(r, 0));
  await el.updateComplete;
}

/** Create, configure (no animation), attach and settle a chart element. */
export async function mount<T extends LitElement>(
  tag: string,
  props: Record<string, unknown> = {},
): Promise<T> {
  const el = document.createElement(tag) as T;
  noAnimation(el);
  Object.assign(el, props);
  document.body.appendChild(el);
  await settle(el);
  return el;
}
