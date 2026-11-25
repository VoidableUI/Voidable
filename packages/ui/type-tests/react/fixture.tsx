// Type-level test for @voidable/ui/types/react. Compiled (not run) by
// `pnpm typecheck` against the generated dist/types after a build.
import type {} from '@voidable/ui/types/react';
import type { BarChartData } from '@voidable/ui/components/bar-chart';

const data: BarChartData = { series: [{ name: 'A', values: [1, 2, 3] }], labels: ['x', 'y', 'z'] };

export const ok = (
  <div>
    <void-button
      variant="filled"
      color="error"
      size="lg"
      disabled
      className="cta"
      onvoid-click={(event) => {
        const e: CustomEvent = event;
        void e;
      }}
    >
      Save
    </void-button>
    <void-input
      onvoid-change={(event) => {
        const value: string = event.detail.value;
        void value;
      }}
    />
    <void-bar-chart data={data} height={240} showValues variant="outline" stagger={30} />
    {/* React 19 passes `class` through to custom elements. */}
    <void-badge class="pill">New</void-badge>
    {/* Attribute read by the parent group (cem/supplement.js). */}
    <void-toggle-group>
      <void-toggle value="a">A</void-toggle>
    </void-toggle-group>
    {/* Bubbling child event typed on the parent (cem/supplement.js). */}
    <void-menu
      onvoid-select={(event) => {
        const value: string = event.detail.value;
        void value;
      }}
    />
    <void-dropdown-menu
      onvoid-select={(event) => {
        const item: HTMLElement = event.detail.item;
        void item;
      }}
    />
  </div>
);

// @ts-expect-error: 'huge' is not a valid size
export const badSize = <void-button size="huge" />;
// @ts-expect-error: height is a number
export const badHeight = <void-bar-chart height="tall" />;
// @ts-expect-error: data must be BarChartData
export const badData = <void-bar-chart data={[1, 2, 3]} />;
export const badDetail = (
  <void-input
    onvoid-change={(event) => {
      // @ts-expect-error: detail.value is a string
      const n: number = event.detail.value;
      void n;
    }}
  />
);
