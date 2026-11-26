import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController, triggerControl } from '../parts.js';

/**
 * Horizontal navigation bar with dropdown sub-menus for site headers, application nav bars, and mega-menu layouts.
 *
 * A row of `<void-nav-menu-item>`s. Arrow keys move between the items' triggers, Escape closes an open panel and
 * returns focus to its trigger.
 */
export class VoidNavMenu extends VoidElement {
  /**
   * `horizontal` (default) lays the items out in a row with Left and Right arrow keys; `vertical` stacks
   * them.
   */
  @property({ type: String, reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';
  /** CSS width of the menu, such as `100%` or `40rem`. By default it is as wide as its items. */
  @property({ type: String, reflect: true }) width: string = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'menubar');
    this.addEventListener('keydown', this._handleKeydown);
    // void-open does not bubble: the menu hears its items' in the capture phase.
    this.addEventListener('void-open', this._handleItemOpen as EventListener, true);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    this.removeEventListener('void-open', this._handleItemOpen as EventListener, true);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('width')) {
      if (this.width) {
        this.setHostStyle('--void-nav-menu-width', this.width); // style-ok
      } else {
        this.setHostStyle('--void-nav-menu-width', null);
      }
    }
  }

  private _handleItemOpen = (e: CustomEvent<{ reason: string }>): void => {
    const target = e.target as VoidNavMenuItem;
    if (!(target instanceof VoidNavMenuItem)) return;
    // Opening another item by hovering it moved the pointer away from this one; a press on it was outside.
    const reason = e.detail?.reason === 'hover' ? 'hover' : 'outside';
    for (const item of this._getItems()) {
      if (item !== target && item.open) item._closeDropdown(reason);
    }
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    const items = this._getItems();
    if (!items.length) return;

    const isHorizontal = this.orientation === 'horizontal';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    if (e.key === nextKey || e.key === prevKey) {
      const triggers = items.map(item => item._control()).filter((c): c is HTMLElement => !!c);
      const idx = triggers.indexOf(document.activeElement as HTMLElement);
      // Only from a trigger: arrow keys inside an open panel are the panel's own.
      if (idx < 0) return;
      e.preventDefault();
      if (e.key === nextKey) {
        (triggers[idx + 1] ?? triggers[0])?.focus();
      } else {
        (triggers[idx - 1] ?? triggers[triggers.length - 1])?.focus();
      }
      return;
    }

    if (e.key === 'Escape') {
      for (const item of items) {
        if (item.open) {
          item._closeDropdown('escape');
          item._control()?.focus();
        }
      }
    }
  };

  /** The items of this menu (not of a menu nested inside one of its panels). */
  private _getItems(): VoidNavMenuItem[] {
    return Array.from(this.querySelectorAll<VoidNavMenuItem>('void-nav-menu-item')).filter(
      item => item.closest('void-nav-menu') === this,
    );
  }
}

if (!customElements.get('void-nav-menu')) {
  customElements.define('void-nav-menu', VoidNavMenu);
}

/**
 * One entry of a `<void-nav-menu>`: a `<void-nav-menu-trigger>` around one control (a `<button>` for an entry that
 * opens a panel, an `<a href>` for one that navigates) and, for a panel, a `<void-nav-menu-content>` after it.
 *
 * Hovering the item opens its panel after a short delay; a click, Enter or Space on a button trigger opens it
 * too (the browser turns Enter and Space on a button into one `click`, so each key activates exactly once). A
 * link trigger always navigates. The panel closes when the pointer leaves, on Escape, on a press outside or when
 * focus leaves the item.
 *
 * @fires {CustomEvent<{ reason: 'hover' | 'trigger' }>} void-open - The panel opened. Does not bubble.
 * @fires {CustomEvent<{ reason: 'hover' | 'trigger' | 'escape' | 'outside' | 'blur' }>} void-close - The panel
 * closed. Does not bubble.
 */
export class VoidNavMenuItem extends VoidElement {
  /**
   * Whether the item's panel is showing. A click or Enter on the trigger toggles it, firing `void-open` or
   * `void-close`.
   */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Dim the item and stop it opening or navigating. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Mark the item as the current section: it is drawn with an underline, and a link trigger gets
   * `aria-current="page"`. Set it on the item that matches the page.
   */
  @property({ type: Boolean, reflect: true }) current = false;

  private _openTimerId: ReturnType<typeof setTimeout> | undefined;
  private _closeTimerId: ReturnType<typeof setTimeout> | undefined;
  /** The panel was opened by hovering, so a click keeps it open instead of closing it. */
  private _openedByHover = false;

