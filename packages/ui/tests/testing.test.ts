// @vitest-environment happy-dom
// `@voidable/ui/testing`: the readiness watcher and the animation switch, on
// stand-in elements that finish their first update when told to.
import { afterEach, describe, expect, it } from 'vitest';
import { setAnimations, startReadiness, stopReadiness, whenReady } from '../src/testing/index.js';

class Slow extends HTMLElement {
  hasUpdated = false;
  isUpdatePending = true;
  finish!: () => void;
  updateComplete = new Promise<boolean>((resolve) => {
    this.finish = () => {
      this.hasUpdated = true;
      this.isUpdatePending = false;
      resolve(true);
    };
  });
}
customElements.define('void-slow', Slow);

const html = document.documentElement;
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

afterEach(() => {
  stopReadiness();
  document.body.innerHTML = '';
  html.removeAttribute('data-anim-speed');
});

describe('whenReady', () => {
  it('resolves at once for a page with no void elements, and ignores CSS-only parts', async () => {
    document.body.innerHTML = '<void-card-body>never defined</void-card-body>';
    await whenReady();
  });

  it('waits for the first update of every defined element', async () => {
    document.body.innerHTML = '<void-slow></void-slow>';
    const el = document.querySelector('void-slow') as Slow;
    let done = false;
    void whenReady().then(() => (done = true));
    await tick();
    expect(done).toBe(false);
    el.finish();
    await tick();
    expect(done).toBe(true);
  });

  it('rejects, naming what is missing, when the timeout passes', async () => {
    document.body.innerHTML = '<void-slow></void-slow>';
    await expect(whenReady(document, { timeout: 30 })).rejects.toThrow(/timed out after 30 ms waiting for 1 element\(s\) to finish rendering \(<void-slow>\)/);
  });

  it('waits for a tag named in expect to be defined', async () => {
    let done = false;
    void whenReady(document, { expect: ['void-later'] }).then(() => (done = true));
    await tick();
    expect(done).toBe(false);
    customElements.define('void-later', class extends HTMLElement {});
    await tick();
    expect(done).toBe(true);
  });
});

describe('data-void-ready', () => {
  it('is set when the page is ready and cleared while an added element renders', async () => {
    startReadiness();
    await tick();
    expect(html.hasAttribute('data-void-ready')).toBe(true);
    document.body.insertAdjacentHTML('beforeend', '<div><void-slow></void-slow></div>');
    await tick();
    expect(html.hasAttribute('data-void-ready')).toBe(false);
    (document.querySelector('void-slow') as Slow).finish();
    await tick();
    expect(html.hasAttribute('data-void-ready')).toBe(true);
  });

  it('ignores elements that are not void-*', async () => {
    startReadiness();
    await tick();
    document.body.insertAdjacentHTML('beforeend', '<p>text</p>');
    await tick();
    expect(html.hasAttribute('data-void-ready')).toBe(true);
  });

  it('is removed when the watcher stops', async () => {
    startReadiness();
    await tick();
    stopReadiness();
    expect(html.hasAttribute('data-void-ready')).toBe(false);
  });
});

describe('setAnimations', () => {
  it('sets data-anim-speed="off" and removes it again', () => {
    setAnimations(false);
    expect(html.getAttribute('data-anim-speed')).toBe('off');
    setAnimations(true);
    expect(html.hasAttribute('data-anim-speed')).toBe(false);
  });
});
