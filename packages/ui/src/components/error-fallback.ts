import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { MORPH_PARTICIPANTS, PartsController, type MorphParticipant } from '../parts.js';
import { msg } from '../messages.js';

const TAGS = ['void-error-fallback-title', 'void-error-fallback-description', 'void-error-fallback-actions'] as const;

/** Marks a part the component wrote itself (the built-in default), as opposed to one the author wrote. */
const DEFAULT = 'data-void-default';

/**
 * Error state display for failed data fetches and unexpected runtime errors; includes an optional retry action.
 *
 * Write it with parts: a `<void-error-fallback-title>`, an optional `<void-error-fallback-description>` and an
 * optional `<void-error-fallback-actions>` (buttons). The parts are never moved.
 *
 * It also has a built-in default for the common case. While the author writes no part, the component writes the
 * parts itself from `heading` (default `Something went wrong`), `message`, `retryable` and `retry-label`
 * (default `Try again`), and a click on its retry button fires `void-retry`. As soon as the author writes any
 * part, the component takes its own parts away and the attributes `heading`, `message`, `retryable` and
 * `retry-label` no longer apply: the author's parts replace the default, and the author's own buttons use their
 * own listeners.
 *
 * @fires {CustomEvent} void-retry - The built-in retry button was pressed (the element retries nothing itself).
 */
export class VoidErrorFallback extends VoidElement {
  /** Headline of the built-in default. Defaults to the `errorFallback.heading` message (English: `Something went wrong`). Ignored when the author writes parts. */
  @property({ type: String }) heading = '';
  /** Detail shown under the headline in the built-in default, such as what failed or what to try. Optional. */
  @property({ type: String }) message = '';
  /**
   * Show a retry button in the built-in default. Clicking it fires `void-retry`; the element does not retry
   * anything itself, so listen for the event and reload. Ignored when the author writes parts.
   */
  @property({ type: Boolean, reflect: true }) retryable = false;
  /** Text of the built-in retry button. Defaults to the `errorFallback.retry` message (English: `Try again`). Only used with `retryable`. */
  @property({ type: String, attribute: 'retry-label' }) retryLabel = '';
  /** Leave out the warning icon above the headline (it is drawn by default). */
  @property({ type: Boolean, attribute: 'hide-icon', reflect: true }) hideIcon = false;

  /** The built-in text last written, so a change of language rewrites it. */
  private _shown = '';

  protected readonly _parts = new PartsController(this, {
    tags: [...TAGS],
    onChange: () => this._wire(),
  });

  constructor() {
    super();
    const participant: MorphParticipant = {
      // A morph pairs the server's (empty) element with this one: give the incoming element the same default parts,
      // so the morph keeps them (and the focus on the retry button) instead of removing and rebuilding them.
      voidBeforeMorph: incoming => {
        if (this._authored().length) return;
        const defaults = Array.from(this.children).filter(c => c.hasAttribute(DEFAULT));
        if (!defaults.length || Array.from(incoming.children).some(c => TAGS.includes(c.localName as typeof TAGS[number]))) return;
        incoming.append(...defaults.map(c => c.cloneNode(true)));
      },
      isCopy: () => false,
    };
    const host = this as unknown as { [MORPH_PARTICIPANTS]?: MorphParticipant[] };
    (host[MORPH_PARTICIPANTS] ??= []).push(participant);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'alert');
    this.addEventListener('click', this._onClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    const shown = `${this.heading || msg(this, 'errorFallback.heading')}\n${this.retryLabel || msg(this, 'errorFallback.retry')}`;
    if (['heading', 'message', 'retryable', 'retryLabel'].some(k => changed.has(k)) || shown !== this._shown) {
      this._shown = shown;
      this._parts.sync();
    }
  }

  /** Parts the author wrote. */
  private _authored(): HTMLElement[] {
    return TAGS.flatMap(tag => this._parts.all(tag)).filter(el => !el.hasAttribute(DEFAULT));
  }

  /** Writes the built-in default while the author has written no part, and takes it away once there is one. */
  private _wire(): void {
    const own = (tag: string): HTMLElement | undefined => this._parts.all(tag).find(el => el.hasAttribute(DEFAULT));
    const keep = new Set<HTMLElement>();
    if (!this._authored().length) {
      const ensure = (tag: (typeof TAGS)[number], fill: (el: HTMLElement) => void): void => {
        let el = own(tag);
        if (!el) {
          el = document.createElement(tag);
          el.setAttribute(DEFAULT, '');
          this.append(el);
        }
        fill(el);
        keep.add(el);
      };
      ensure('void-error-fallback-title', el => {
        const heading = this.heading || msg(this, 'errorFallback.heading');
        if (el.textContent !== heading) el.textContent = heading;
      });
      if (this.message) {
        ensure('void-error-fallback-description', el => {
          if (el.textContent !== this.message) el.textContent = this.message;
        });
      }
      if (this.retryable) {
        ensure('void-error-fallback-actions', el => {
          let button = el.querySelector('button');
          if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            el.append(button);
          }
          const retry = this.retryLabel || msg(this, 'errorFallback.retry');
          if (button.textContent !== retry) button.textContent = retry;
        });
      }
      this._order(keep);
    }
    for (const tag of TAGS) {
      for (const el of this._parts.all(tag)) if (el.hasAttribute(DEFAULT) && !keep.has(el)) el.remove();
    }
  }

  /** Title, description, actions: the order the parts are written in. */
  private _order(parts: Set<HTMLElement>): void {
    const ordered = TAGS.flatMap(tag => [...parts].filter(el => el.localName === tag));
    ordered.forEach((el, i) => {
      if (this.children[i] !== el) this.insertBefore(el, this.children[i] ?? null);
    });
  }

  private _onClick = (e: Event): void => {
    const target = e.target as Element | null;
    const actions = target?.closest?.('void-error-fallback-actions');
    if (!actions?.hasAttribute(DEFAULT) || !this._parts.owns(actions) || !target!.closest('button')) return;
    this.dispatchEvent(new CustomEvent('void-retry', { bubbles: true, composed: true }));
  };
}

if (!customElements.get('void-error-fallback')) {
  customElements.define('void-error-fallback', VoidErrorFallback);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-error-fallback': VoidErrorFallback;
  }
}
