import type { PartsController } from './parts.js';

/**
 * How closed content of a disclosure (collapsible, accordion item) is hidden.
 *
 * The theme already hides it from the host's own `open` attribute (a collapsed
 * grid row and `visibility: hidden`), which is all a browser without
 * `hidden="until-found"` needs and all that shows before the script loads. Where
 * the browser supports `hidden="until-found"` (Chrome and Edge 102, Firefox 148;
 * not yet Safari), the content part also carries that attribute while it is
 * closed:
 *
 * - it is `content-visibility: hidden`, so it is out of the accessibility tree
 *   and the tab order, as `display: none` would be, and
 * - find-in-page, a text fragment or an in-page link to something inside it
 *   fires `beforematch` on it first, which the component answers by opening.
 *
 * The attribute is only put on after the closing animation has finished (it
 * would cut the content off at the first frame), and taken off the moment the
 * disclosure opens. It goes through the parts controller, so a server morph
 * keeps it, and it is taken off again if the part is removed.
 */
export function supportsUntilFound(): boolean {
  return typeof HTMLElement !== 'undefined' && 'onbeforematch' in HTMLElement.prototype;
}

export class ClosedContent {
  private _pass = 0;

  constructor(
    private readonly _host: HTMLElement,
    private readonly _parts: PartsController,
  ) {}

  /** Brings the content part's `hidden` attribute in line with `open` (call it from the component's wiring). */
  sync(content: HTMLElement | null, open: boolean): void {
    const pass = ++this._pass;
    if (!content) return;
    if (open || !supportsUntilFound()) {
      this._parts.set(content, 'hidden', null);
      return;
    }
    const settle = (): void => {
      if (pass === this._pass && content.isConnected) this._parts.set(content, 'hidden', 'until-found');
    };
    // Reading the animations flushes style, so a transition that this change started exists by now.
    const running =
      typeof this._host.getAnimations === 'function'
        ? [...this._host.getAnimations(), ...content.getAnimations()].filter(a => 'transitionProperty' in a && a.playState === 'running')
        : [];
    if (running.length === 0) settle();
    else void Promise.allSettled(running.map(a => a.finished)).then(settle);
  }
}
