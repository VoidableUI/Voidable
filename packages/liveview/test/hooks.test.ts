import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoidHooks, buildPayload } from '../src/hooks.js';

function mountHook(html: string) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const el = tpl.content.firstElementChild as HTMLElement;
  document.body.appendChild(el);

  const hook: any = {
    el,
    pushEvent: vi.fn(),
    pushEventTo: vi.fn(),
  };
  Object.assign(hook, VoidHooks.VoidEvent);
  hook.mounted();
  return { el, hook };
}

describe('VoidEvent hook', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pushes the event with element context alongside detail', () => {
    const { el, hook } = mountHook(
      '<void-input id="email" name="email" phx-hook="VoidEvent" data-void-events="void-change"></void-input>',
    );

    el.dispatchEvent(new CustomEvent('void-change', { detail: { value: 'a@b.c' } }));
    vi.runAllTimers();

    expect(hook.pushEvent).toHaveBeenCalledTimes(1);
    const [event, payload] = hook.pushEvent.mock.calls[0];
    expect(event).toBe('void-change');
    expect(payload).toMatchObject({
      id: 'email',
      name: 'email',
      event: 'void-change',
      detail: { value: 'a@b.c' },
      value: 'a@b.c',
    });
  });

  it('honours phx-target via pushEventTo', () => {
    const { el, hook } = mountHook(
      '<void-button id="b" phx-target="3" phx-hook="VoidEvent" data-void-events="void-click"></void-button>',
    );

    el.dispatchEvent(new CustomEvent('void-click'));
    vi.runAllTimers();

    expect(hook.pushEvent).not.toHaveBeenCalled();
    expect(hook.pushEventTo).toHaveBeenCalledWith('3', 'void-click', expect.objectContaining({ id: 'b' }));
  });

  it('detaches listeners on destroy', () => {
    const { el, hook } = mountHook(
      '<void-button id="b" phx-hook="VoidEvent" data-void-events="void-click"></void-button>',
    );
    hook.destroyed();
    el.dispatchEvent(new CustomEvent('void-click'));
    vi.runAllTimers();
    expect(hook.pushEvent).not.toHaveBeenCalled();
  });

  it('pushes after the DOM event that caused it, so phx-* bindings on the element run first', () => {
    const { el, hook } = mountHook(
      '<void-button id="b" phx-click="count" phx-hook="VoidEvent" data-void-events="void-click"></void-button>',
    );
    const order: string[] = [];
    hook.pushEvent.mockImplementation((name: string) => order.push(name));
    // LiveView's phx-click listener sits on window, after the element's own handlers.
    const onWindow = () => order.push('phx-click');
    window.addEventListener('click', onWindow);
    el.addEventListener('click', () => el.dispatchEvent(new CustomEvent('void-click')));
    el.click();
    window.removeEventListener('click', onWindow);
    expect(order).toEqual(['phx-click']);
    vi.runAllTimers();
    expect(order).toEqual(['phx-click', 'void-click']);
  });

  it('drops a push still waiting when the hook is destroyed, and handles a rejected push', async () => {
    const { el, hook } = mountHook(
      '<void-button id="b" phx-hook="VoidEvent" data-void-events="void-click"></void-button>',
    );
    hook.pushEvent.mockReturnValue(Promise.reject(new Error('unable to push hook event. LiveView not connected')));
    el.dispatchEvent(new CustomEvent('void-click'));
    vi.runAllTimers();
    expect(hook.pushEvent).toHaveBeenCalledTimes(1);
    el.dispatchEvent(new CustomEvent('void-click'));
    hook.destroyed();
    vi.runAllTimers();
    expect(hook.pushEvent).toHaveBeenCalledTimes(1);
  });
});

describe('VoidProps hook', () => {
  function mountProps(html: string) {
    document.body.insertAdjacentHTML('beforeend', html);
    const el = document.body.lastElementChild as HTMLElement;
    const hook: any = { el, pushEvent: vi.fn(), pushEventTo: vi.fn() };
    Object.assign(hook, VoidHooks.VoidProps);
    hook.mounted();
    return { el: el as any, hook };
  }

  afterEach(() => (document.body.innerHTML = ''));

  it('assigns each property in data-void-props to the element', () => {
    class Probe extends HTMLElement {}
    if (!customElements.get('void-props-probe')) customElements.define('void-props-probe', Probe);
    const { el } = mountProps(
      `<void-props-probe id="p" data-void-props='{"data":{"segments":[{"name":"a","value":1}]},"zones":[1]}'></void-props-probe>`,
    );
    expect(el.data).toEqual({ segments: [{ name: 'a', value: 1 }] });
    expect(el.zones).toEqual([1]);
  });

  it('waits for the element to be defined, and reassigns only when the JSON changes', async () => {
    class Late extends HTMLElement {
      calls: unknown[] = [];
      set data(v: unknown) {
        this.calls.push(v);
      }
    }
    customElements.define('void-props-late', Late);
    // The element looks undefined when the hook mounts (the class loads after the page).
    vi.spyOn(customElements, 'get').mockReturnValueOnce(undefined);
    const { el, hook } = mountProps(`<void-props-late id="l" data-void-props='{"data":{"n":1}}'></void-props-late>`);
    expect(el.calls).toEqual([]);
    await customElements.whenDefined('void-props-late');
    await Promise.resolve();
    expect(el.calls).toEqual([{ n: 1 }]);
    hook.updated();
    expect(el.calls).toHaveLength(1);
    el.dataset.voidProps = '{"data":{"n":2}}';
    hook.updated();
    expect(el.calls).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it('ignores malformed JSON', () => {
    const { el } = mountProps(`<void-props-probe id="m" data-void-props='{nope'></void-props-probe>`);
    expect(el.data).toBeUndefined();
  });
});

describe('buildPayload', () => {
  it('handles missing or non-object detail', () => {
    const el = document.createElement('void-button');
    expect(buildPayload(el, 'void-click', undefined)).toMatchObject({ id: null, name: null, detail: {} });
    expect(buildPayload(el, 'void-click', 5)).toMatchObject({ detail: 5 });
  });

  it('takes the name of the native select inside a void-select (#52)', () => {
    const el = document.createElement('void-select');
    el.innerHTML = '<select name="plan"><option value="a">A</option></select>';
    expect(buildPayload(el, 'void-change', { value: 'a' })).toMatchObject({ name: 'plan', value: 'a' });
  });
});
