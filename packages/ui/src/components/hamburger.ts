import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { activateKeys } from '../keymaps/activation.js';
import { isInDisabledFieldset, watchDisabledAncestors } from '../form-control.js';
import { useProjection } from '../projection.js';
import { msg } from '../messages.js';

useProjection();

/**
 * Animated open/close toggle for mobile navigation menus and collapsible sidebars.
 *
 * Name it by what it opens: `aria-label="Main navigation"` (or `aria-labelledby`). Without one it is called "Menu" ("Close menu" while open).
 *
 * @fires {CustomEvent<{ reason: 'trigger' | 'keyboard' }>} void-open - The user opened it: `trigger` for a click, `keyboard` for Enter or Space. Does not bubble.
 * @fires {CustomEvent<{ reason: 'trigger' }>} void-close - The user closed it. Does not bubble.
 */
export class VoidHamburger extends VoidElement {
  /** Key bindings for this element's actions, as JSON (`{"activate":["Enter"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = activateKeys;

  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, {
    disabled: () => isInDisabledFieldset(this),
    activate: () => {
      this._byKey = true;
      try { this.click(); } finally { this._byKey = false; }
    },
  });
  /** A key (Enter, Space) is activating it, so the click it fires reports reason `keyboard`. */
  private _byKey = false;

  /**
   * Whether the menu it controls is open: draws the lines as a close cross and sets `aria-expanded`. It
   * flips on every click and Enter or Space, firing `void-open` or `void-close`; set it yourself when the
   * menu closes some other way.
   */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private _unwatch: (() => void) | null = null;

  /** Inside a `<fieldset disabled>` it ignores clicks and keys and leaves the tab order, as a native button does. */
  private _syncDisabled(): void {
    const off = isInDisabledFieldset(this);
    this.setHostAttribute('aria-disabled', off ? 'true' : null);
    this.setHostAttribute('tabindex', off ? '-1' : '0');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this._syncDisabled();
    this._unwatch = watchDisabledAncestors(this, () => this._syncDisabled());
    this.setHostAttribute('aria-expanded', String(this.open));
    this._syncLabel();
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this._unwatch?.();
    this._unwatch = null;
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) this.setHostAttribute('aria-expanded', String(this.open));
    this._syncLabel();
  }

  private _handleClick = (): void => {
    if (isInDisabledFieldset(this)) return;
    this.open = !this.open;
    if (this.open) this.dispatchEvent(new CustomEvent('void-open', { bubbles: false, detail: { reason: this._byKey ? 'keyboard' : 'trigger' } }));
    else this.dispatchEvent(new CustomEvent('void-close', { bubbles: false, detail: { reason: 'trigger' } }));
  };

  /** The label this component wrote itself, so a name the author wrote is told apart from it. */
  private _writtenLabel: string | null = null;

  /**
   * The name is the author's `aria-label` or `aria-labelledby` (say what it opens: "Main navigation"; it stays the
   * same while open, `aria-expanded` says the rest). Without one it is "Menu", or "Close menu" while open.
   */
  private _syncLabel(): void {
    const current = this.getAttribute('aria-label');
    if (this.hasAttribute('aria-labelledby') || (current !== null && current !== this._writtenLabel)) return;
    this._writtenLabel = msg(this, this.open ? 'hamburger.close' : 'hamburger.open');
    this.setHostAttribute('aria-label', this._writtenLabel);
  }

  render() {
    return html`
      <span class="void-hamburger-lines">
        <span class="void-hamburger-line"></span>
        <span class="void-hamburger-line"></span>
        <span class="void-hamburger-line"></span>
      </span>
    `;
  }
}

if (!customElements.get('void-hamburger')) {
  customElements.define('void-hamburger', VoidHamburger);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-hamburger': VoidHamburger;
  }
}