  protected readonly _parts = new PartsController(this, {
    tags: ['void-nav-menu-trigger', 'void-nav-menu-content'],
    onChange: () => this._wire(),
  });

  /** The control inside the trigger part. @internal */
  _control(): HTMLElement | null {
    return triggerControl(this._parts.one('void-nav-menu-trigger'));
  }

  private _content(): HTMLElement | null {
    return this._parts.one('void-nav-menu-content');
  }

  private get _hasContent(): boolean {
    return !!this._content();
  }

  /** A link navigates; it never toggles the panel. */
  private _isLink(control: Element | null): boolean {
    return !!control?.matches('a[href]');
  }

  /** Writes the menubar ARIA on the control and links it to the panel. Idempotent. */
  private _wire(): void {
    const control = this._control();
    const content = this._content();
    if (control) {
      this._parts.provide(control, 'role', 'menuitem');
      if (content) {
        this._parts.set(control, 'aria-haspopup', 'true');
        this._parts.set(control, 'aria-expanded', String(this.open));
        this._parts.set(control, 'aria-controls', this._parts.id(content, 'void-nav-menu-content'));
      }
      if (this.current && this._isLink(control)) this._parts.set(control, 'aria-current', 'page');
      if (this.disabled) {
        this._parts.set(control, 'aria-disabled', 'true');
        if (control.matches('button, void-button, input')) this._parts.set(control, 'disabled', true);
        else this._parts.set(control, 'tabindex', '-1');
      }
    }
    if (content) this._parts.provide(content, 'role', 'menu');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'none');
    this.addEventListener('mouseenter', this._onMouseEnter);
    this.addEventListener('mouseleave', this._onMouseLeave);
    this.addEventListener('click', this._onClick);
    this.addEventListener('focusout', this._onFocusOut);
    document.addEventListener('mousedown', this._onOutsideClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._openTimerId);
    clearTimeout(this._closeTimerId);
    this.removeEventListener('mouseenter', this._onMouseEnter);
    this.removeEventListener('mouseleave', this._onMouseLeave);
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('focusout', this._onFocusOut);
    document.removeEventListener('mousedown', this._onOutsideClick);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('open') || changed.has('disabled') || changed.has('current')) this._parts.sync();
  }

  /** A click (or the click Enter and Space make on a button) on the trigger toggles the panel. */
  private _onClick = (e: Event): void => {
    const trigger = this._parts.one('void-nav-menu-trigger');
    if (!trigger || !trigger.contains(e.target as Node)) return;
    const control = this._control();
    if (this.disabled || !this._hasContent || this._isLink(control)) return;
    clearTimeout(this._openTimerId);
    if (!this.open) {
      this._openedByHover = false;
      this._openDropdown('trigger');
    } else if (this._openedByHover) {
      // The hover already opened it: the click pins it open.
      this._openedByHover = false;
    } else {
      this._closeDropdown('trigger');
    }
  };

  private _onMouseEnter = (): void => {
    if (this.disabled || !this._hasContent) return;
    clearTimeout(this._closeTimerId);
    this._openTimerId = setTimeout(() => {
      if (!this.open) this._openedByHover = true;
      this._openDropdown('hover');
    }, 150);
  };

  private _onMouseLeave = (): void => {
    if (!this._hasContent) return;
    clearTimeout(this._openTimerId);
    this._closeTimerId = setTimeout(() => {
      this._closeDropdown('hover');
    }, 300);
  };

  private _onFocusOut = (e: FocusEvent): void => {
    const to = e.relatedTarget as Node | null;
    if (this.open && to && !this.contains(to)) this._closeDropdown('blur');
  };

  private _onOutsideClick = (e: MouseEvent): void => {
    if (this.open && !this.contains(e.target as Node)) {
      this._closeDropdown('outside');
    }
  };

  private _openDropdown(reason: 'hover' | 'trigger'): void {
    if (!this.open) {
      this.open = true;
      this.dispatchEvent(new CustomEvent('void-open', { bubbles: false, detail: { reason } }));
    }
  }

  /** @internal Closes the panel for `reason` (the menu calls it for Escape and when another item opens). */
  _closeDropdown(reason: 'hover' | 'trigger' | 'escape' | 'outside' | 'blur'): void {
    if (this.open) {
      this.open = false;
      this.dispatchEvent(new CustomEvent('void-close', { bubbles: false, detail: { reason } }));
    }
  }
}

if (!customElements.get('void-nav-menu-item')) {
  customElements.define('void-nav-menu-item', VoidNavMenuItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-nav-menu': VoidNavMenu;
    'void-nav-menu-item': VoidNavMenuItem;
  }
}
