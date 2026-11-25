// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createAutoloader, type Autoloader } from '../src/autoloader-core.js';

let counter = 0;
/** A unique tag so tests never see each other's definitions. */
const tag = (name: string) => `void-al-${name}-${++counter}`;

function define(name: string, connected?: (el: HTMLElement) => void) {
  customElements.define(
    name,
    class extends HTMLElement {
      connectedCallback() {
        connected?.(this);
      }
    },
  );
}

let active: Autoloader | undefined;
afterEach(() => {
  active?.stop();
  active = undefined;
  document.body.innerHTML = '';
});

function setup(tags: Record<string, string>, loaders: Record<string, () => Promise<unknown>>, onError?: () => void) {
  active = createAutoloader({ tags, modules: loaders, onError });
  active.start();
  return active;
}

describe('autoloader', () => {
  it('loads nothing when the page has no known tag', async () => {
    const a = tag('a');
    const load = vi.fn(async () => define(a));
    const loader = setup({ [a]: 'a' }, { a: load });
    document.body.innerHTML = '<div><p>hello</p><void-unrelated></void-unrelated></div>';
    await loader.ready();
    expect(load).not.toHaveBeenCalled();
  });

  it('scans the document on start and loads only the tags present', async () => {
    const a = tag('a');
    const b = tag('b');
    document.body.innerHTML = `<section><${a}></${a}></section>`;
    const loadA = vi.fn(async () => define(a));
    const loadB = vi.fn(async () => define(b));
    const loader = setup({ [a]: 'a', [b]: 'b' }, { a: loadA, b: loadB });
    await loader.ready();
    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).not.toHaveBeenCalled();
    expect(customElements.get(a)).toBeDefined();
    expect([...loader.loaded]).toEqual(['a']);
  });

  it('loads a tag added later, nested in inserted markup', async () => {
    const a = tag('a');
    const load = vi.fn(async () => define(a));
    const loader = setup({ [a]: 'a' }, { a: load });
    const host = document.createElement('div');
    host.innerHTML = `<div><ul><li><${a}></${a}></li></ul></div>`;
    document.body.append(host);
    await loader.ready();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads a tag when the inserted node is the element itself', async () => {
    const a = tag('a');
    const load = vi.fn(async () => define(a));
    const loader = setup({ [a]: 'a' }, { a: load });
    document.body.append(document.createElement(a));
    await loader.ready();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('imports a module once however many elements and tags use it', async () => {
    const a = tag('a');
    const b = tag('b');
    const load = vi.fn(async () => {
      define(a);
      define(b);
    });
    const loader = setup({ [a]: 'm', [b]: 'm' }, { m: load });
    document.body.innerHTML = `<${a}></${a}><${a}></${a}><${b}></${b}>`;
    await loader.ready();
    document.body.insertAdjacentHTML('beforeend', `<${b}></${b}>`);
    await loader.ready();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('skips a tag that is already defined (full bundle loaded first)', async () => {
    const a = tag('a');
    define(a);
    const load = vi.fn(async () => undefined);
    const loader = setup({ [a]: 'a' }, { a: load });
    document.body.innerHTML = `<${a}></${a}>`;
    await loader.ready();
    expect(load).not.toHaveBeenCalled();
  });

  it('follows dependencies: a component that renders another tag loads that module too', async () => {
    const parent = tag('parent');
    const child = tag('child');
    const loadChild = vi.fn(async () => define(child));
    const loader = setup(
      { [parent]: 'parent', [child]: 'child' },
      {
        parent: async () =>
          define(parent, (el) => {
            // Rendered on a microtask, as Lit does.
            queueMicrotask(() => el.append(document.createElement(child)));
          }),
        child: loadChild,
      },
    );
    document.body.innerHTML = `<${parent}></${parent}>`;
    await loader.ready();
    expect(loadChild).toHaveBeenCalledTimes(1);
    expect(customElements.get(child)).toBeDefined();
  });

  it('ready() waits for slow loads and resolves after every tag is defined', async () => {
    const a = tag('a');
    const b = tag('b');
    const loader = setup(
      { [a]: 'a', [b]: 'b' },
      {
        a: () => new Promise((r) => setTimeout(r, 20)).then(() => define(a)),
        b: () => new Promise((r) => setTimeout(r, 5)).then(() => define(b)),
      },
    );
    document.body.innerHTML = `<${a}></${a}><${b}></${b}>`;
    await loader.ready();
    expect(customElements.get(a)).toBeDefined();
    expect(customElements.get(b)).toBeDefined();
  });

  it('ready() resolves immediately when nothing is pending', async () => {
    const loader = setup({}, {});
    await expect(loader.ready()).resolves.toBeUndefined();
  });

  it('reports a failed module, still resolves ready(), and retries when the tag appears again', async () => {
    const a = tag('a');
    const onError = vi.fn();
    let attempts = 0;
    const loader = setup(
      { [a]: 'a' },
      {
        a: async () => {
          if (++attempts === 1) throw new Error('offline');
          define(a);
        },
      },
      onError,
    );
    document.body.innerHTML = `<${a}></${a}>`;
    await loader.ready();
    expect(onError).toHaveBeenCalledWith('a', expect.any(Error));
    expect(loader.failed.has('a')).toBe(true);
    expect(customElements.get(a)).toBeUndefined();

    document.body.insertAdjacentHTML('beforeend', `<${a}></${a}>`);
    await loader.ready();
    expect(attempts).toBe(2);
    expect(loader.failed.has('a')).toBe(false);
    expect(customElements.get(a)).toBeDefined();
  });

  it('reports a tag with no loader as a failure rather than throwing', async () => {
    const a = tag('a');
    const onError = vi.fn();
    const loader = setup({ [a]: 'missing' }, {}, onError);
    document.body.innerHTML = `<${a}></${a}>`;
    await loader.ready();
    expect(onError).toHaveBeenCalledWith('missing', expect.any(Error));
  });

  it('ignores names that only exist on Object.prototype', async () => {
    const loader = setup({}, {});
    document.body.append(document.createElement('constructor'), document.createElement('tostring'));
    await expect(loader.ready()).resolves.toBeUndefined();
    expect(loader.failed.size).toBe(0);
  });

  it('stops watching after stop()', async () => {
    const a = tag('a');
    const load = vi.fn(async () => define(a));
    const loader = setup({ [a]: 'a' }, { a: load });
    loader.stop();
    document.body.innerHTML = `<${a}></${a}>`;
    await new Promise((r) => setTimeout(r, 10));
    expect(load).not.toHaveBeenCalled();
  });

  it('start() twice does not double-load', async () => {
    const a = tag('a');
    document.body.innerHTML = `<${a}></${a}>`;
    const load = vi.fn(async () => define(a));
    const loader = setup({ [a]: 'a' }, { a: load });
    loader.start();
    await loader.ready();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('observe() also watches a subtree outside the document', async () => {
    const a = tag('a');
    const load = vi.fn(async () => define(a));
    const loader = setup({ [a]: 'a' }, { a: load });
    const detached = document.createElement('div');
    loader.observe(detached);
    detached.innerHTML = `<${a}></${a}>`;
    await loader.ready();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
