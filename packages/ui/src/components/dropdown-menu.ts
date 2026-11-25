import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { isPrintable, stepEnabled, Typeahead, uid } from '../keyboard.js';
import { ProjectionController, triggerRegion } from '../projection.js';

/**
 * Trigger-anchored action menu for table row actions, toolbar overflow menus, and context menus.
 *
 * Follows the WAI-ARIA menu button pattern: the trigger gets `aria-haspopup="menu"`, `aria-expanded` and
 * `aria-controls`; the panel is a `role="menu"` of `menuitem`s that take focus one at a time. Keyboard on the
 * trigger: Enter, Space and ArrowDown open the menu and focus the first item, ArrowUp opens it and focuses the
 * last item. In the menu: ArrowDown and ArrowUp move between items (wrapping, skipping disabled ones), Home
 * and End jump to the first and last, typing characters jumps to the next item starting with them, Enter or
 * Space activate the item, Escape closes the menu and returns focus to the trigger, Tab closes it and moves on.
 *
 * @slot trigger - The element that opens the menu. Mark it with `slot="trigger"`; without one, the first child element is used.
 * @slot - The menu items (`<void-dropdown-menu-item>`).
 */
export class VoidDropdownMenu extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String, reflect: true }) position: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' = 'bottom-start';

  // The trigger (slot="trigger", else the first element child) stays before the panel; everything else goes into the panel.
  protected readonly _projection: ProjectionController = new ProjectionController(this, {
    regions: [
      triggerRegion('trigger', 'before', () => this._projection, this),
      { name: 'panel', target: () => this.querySelector(':scope > .void-dropdown-menu-panel') },
    ],
    onChange: () => this._syncTrigger(),
  });

  private readonly _panelId = uid('void-dropdown-menu-panel');
  private readonly _typeahead = new Typeahead();

  private get _triggerEl(): Element | null {
    return (this._projection.nodes('trigger').find(n => n instanceof Element) as Element | undefined) ?? null;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Delegated on the host so a replaced trigger keeps working and reconnects never stack listeners.
    this.addEventListener('click', this._handleTriggerClick);
    this.addEventListener('keydown', this._handleHostKeydown);
    document.addEventListener('mousedown', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleTriggerClick);
    this.removeEventListener('keydown', this._handleHostKeydown);
    this._typeahead.reset();
    document.removeEventListener('mousedown', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    this._syncTrigger();
  }

  render() {
    return html`<div class="void-dropdown-menu-panel" role="menu" ?hidden=${!this.open}></div>`;
  }

  /** ARIA wiring between the consumer's trigger and the panel (the panel holds no Lit bindings). */
  private _syncTrigger(): void {
    const trigger = this._triggerEl;
    const panel = this.querySelector(':scope > .void-dropdown-menu-panel');
    if (!trigger) return;
    if (!trigger.id) trigger.id = `${this._panelId}-trigger`;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', String(this.open));
    trigger.setAttribute('aria-controls', this._panelId);
    if (panel) {
      panel.id = this._panelId;
      panel.setAttribute('aria-labelledby', trigger.id);
    }
  }

  private get _items(): VoidDropdownMenuItem[] {
    return Array.from(this.querySelectorAll<VoidDropdownMenuItem>('void-dropdown-menu-item:not([disabled])'));
  }

  /** Opens the menu and moves focus to its first or last item once the panel is showing. */
  private _openAndFocus(which: 'first' | 'last'): void {
    this.open = true;
    void this.updateComplete.then(() => {
      const items = this._items;
      (which === 'first' ? items[0] : items[items.length - 1])?.focus();
    });
  }

  private _handleTriggerClick = (e: Event): void => {
    const trigger = this._triggerEl;
    if (trigger && trigger.contains(e.target as Node)) {
      this.open = !this.open;
      // A click without a pointer (Enter or Space on a button trigger) is a keyboard activation.
      if (this.open && e instanceof MouseEvent && e.detail === 0) this._openAndFocus('first');
    }
  };

  /** Keys on the trigger and inside the menu; the host's own listener, so nothing outside the menu is affected. */
  private _handleHostKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) {
      // Closes this menu only: a surrounding dialog must not see the same Escape.
      e.stopPropagation();
      this.open = false;
      (this._triggerEl as HTMLElement | null)?.focus();
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const target = e.target as HTMLElement;
    const trigger = this._triggerEl as HTMLElement | null;
    if (trigger?.contains(target)) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this._openAndFocus(e.key === 'ArrowDown' ? 'first' : 'last');
      } else if ((e.key === 'Enter' || e.key === ' ') && !isNativelyActivated(trigger, target)) {
        // void-button and custom triggers do not turn Enter or Space into a click.
        e.preventDefault();
        if (this.open) this.open = false;
        else this._openAndFocus('first');
      }
      return;
    }
    if (!this.open || !target.closest('void-dropdown-menu-item')) return;
    const items = this._items;
    const current = items.indexOf(target.closest('void-dropdown-menu-item') as VoidDropdownMenuItem);
    const none = items.map(() => false);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = items[stepEnabled(none, current, 1)];
    else if (e.key === 'ArrowUp') next = items[stepEnabled(none, current, -1)];
    else if (e.key === 'Home') next = items[0];
    else if (e.key === 'End') next = items[items.length - 1];
    else if (e.key === 'Tab') {
      this.open = false;
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

  private _handleOutsideClick = (e: MouseEvent): void => {
    if (this.open && !this.contains(e.target as Node)) {
      this.open = false;
    }
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) {
      this.open = false;
      (this._triggerEl as HTMLElement)?.focus();
    }
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

export class VoidDropdownMenuItem extends VoidElement {
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) destructive = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'menuitem');
    // Menu items take focus from the keyboard handling of the menu, not from Tab.
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
