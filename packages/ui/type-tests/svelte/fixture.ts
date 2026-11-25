// Type-level test for @voidable/ui/types/svelte. Compiled (not run) by
// `pnpm typecheck` against the generated dist/types after a build.
//
// Svelte templates are checked by svelte-check through svelte2tsx, which
// resolves element attributes from `SvelteHTMLElements[tag]`. Checking object
// literals against that same type exercises the augmentation without needing
// a .svelte compiler in this package.
import type {} from '@voidable/ui/types/svelte';
import type { SvelteHTMLElements } from 'svelte/elements';
import type { BarChartData } from '@voidable/ui/components/bar-chart';

type Attrs<T extends keyof SvelteHTMLElements> = SvelteHTMLElements[T];

const data: BarChartData = { series: [{ name: 'A', values: [1, 2, 3] }] };

export const button: Attrs<'void-button'> = {
  variant: 'filled',
  color: 'error',
  size: 'lg',
  disabled: true,
  class: 'cta',
  'onvoid-click': (event) => {
    const e: CustomEvent = event;
    void e;
  },
};

export const input: Attrs<'void-input'> = {
  'onvoid-change': (event) => {
    const value: string = event.detail.value;
    void value;
  },
};

export const chart: Attrs<'void-bar-chart'> = { data, height: 240, showValues: true, stagger: 30 };

export const toggle: Attrs<'void-toggle'> = { value: 'a', slot: 'start' };
export const menu: Attrs<'void-menu'> = {
  'onvoid-select': (event) => {
    const value: string = event.detail.value;
    void value;
  },
};

// @ts-expect-error: 'huge' is not a valid size
export const badSize: Attrs<'void-button'> = { size: 'huge' };
// @ts-expect-error: height is a number
export const badHeight: Attrs<'void-bar-chart'> = { height: 'tall' };
export const badDetail: Attrs<'void-input'> = {
  'onvoid-change': (event) => {
    // @ts-expect-error: detail.value is a string
    const n: number = event.detail.value;
    void n;
  },
};
