import { describe, it, expect, vi } from 'vitest';
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
  it('pushes the event with element context alongside detail', () => {
    const { el, hook } = mountHook(
      '<void-input id="email" name="email" phx-hook="VoidEvent" data-void-events="void-change"></void-input>',
    );

    el.dispatchEvent(new CustomEvent('void-change', { detail: { value: 'a@b.c' } }));

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

    expect(hook.pushEvent).not.toHaveBeenCalled();
    expect(hook.pushEventTo).toHaveBeenCalledWith('3', 'void-click', expect.objectContaining({ id: 'b' }));
  });

  it('applies data-void-closable as the closable property on mount and update', () => {
    const { el, hook } = mountHook(
      '<void-dialog id="d" data-void-closable="false" phx-hook="VoidEvent" data-void-events="void-close"></void-dialog>',
    );
    expect((el as any).closable).toBe(false);

    el.dataset.voidClosable = 'true';
    hook.updated();
    expect((el as any).closable).toBe(true);
  });

  it('detaches listeners on destroy', () => {
    const { el, hook } = mountHook(
      '<void-button id="b" phx-hook="VoidEvent" data-void-events="void-click"></void-button>',
    );
    hook.destroyed();
    el.dispatchEvent(new CustomEvent('void-click'));
    expect(hook.pushEvent).not.toHaveBeenCalled();
  });
});

describe('buildPayload', () => {
  it('handles missing or non-object detail', () => {
    const el = document.createElement('void-button');
    expect(buildPayload(el, 'void-click', undefined)).toMatchObject({ id: null, name: null, detail: {} });
    expect(buildPayload(el, 'void-click', 5)).toMatchObject({ detail: 5 });
  });
});
