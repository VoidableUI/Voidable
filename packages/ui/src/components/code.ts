import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';
import { closeControlPressed } from '../dismiss.js';
import { msg, nameHost } from '../messages.js';
import { OverflowWatcher } from '../overflow.js';

const TITLE = 'void-code-title';
const COPY = 'void-code-copy';
const LINE = 'void-code-line';
/** How long the copy part carries `copied` after a copy. */
const COPIED_MS = 2000;

/**
 * Block of code for documentation, logs, configuration and command lines: monospace, scrolls sideways (or wraps),
 * optional line numbers, an optional title and an optional copy button.
 *
 * Write the code as a native `<pre><code>` inside it: the text itself, or one `<void-code-line>` per line when
 * you want line numbers (`line-numbers`). Before the `<pre>` come the optional parts: a `<void-code-title>` (a
 * file name or the language) and a `<void-code-copy>` wrapping the one button that copies the code. The
 * component renders nothing and never moves or rewrites what you wrote, so the markup is the same before and
 * after the script loads and survives a morph or a re-render.
 *
 * No syntax highlighter is included. Highlight on the server or with any library and put the result inside the
 * `<code>` (or inside each line): the spans, and the classes your highlighter's stylesheet colours, are left as
 * they are, and copying takes the text without them.
 *
 * While the code is wider than the block, the `<pre>` is in the tab order (`tabindex="0"`), so the arrow keys
 * scroll it; while it fits, or with `wrap`, it is not. Line numbers are drawn by CSS counters, are not selected
 * or copied, and are hidden from assistive technology.
 *
 * @fires {CustomEvent<{ value: string }>} void-copy - The code was copied to the clipboard (the copy button, or
 *   `copy()`). `detail.value` is the text that was copied.
 */
export class VoidCode extends VoidElement {
  /**
   * Number the lines. Needs one `<void-code-line>` per line inside the `<code>`; counting starts at 1, and a
   * line's own `number` attribute replaces what is shown for it (an excerpt that starts at line 40).
   */
  @property({ type: Boolean, reflect: true, attribute: 'line-numbers' }) lineNumbers = false;
  /** Wrap long lines instead of scrolling sideways. */
  @property({ type: Boolean, reflect: true }) wrap = false;

  protected readonly _parts = new PartsController(this, {
    // `pre` and `code` are not parts, but the component follows them when they are replaced.
    tags: [TITLE, COPY, 'pre', 'code'],
    onChange: () => this._wire(),
  });

  private readonly _overflow = new OverflowWatcher(() => this._parts.sync());
  private _copied = false;
  private _copiedTimer: ReturnType<typeof setTimeout> | null = null;
  private _live: HTMLElement | null = null;

  /** The code as plain text: the lines joined by newlines, or the text of the `<pre>` without its last newline. */
  get text(): string {
    const lines = this.querySelectorAll(LINE);
    if (lines.length) return Array.from(lines, (l) => l.textContent ?? '').join('\n');
    const pre = this._pre;
    return (pre?.querySelector('code') ?? pre)?.textContent?.replace(/\r?\n$/, '') ?? '';
  }

  private get _pre(): HTMLElement | null {
    for (const pre of Array.from(this.querySelectorAll('pre'))) if (this._parts.owns(pre)) return pre;
    return null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
    this._overflow.stop();
    if (this._copiedTimer !== null) clearTimeout(this._copiedTimer);
    this._copiedTimer = null;
    this._copied = false;
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    // The language may have changed (the messages redraw the element).
    this._parts.sync();
  }

