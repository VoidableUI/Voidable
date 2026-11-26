// Type-level test for @voidable/ui/types/solid2. Compiled (not run) by
// `pnpm typecheck` against the generated dist/types after a build.
import type {} from '@voidable/ui/types/solid2';
import type { BarChartData } from '@voidable/ui/components/bar-chart';
import type { VoidElementEvents, VoidElementTagNameMap } from '@voidable/ui/types/elements';

const data: BarChartData = { series: [{ name: 'A', values: [1, 2, 3] }], labels: ['x', 'y', 'z'] };

// Solid 2 has no `on:`; a ref that calls addEventListener is the documented way.
function on<T extends keyof VoidElementEvents & keyof VoidElementTagNameMap, K extends keyof VoidElementEvents[T] & string>(
  _tag: T,
  type: K,
  handler: (event: VoidElementEvents[T][K]) => void,
) {
  return (el: VoidElementTagNameMap[T]) => el.addEventListener(type, handler as EventListener);
}

export const ok = (
  <div>
    <void-button variant="filled" color="error" size="lg" disabled class="cta" ref={on('void-button', 'void-click', () => {})}>
      Save
    </void-button>
    <void-input
      value="x"
      ref={on('void-input', 'void-change', (event) => {
        const value: string = event.detail.value;
        void value;
      })}
    />
    <void-bar-chart prop:data={data} prop:showValue height={240} variant="outline" stagger={30} />
  </div>
);

// @ts-expect-error: 'huge' is not a valid size
export const badSize = <void-button size="huge" />;
// @ts-expect-error: a plain camelCase name is lowercased by the Solid compiler and never reaches the element; use prop:showValue
export const plainCamel = <void-bar-chart showValue />;
// @ts-expect-error: height is a number
export const badHeight = <void-bar-chart height="tall" />;
// @ts-expect-error: object properties are `prop:` only in Solid 2 (a plain attribute would be stringified)
export const plainData = <void-bar-chart data={data} />;
// @ts-expect-error: prop:data is typed like data
export const badPropData = <void-bar-chart prop:data={[1, 2, 3]} />;
// @ts-expect-error: unknown property
export const badName = <void-input vlaue="x" />;
export const badDetail = (
  <void-input
    ref={on('void-input', 'void-change', (event) => {
      // @ts-expect-error: detail.value is a string
      const n: number = event.detail.value;
      void n;
    })}
  />
);
