// Type-level test for @voidable/ui/types/solid. Compiled (not run) by
// `pnpm typecheck` against the generated dist/types after a build.
import type {} from '@voidable/ui/types/solid';
import type { BarChartData } from '@voidable/ui/components/bar-chart';

const data: BarChartData = { series: [{ name: 'A', values: [1, 2, 3] }], labels: ['x', 'y', 'z'] };

export const ok = (
  <div>
    <void-button
      variant="filled"
      color="error"
      size="lg"
      disabled
      class="cta"
      on:void-click={(event) => {
        const e: CustomEvent = event;
        void e;
      }}
    >
      Save
    </void-button>
    <void-input
      on:void-change={(event) => {
        const value: string = event.detail.value;
        void value;
      }}
    />
    <void-bar-chart data={data} prop:showValue height={240} variant="outline" stagger={30} />
    <void-bar-chart prop:data={data} attr:height="240" bool:show-value={true} />
    <void-toggle-group>
      <void-toggle value="a">A</void-toggle>
    </void-toggle-group>
    <void-menu
      on:void-select={(event) => {
        const value: string = event.detail.value;
        void value;
      }}
    />
  </div>
);

// @ts-expect-error: 'huge' is not a valid size
export const badSize = <void-button size="huge" />;
// @ts-expect-error: a plain camelCase name is lowercased by the Solid compiler and never reaches the element; use prop:showValue
export const plainCamel = <void-bar-chart showValue />;
// @ts-expect-error: height is a number
export const badHeight = <void-bar-chart height="tall" />;
// @ts-expect-error: data must be BarChartData
export const badData = <void-bar-chart data={[1, 2, 3]} />;
// @ts-expect-error: prop:data is typed like data
export const badPropData = <void-bar-chart prop:data={[1, 2, 3]} />;
export const badDetail = (
  <void-input
    on:void-change={(event) => {
      // @ts-expect-error: detail.value is a string
      const n: number = event.detail.value;
      void n;
    }}
  />
);
