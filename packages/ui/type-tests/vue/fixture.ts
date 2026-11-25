// Type-level test for @voidable/ui/types/vue. Compiled (not run) by
// `pnpm typecheck` against the generated dist/types after a build.
//
// vue-tsc/Volar check `<void-button variant="filled" @void-click="...">` in
// templates against `InstanceType<GlobalComponents[tag]>` (`$props` for
// attributes, `$emit` for `@event` listeners). Checking against those same
// types exercises the augmentation without an SFC compiler in this package.
import type {} from '@voidable/ui/types/vue';
import type { GlobalComponents } from 'vue';
import type { BarChartData } from '@voidable/ui/components/bar-chart';

type Instance<T extends keyof GlobalComponents> = InstanceType<GlobalComponents[T]>;
type Props<T extends keyof GlobalComponents> = Instance<T>['$props'];

const data: BarChartData = { series: [{ name: 'A', values: [1, 2, 3] }] };

export const button: Props<'void-button'> = {
  variant: 'filled',
  color: 'error',
  size: 'lg',
  disabled: true,
  class: 'cta',
  onVoidClick: (event) => {
    const e: CustomEvent = event;
    void e;
  },
};

export const input: Props<'void-input'> = {
  onVoidChange: (event) => {
    const value: string = event.detail.value;
    void value;
  },
};

export const chart: Props<'void-bar-chart'> = { data, height: 240, showValues: true, stagger: 30 };

// Light-DOM children carry `slot`; the toggle `value` attribute is read by its group.
export const toggle: Props<'void-toggle'> = { value: 'a', slot: 'start' };
export const menu: Props<'void-menu'> = {
  onVoidSelect: (event) => {
    const value: string = event.detail.value;
    void value;
  },
};

// `@void-change` listeners are typed through $emit.
declare const inputEl: Instance<'void-input'>;
inputEl.$emit('void-change', new CustomEvent('void-change', { detail: { value: 'x' } }));
// @ts-expect-error: void-input does not emit void-bogus
inputEl.$emit('void-bogus', new CustomEvent('void-bogus'));

// The instance is still the element itself (template refs).
export const tag: string = inputEl.tagName;

// @ts-expect-error: 'huge' is not a valid size
export const badSize: Props<'void-button'> = { size: 'huge' };
// @ts-expect-error: height is a number
export const badHeight: Props<'void-bar-chart'> = { height: 'tall' };
export const badDetail: Props<'void-input'> = {
  onVoidChange: (event) => {
    // @ts-expect-error: detail.value is a string
    const n: number = event.detail.value;
    void n;
  },
};