  private _wire(): void {
    const set = (name: string, value: string | null): void => this.setHostAttribute(name, value);
    const pre = this._pre;
    const title = this._parts.one(TITLE);
    const copy = this._parts.one(COPY);

    // A titled block is a group named by its title; a name the author wrote wins.
    const named = this.hasAttribute('aria-label');
    nameHost(this, title && !named ? this._parts.id(title, TITLE) : null, set, 'aria-labelledby');
    nameHost(this, named || this.hasAttribute('aria-labelledby') ? 'group' : null, set, 'role');

    // The copy control: named from the messages when it has no text and no name of its own.
    const control = copy?.firstElementChild ?? null;
    if (copy && control) {
      const own = control.textContent?.trim() !== '' || control.hasAttribute('aria-labelledby') || control.hasAttribute('title');
      nameHost(control, own ? null : msg(this, 'code.copy'), (name, value) => this._parts.set(control, name, value));
      this._parts.set(copy, 'copied', this._copied);
      this._ensureLive();
    }

    // The scroller is a tab stop only while there is something to scroll to.
    this._overflow.watch(pre, pre?.querySelector('code') ?? pre?.firstElementChild ?? null);
    if (pre && this._overflow.overflowing) this._parts.provide(pre, 'tabindex', '0');
  }

  private _onClick = (e: Event): void => {
    if (!closeControlPressed(this._parts.one(COPY), e)) return;
    void this.copy();
  };

  /**
   * Copies the code (`text`) to the clipboard, as the copy button does. Resolves to `true` when it was written;
   * then `void-copy` fires, the copy part carries `copied` for two seconds and "Copied" is announced.
   */
  async copy(): Promise<boolean> {
    const value = this.text;
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // No clipboard access (an insecure origin, a frame without permission): copy a selection instead.
      ok = this._copySelection();
    }
    if (!ok || !this.isConnected) return ok;
    this._copied = true;
    if (this._copiedTimer !== null) clearTimeout(this._copiedTimer);
    this._copiedTimer = setTimeout(() => {
      this._copiedTimer = null;
      this._copied = false;
      this._parts.sync();
    }, COPIED_MS);
    this._parts.sync();
    this._say(msg(this, 'code.copied'));
    this.dispatchEvent(new CustomEvent('void-copy', { bubbles: true, composed: true, detail: { value } }));
    return true;
  }

  /** Copies by selecting the code and asking the browser to copy the selection; the selection is put back. */
  private _copySelection(): boolean {
    const doc = this.ownerDocument;
    const target = this._pre;
    const selection = doc.getSelection?.();
    if (!target || !selection || typeof doc.execCommand !== 'function') return false;
    const before = Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i));
    const range = doc.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
    let ok = false;
    try {
      ok = doc.execCommand('copy');
    } catch {
      ok = false;
    }
    selection.removeAllRanges();
    for (const r of before) selection.addRange(r);
    return ok;
  }

  // ── Live region ───────────────────────────────────────────────────────────

  /** The server's markup has no live region: give it this one's, so a morph keeps the element (and what it said). */
  override voidBeforeMorph(incoming?: Element | null): boolean {
    const live = this._live;
    if (incoming && incoming !== this && live?.parentNode === this) {
      const has = Array.from(incoming.children).some((c) => c.getAttribute('data-void-announcer') === 'code');
      if (!has) incoming.append(live.cloneNode(true));
    }
    return super.voidBeforeMorph(incoming);
  }

  /** A visually hidden polite live region that exists before it has anything to say (the theme hides it). */
  private _ensureLive(): HTMLElement {
    let live = this._live;
    if (!live || live.parentNode !== this) {
      // Markup that was restored from a snapshot, or morphed, already has one: adopt it, never add a second.
      const found = Array.from(this.children).filter((c) => c.getAttribute('data-void-announcer') === 'code');
      for (const extra of found.slice(1)) extra.remove();
      if (found[0]) {
        this._live = found[0] as HTMLElement;
        return this._live;
      }
      live = this.ownerDocument.createElement('span');
      live.setAttribute('data-void-announcer', 'code');
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      this.append(live);
      this._live = live;
    }
    return live;
  }

  private _say(text: string): void {
    const live = this._ensureLive();
    // The same word twice is still news: a no-break space makes it a change.
    live.textContent = live.textContent === text ? `${text} ` : text;
  }
}

if (!customElements.get('void-code')) {
  customElements.define('void-code', VoidCode);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-code': VoidCode;
  }
}
