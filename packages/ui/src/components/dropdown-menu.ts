import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { isPrintable, stepEnabled, Typeahead, uid } from '../keyboard.js';
import { OverlayController } from '../overlay.js';
import { ProjectionController, triggerRegion } from '../projection.js';

/**
 * Trigger-anchored action menu for table row actions, toolbar overflow menus, and context menus.
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
 * @slot trigger - The element that opens the menu. Mark it with `slot="trigger"`; without one, the first child element is used.
 * @slot - The menu items (`<void-dropdown-menu-item>`).
 * @fires {CustomEvent<{ reason: 'trigger' | 'keyboard' | 'api' }>} void-open - The menu opened.
 * @fires {CustomEvent<{ reason: 'trigger' | 'select' | 'escape' | 'outside' | 'blur' | 'parent' | 'api' }>} void-close -
 * The menu is closing. Cancelable when the user caused it (every reason but `parent` and `api`).
 */
export class VoidDropdownMenu extends VoidElement {
  /** Whether the menu is open. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Side of the trigger the menu opens on; it flips to the opposite side when there is no room. */
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  /** Alignment with the trigger along that side. */
  @property({ type: String, reflect: true }) align: 'start' | 'center' | 'end' = 'start';

  // The trigger (slot="trigger", else the first element child) stays before the panel; everything else goes into the panel.
  protected readonly _projection: ProjectionController = new ProjectionController(this, {
    regions: [
      triggerRegion('trigger', 'before', () => this._projection, this),
      { name: 'panel', target: () => this.querySelector(':scope > .void-dropdown-menu-panel') },
    ],
    // Trigger ARIA follows the trigger, including one the parser adds after the first render.
    onChange: () => this.requestUpdate(),
  });

  /** Which item receives focus when the menu opens from the keyboard. */
  private _focusLast = false;
  private readonly _panelId = uid('void-dropdown-menu-panel');
  private readonly _typeahead = new Typeahead();

  protected readonly _overlay = new OverlayController(this, {
    kind: 'menu',
    surface: () => this.querySelector<HTMLElement>(':scope > .void-dropdown-menu-panel'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => this._triggerEl,
    haspopup: 'menu',
    anchor: () => this,
    hostStyle: (p, v) => this.setHostStyle(p, v),
    placement: () => ({ side: this.position, align: this.align }),
    initialFocus: reason => {
      const last = this._focusLast;
      this._focusLast = false;
      if (reason === 'api') return false;
      const items = this._items();
      return (last ? items[items.length - 1] : items[0]) ?? null;
    },
  });

  private get _triggerEl(): HTMLElement | null {
    return (this._projection.nodes('trigger').find(n => n instanceof HTMLElement) as HTMLElement | undefined) ?? null;
  }

  /** Enabled items of this menu (not of a menu nested inside it). */
  private _items(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('void-dropdown-menu-item:not([disabled])')).filter(
      item => item.closest('void-dropdown-menu') === this
    );
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

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    // The menu is named by its trigger (the overlay adds aria-haspopup, aria-expanded and aria-controls).
    const trigger = this._triggerEl;
    const panel = this.querySelector(':scope > .void-dropdown-menu-panel');
    if (trigger && panel) {
      if (!trigger.id) trigger.id = `${this._panelId}-trigger`;
      panel.setAttribute('aria-labelledby', trigger.id);
    }
  }

  render() {
    // The panel holds only consumer items (no Lit child bindings).
    return html`<div id=${this._panelId} class="void-dropdown-menu-panel" role="menu" popover="manual"></div>`;
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
    const trigger = this._triggerEl;
    if (trigger && trigger.contains(e.target as Node)) this._overlay.toggle('trigger');
  };

  private _handleSelect = (e: Event): void => {
    const item = e.target as Element;
    if (!(item instanceof VoidDropdownMenuItem) || item.closest('void-dropdown-menu') !== this) return;
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
    if (trigger?.contains(target)) {
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
    const panel = this.querySelector(':scope > .void-dropdown-menu-panel');
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
 * An item of a `<void-dropdown-menu>`. Choosing it (click, Enter or Space) dispatches `void-select` and closes the
 * menu, unless it has `keep-open`.
 *
 * @fires {CustomEvent<{ item: VoidDropdownMenuItem }>} void-select - The item was chosen.
 */
export class VoidDropdownMenuItem extends VoidElement {
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) destructive = false;
  /** Keep the menu open when this item is chosen (checkbox-style or repeatable items). */
  @property({ type: Boolean, reflect: true, attribute: 'keep-open' }) keepOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'menuitem');
    // Items are reached with the arrow keys, not Tab (roving focus inside the menu).
    this.setHostAttribute('tabindex', '-1');
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('disabled')) {
      this.setHostAttribute('aria-disabled', String(this.disabled));
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
      detail: { item: this },
    }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !this.disabled) {
      e.preventDefault();
      this._handleClick(e);
    }
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
