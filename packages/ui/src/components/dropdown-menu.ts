import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { isPrintable, stepEnabled, Typeahead } from '../keyboard.js';
import { OverlayController } from '../overlay.js';
import { PartsController, triggerControl } from '../parts.js';

/**
 * Trigger-anchored action menu for table row actions, toolbar overflow menus, and context menus.
 *
 * Two parts: `<void-dropdown-menu-trigger>` around the control that opens the menu (one element: a
 * `<void-button>`, a `<button>`), and `<void-dropdown-menu-content>` holding the `<void-dropdown-menu-item>`s
 * (and `<void-dropdown-menu-separator>`s between groups). The parts are the final DOM.
 *
 * Follows the WAI-ARIA menu button pattern: the trigger gets `aria-haspopup="menu"`, `aria-expanded` and
 * `aria-controls`; the panel is a `role="menu"` of `menuitem`s that take focus one at a time. Keyboard on the
 * trigger: Enter, Space and ArrowDown open the menu and focus the first item, ArrowUp opens it and focuses the
 * last item. In the menu: ArrowDown and ArrowUp move between items (wrapping, skipping disabled ones), Home
 * and End jump to the first and last, typing characters jumps to the next item starting with them, Enter or
 * Space activate the item. Choosing an item closes the menu and returns focus to the trigger (add `keep-open`
 * to an item, for example a checkbox-style toggle, to keep it open); Escape closes it and returns focus to the
 * trigger; Tab or a press outside closes it. The panel is shown in the top layer and placed with CSS anchor
 * positioning, flipping at viewport edges.
 *
 * @fires {CustomEvent<{ reason: 'trigger' | 'keyboard' | 'api' }>} void-open - The menu opened.
 * @fires {CustomEvent<{ reason: 'trigger' | 'select' | 'escape' | 'outside' | 'blur' | 'parent' | 'api' }>} void-close -
 * The menu is closing. Cancelable when the user caused it (every reason but `parent` and `api`).
 */
export class VoidDropdownMenu extends VoidElement {
  /** Whether the menu is open. A click on the trigger toggles it; choosing an item, Escape, Tab or a press outside closes it. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Side of the trigger the menu opens on; it flips to the opposite side when there is no room. */
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  /** Alignment with the trigger along that side. */
  @property({ type: String, reflect: true }) align: 'start' | 'center' | 'end' = 'start';

  protected readonly _parts = new PartsController(this, {
    tags: ['void-dropdown-menu-trigger', 'void-dropdown-menu-content', 'void-dropdown-menu-item', 'void-dropdown-menu-separator'],
    onChange: () => {
      this._wire();
      this.requestUpdate();
    },
  });

  /** Which item receives focus when the menu opens from the keyboard. */
  private _focusLast = false;
  private readonly _typeahead = new Typeahead();

  protected readonly _overlay = new OverlayController(this, {
    kind: 'menu',
    surface: () => this._content(),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => this._triggerEl,
    haspopup: 'menu',
    anchor: () => this,
    hostStyle: (p, v) => this.setHostStyle(p, v),
    placement: () => ({ side: this.position, align: this.align }),
    attr: (el, name, value) => this._parts.set(el, name, value),
    style: (el, p, v) => this._parts.style(el, p, v),
    initialFocus: reason => {
      const last = this._focusLast;
      this._focusLast = false;
      if (reason === 'api') return false;
      const items = this._items();
      return (last ? items[items.length - 1] : items[0]) ?? null;
    },
  });

  /** The control inside the trigger part (gets the menu-button ARIA). */
  private get _triggerEl(): HTMLElement | null {
    return triggerControl(this._parts.one('void-dropdown-menu-trigger'));
  }

  private _content(): HTMLElement | null {
    return this._parts.one('void-dropdown-menu-content');
  }

  /** Enabled items of this menu (not of a menu nested inside it). */
  private _items(): HTMLElement[] {
    return this._parts.all('void-dropdown-menu-item').filter(item => !item.hasAttribute('disabled'));
  }

