/**
 * Whether a box that scrolls sideways has anything to scroll to, kept current without measuring on a timer
 * or on connect (shared by the code block and the diff).
 *
 * A box that scrolls must be reachable from the keyboard while its content is wider than it, so the arrow
 * keys can scroll it (WCAG 2.1.1), and must stay out of the tab order while it is not: a page of short
 * snippets is not a page of tab stops. Chromium and Firefox make such a box focusable themselves; Safari does
 * not, so the components write `tabindex="0"` from this.
 *
 * One `ResizeObserver` watches the scroller (its own width changes with the page) and one element inside it
 * whose width follows the content. The observer reports after layout, so reading `scrollWidth` there forces
 * nothing, and the first report arrives before the first paint: there is no measuring in `connectedCallback`,
 * which on a page of many code blocks would be one forced layout each.
 */
export class OverflowWatcher {
  /** The scroller's content is wider than the scroller. */
  overflowing = false;
  private _observer: ResizeObserver | null = null;
  private _scroller: HTMLElement | null = null;
  private _content: Element | null = null;

  constructor(private readonly _onChange: () => void) {}

  /** Watches `scroller` and, inside it, `content` (either may be null: nothing overflows then). */
  watch(scroller: HTMLElement | null, content: Element | null): void {
    if (scroller === this._scroller && content === this._content) return;
    // Another scroller has not been measured yet (the observer reports it next); the caller is wiring now.
    if (scroller !== this._scroller) this.overflowing = false;
    this._scroller = scroller;
    this._content = content;
    this._observer?.disconnect();
    if (!scroller) {
      this._set(false);
      return;
    }
    if (typeof ResizeObserver === 'undefined') return;
    this._observer ??= new ResizeObserver(() => this.measure());
    this._observer.observe(scroller);
    if (content && content !== scroller) this._observer.observe(content);
  }

  /** Measures now (the observer calls this; it is public for an environment without one). */
  measure(): void {
    const el = this._scroller;
    this._set(!!el && el.isConnected && el.scrollWidth > el.clientWidth + 1);
  }

  stop(): void {
    this._observer?.disconnect();
    this._scroller = null;
    this._content = null;
  }

  private _set(value: boolean): void {
    if (value === this.overflowing) return;
    this.overflowing = value;
    this._onChange();
  }
}
