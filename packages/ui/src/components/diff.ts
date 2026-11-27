import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { msg, nameHost } from '../messages.js';
import { OverflowWatcher } from '../overflow.js';

const TITLE = 'void-diff-title';
const HUNK = 'void-diff-hunk';

/**
 * Unified diff of text or code for reviews, change histories and audit logs: added, removed and unchanged
 * lines, with the changed words marked inside a line.
 *
 * The application or the server computes the diff; this element only presents it. Write an optional
 * `<void-diff-title>` (the file name) and one `<void-diff-hunk>` per hunk, each holding an optional
 * `<void-diff-header>` (the `@@ -1,4 +1,5 @@` line) and one `<void-diff-line>` per line. A line's `kind` is
 * `add`, `del` or (the default) `context`; its `old` and `new` attributes are its line numbers, shown with
 * `line-numbers`. Inside a line, wrap the words that changed in native `<ins>` and `<del>`. The parts are
 * CSS-only and are never moved, so a diff of thousands of lines costs no script per line.
 *
 * Changes are not told by colour alone: an added line carries a `+` and a removed line a `−`, inserted words
 * are underlined and deleted words struck through. For assistive technology the marker of a changed line has
 * a text alternative ("added", "removed", from the messages, so in the language of the page), and `<ins>` and
 * `<del>` keep their native insertion and deletion semantics. Markers and line numbers are drawn by CSS, so
 * selecting and copying takes the text alone.
 *
 * While a line is wider than the diff, the element is in the tab order (`tabindex="0"`), so the arrow keys
 * scroll it; while everything fits, or with `wrap`, it is not.
 */
export class VoidDiff extends VoidElement {
  /** Show the `old` and `new` line numbers the lines carry, in two columns before the marker. */
  @property({ type: Boolean, reflect: true, attribute: 'line-numbers' }) lineNumbers = false;
  /** Wrap long lines instead of scrolling sideways. */
  @property({ type: Boolean, reflect: true }) wrap = false;

  protected readonly _parts = new PartsController(this, {
    // Lines are not listed: nothing is written on them, and a diff may hold thousands.
    tags: [TITLE, HUNK],
    onChange: () => this._wire(),
  });

  private readonly _overflow = new OverflowWatcher(() => this._wire());

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._overflow.stop();
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    // The text alternatives of the + and − markers, as CSS strings read by `content` in diff.css.
    this.setHostStyle('--_void-diff-added', JSON.stringify(msg(this, 'diff.added'))); // style-ok
    this.setHostStyle('--_void-diff-removed', JSON.stringify(msg(this, 'diff.removed'))); // style-ok
    this._wire();
  }

  private _wire(): void {
    if (!this.isConnected) return;
    const set = (name: string, value: string | null): void => this.setHostAttribute(name, value);
    const title = this._parts.one(TITLE);

    // A titled diff is a group named by its title; a name the author wrote wins.
    const named = this.hasAttribute('aria-label');
    nameHost(this, title && !named ? this._parts.id(title, TITLE) : null, set, 'aria-labelledby');
    nameHost(this, named || this.hasAttribute('aria-labelledby') ? 'group' : null, set, 'role');

    // The element is the scroller: a tab stop only while there is something to scroll to. Every hunk is as
    // wide as the widest line, so one of them tells when the content's width changes.
    this._overflow.watch(this, this._parts.one(HUNK));
    nameHost(this, this._overflow.overflowing ? '0' : null, set, 'tabindex');
  }
}

if (!customElements.get('void-diff')) {
  customElements.define('void-diff', VoidDiff);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-diff': VoidDiff;
  }
}