  /** The content is a `role="menu"` in the top layer, named by the trigger's control; separators are separators. */
  private _wire(): void {
    const content = this._content();
    if (!content) return;
    const control = this._triggerEl;
    this._parts.set(content, 'popover', 'manual');
    this._parts.set(content, 'role', 'menu');
    this._parts.id(content, 'void-dropdown-menu-content');
    this._parts.set(content, 'aria-labelledby', control ? this._parts.id(control, 'void-dropdown-menu-trigger') : null);
    for (const sep of this._parts.all('void-dropdown-menu-separator')) this._parts.provide(sep, 'role', 'separator');
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Delegated on the host so a replaced trigger keeps working and reconnects never stack listeners.
    this.addEventListener('click', this._handleTriggerClick);
    this.addEventListener('keydown', this._handleKeydown);
    this.addEventListener('void-select', this._handleSelect);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleTriggerClick);
    this.removeEventListener('keydown', this._handleKeydown);
    this.removeEventListener('void-select', this._handleSelect);
    this._typeahead.reset();
  }

  /** Opens the menu and focuses its first or last item (or moves there when it is already open). */
  private _openAndFocus(which: 'first' | 'last'): void {
    if (this.open) {
      const items = this._items();
      (which === 'first' ? items[0] : items[items.length - 1])?.focus();
      return;
    }
    this._focusLast = which === 'last';
    this._overlay.requestOpen('keyboard');
  }

  private _handleTriggerClick = (e: Event): void => {
    const trigger = this._parts.one('void-dropdown-menu-trigger');
    if (trigger && trigger.contains(e.target as Node)) this._overlay.toggle('trigger');
  };

  private _handleSelect = (e: Event): void => {
    const item = e.target as Element;
    if (!(item instanceof VoidDropdownMenuItem) || !this._parts.owns(item)) return;
    if (item.keepOpen) return;
    this._overlay.requestClose('select');
  };

  /**
   * Keys on the trigger and inside the menu; the host's own listener, so nothing outside the menu is affected.
   * Escape is handled by the shared overlay stack (it closes only the topmost overlay).
   */
  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const target = e.target as HTMLElement;
    const trigger = this._triggerEl;
    if (trigger && this._parts.one('void-dropdown-menu-trigger')?.contains(target)) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this._openAndFocus(e.key === 'ArrowDown' ? 'first' : 'last');
      } else if ((e.key === 'Enter' || e.key === ' ') && !isNativelyActivated(trigger, target)) {
        // void-button and custom triggers do not turn Enter or Space into a click.
        e.preventDefault();
        if (this.open) this._overlay.requestClose('trigger');
        else this._openAndFocus('first');
      }
      return;
    }
    const panel = this._content();
    const item = target.closest('void-dropdown-menu-item');
    if (!this.open || !panel?.contains(target) || !item) return;
    const items = this._items();
    const current = items.indexOf(item as HTMLElement);
    const none = items.map(() => false);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = items[stepEnabled(none, current, 1)];
    else if (e.key === 'ArrowUp') next = items[stepEnabled(none, current, -1)];
    else if (e.key === 'Home') next = items[0];
    else if (e.key === 'End') next = items[items.length - 1];
    else if (e.key === 'Tab') {
      this._overlay.requestClose('blur');
      return;
    } else if (isPrintable(e) && e.key !== ' ') {
      const i = this._typeahead.match(e.key, items.map(it => it.textContent ?? ''), none, current);
      if (i >= 0) {
        e.preventDefault();
        items[i]!.focus();
      }
      return;
    } else return;
    e.preventDefault();
    next?.focus();
  };
}

/** Elements whose Enter and Space already produce a click event. */
function isNativelyActivated(trigger: Element, target: Element): boolean {
  const native = target.closest('button, a[href], input, summary');
  return !!native && trigger.contains(native);
}

if (!customElements.get('void-dropdown-menu')) {
  customElements.define('void-dropdown-menu', VoidDropdownMenu);
}

/**
 * An item of a `<void-dropdown-menu>`, inside its `<void-dropdown-menu-content>`. Choosing it (click, Enter or
 * Space) dispatches `void-select` and closes the menu, unless it has `keep-open`.
 *
 * @fires {CustomEvent<{ item: VoidDropdownMenuItem; value: string }>} void-select - The item was chosen.
 */
export class VoidDropdownMenuItem extends VoidElement {
  /** What the item stands for, passed as `detail.value` of `void-select` (empty when not set). */
  @property({ type: String, reflect: true }) value = '';
  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, { disabled: () => this.disabled });

  /** Dim the item, skip it in keyboard navigation and stop it firing `void-select`. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Draw the item in the error colour, for an action that deletes or cannot be undone. */
  @property({ type: Boolean, reflect: true }) destructive = false;
  /** Keep the menu open when this item is chosen (checkbox-style or repeatable items). */
  @property({ type: Boolean, reflect: true, attribute: 'keep-open' }) keepOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'menuitem');
    // Items are reached with the arrow keys, not Tab (roving focus inside the menu).
    this.setHostAttribute('tabindex', '-1');
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('disabled')) {
      this.setHostAttribute('aria-disabled', this.disabled ? 'true' : null);
    }
  }

  private _handleClick = (e: Event): void => {
    if (this.disabled) {
      e.stopImmediatePropagation();
      return;
    }
    this.dispatchEvent(new CustomEvent('void-select', {
      bubbles: true,
      composed: true,
      detail: { item: this, value: this.value },
    }));
  };
}

if (!customElements.get('void-dropdown-menu-item')) {
  customElements.define('void-dropdown-menu-item', VoidDropdownMenuItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-dropdown-menu': VoidDropdownMenu;
    'void-dropdown-menu-item': VoidDropdownMenuItem;
  }
}
