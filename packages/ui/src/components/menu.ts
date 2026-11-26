import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { isPrintable, stepEnabled, Typeahead } from '../keyboard.js';
import { PartsController } from '../parts.js';
import { msg } from '../messages.js';

/**
 * Always-visible menu panel for command palettes, side panels, and searchable action lists.
 *
 * Its regions are parts, in this order: an optional `<void-menu-search>` around one text field (present means
 * the menu is searchable), the `<void-menu-content>` holding the `<void-menu-item>`s and
 * `<void-menu-group>`s, and an optional `<void-menu-empty>` shown instead of the default "No results found" when
 * a search matches nothing. The parts are the final DOM: the menu moves and renders nothing.
 *
 * Follows the WAI-ARIA menu pattern: the content is the `role="menu"` (the host has no role, so the search
 * field is not a menu child) and the items are `menuitem`s, one tab stop at a time (roving tabindex).
 * Keys are handled on the menu itself, never on the document. Keyboard: ArrowDown and ArrowUp move between
 * items (wrapping, skipping disabled and filtered-out ones; with a search field, ArrowDown from the field
 * goes to the first item and ArrowUp from the first item returns to the field), Home and End jump to
 * the first and last item, typing jumps to the next item starting with the characters (not in the search
 * field), Enter or Space activate the item (`void-select`), Escape closes the menu.
 */
export class VoidMenu extends VoidElement {
  /**
   * Whether the menu is shown. It starts hidden: add `open` to show it (the menu has no trigger of its own).
   * Escape sets it back to false.
   */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private _query = '';
  protected readonly _parts = new PartsController(this, {
    tags: [
      'void-menu-search',
      'void-menu-content',
      'void-menu-empty',
      'void-menu-group',
      'void-menu-item',
    ],
    onChange: () => this._wire(),
  });

  private readonly _typeahead = new Typeahead();
  private _observer: MutationObserver | null = null;

  /** The text field inside the search part (a native input, or the one a `<void-input>` holds). */
  private _searchInput(): HTMLInputElement | null {
    return this._parts.one('void-menu-search')?.querySelector('input') ?? null;
  }

  private _items(): VoidMenuItem[] {
    return this._parts.all<VoidMenuItem>('void-menu-item');
  }

  /** Items that can take focus: enabled and not filtered out, in document order. */
  private get _focusableItems(): VoidMenuItem[] {
    return this._items().filter(item => !item.disabled && !item.closest('[hidden]'));
  }

  /** The name the component last wrote on the content part. */
  private _named: string | null = null;

  /**
   * Names the content (the author's own `aria-label` on the menu or on the part wins) and writes the empty-state
   * text the theme draws, both in the language of the element.
   */
  private _text(content: HTMLElement | null = this._parts.one('void-menu-content')): void {
    if (content) {
      const text = this.getAttribute('aria-label') || msg(this, 'menu.label');
      const current = content.getAttribute('aria-label');
      if (current === null || current === this._named) {
        this._parts.set(content, 'aria-label', text);
        this._named = text;
      }
    }
    this.setHostStyle('--_void-menu-empty', JSON.stringify(msg(this, 'menu.empty'))); // style-ok
  }

  /** Names the content, links the search field to it and applies the current search. Idempotent. */
  private _wire(): void {
    const content = this._parts.one('void-menu-content');
    if (content) {
      this._parts.provide(content, 'role', 'menu');
      this._text(content);
      const input = this._searchInput();
      if (input) this._parts.set(input, 'aria-controls', this._parts.id(content, 'void-menu-content'));
    }
    const input = this._searchInput();
    if (input) this._parts.provide(input, 'autocomplete', 'off');
    this._applyFilter();
    this._syncTabStop();
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Keys are handled on the menu itself (never on the document), so arrow keys keep
    // working in every other control on the page.
    this.addEventListener('keydown', this._handleKeydown);
    this.addEventListener('focusin', this._handleFocusIn);
    this.addEventListener('input', this._onInput);
    // Items change when disabled or filtered: keep the tab stop valid.
    this._observer ??= new MutationObserver(() => this._syncTabStop());
    this._observer.observe(this, { subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    this.removeEventListener('focusin', this._handleFocusIn);
    this.removeEventListener('input', this._onInput);
    this._observer?.disconnect();
    this._typeahead.reset();
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    this._text();
    this._syncTabStop();

    if (changed.has('open') && this.open) {
      // A search field takes focus when the menu opens.
      requestAnimationFrame(() => this._searchInput()?.focus());
    }
  }

  /** Roving tabindex: one item (the one last focused, else the first) is the menu's tab stop. */
  private _syncTabStop(current?: VoidMenuItem | null): void {
    const items = this._focusableItems;
    const stop = current && items.includes(current)
      ? current
      : items.find(i => i.getAttribute('tabindex') === '0') ?? items[0];
    for (const item of this._items()) {
      if (typeof item._setTabStop === 'function') item._setTabStop(item === stop);
    }
  }

  private _handleFocusIn = (e: FocusEvent): void => {
    const item = (e.target as Element).closest('void-menu-item') as VoidMenuItem | null;
    if (item && this._parts.owns(item)) this._syncTabStop(item);
  };

  private _inSearch(target: Element): boolean {
    return !!this._parts.one('void-menu-search')?.contains(target);
  }

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (!this.open) return;
    const target = e.target as HTMLElement;

    if (e.key === 'Escape') {
      e.preventDefault();
      // Closes this menu only: a surrounding dialog must not see the same Escape.
      e.stopPropagation();
      this.open = false;
      this._clearSearch();
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    const items = this._focusableItems;
    const inSearch = this._inSearch(target);
    const current = items.indexOf(target.closest('void-menu-item') as VoidMenuItem);
    const disabled = items.map(() => false);
    const search = this._searchInput();
    let next: HTMLElement | undefined;

    if (e.key === 'ArrowDown') {
      next = inSearch || current < 0 ? items[0] : items[stepEnabled(disabled, current, 1)];
    } else if (e.key === 'ArrowUp') {
      if (search && current === 0) next = search;
      else next = inSearch || current < 0 ? items[items.length - 1] : items[stepEnabled(disabled, current, -1)];
    } else if (e.key === 'Home' && !inSearch) {
      next = items[0];
    } else if (e.key === 'End' && !inSearch) {
      next = items[items.length - 1];
    } else if (isPrintable(e) && !inSearch && current >= 0 && !(e.key === ' ')) {
      // Type-ahead among the visible items (the search field takes typing itself).
      const i = this._typeahead.match(e.key, items.map(it => it.textContent ?? ''), disabled, current);
      if (i >= 0) {
        e.preventDefault();
        items[i]!.focus();
      }
      return;
    } else {
      return;
    }
    e.preventDefault();
    next?.focus();
  };

  private _onInput = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    if (!this._inSearch(target)) return;
    this._query = target.value;
    this._parts.sync();
  };

  /**
   * Hides the items (and groups, and the menu's empty state) the search does not match. Written through the parts
   * controller each pass, so what the search hid is shown again as soon as the search is cleared, and a morph
   * keeps it.
   */
  private _applyFilter(): void {
    const q = this._query.toLowerCase();
    let visible = 0;
    if (q) {
      for (const item of this._items()) {
        const text = (item.textContent?.trim() ?? '').toLowerCase();
        const value = (item.getAttribute('value') ?? '').toLowerCase();
        const match = text.includes(q) || value.includes(q);
        if (!match) this._parts.set(item, 'hidden', true);
        else visible++;
      }
      for (const group of this._parts.all('void-menu-group')) {
        if (!group.querySelector('void-menu-item:not([hidden])')) this._parts.set(group, 'hidden', true);
      }
    } else {
      visible = 1;
    }
    this.setHostAttribute('empty', !!q && visible === 0);
  }

  private _clearSearch(): void {
    this._query = '';
    const input = this._searchInput();
    if (input) input.value = '';
    this._parts.sync();
  }
}

if (!customElements.get('void-menu')) {
  customElements.define('void-menu', VoidMenu);
}

/**
 * One action in a `void-menu`: activating it (click, Enter or Space) fires `void-select` with its `value`. Its
 * text is its label; an optional `<void-menu-item-icon>` before it and `<void-menu-item-shortcut>` after it are
 * CSS-only parts.
 *
 * @fires {CustomEvent<{ item: VoidMenuItem; value: string }>} void-select - The item was chosen.
 */
export class VoidMenuItem extends VoidElement {
  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, { disabled: () => this.disabled });

  /**
   * What the item stands for, passed as `detail.value` of `void-select` (empty when not set). Use it instead of
   * matching on the item's text.
   */
  @property({ type: String, reflect: true }) value = '';
  /** Dim the item, skip it in keyboard navigation and stop it firing `void-select`. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'menuitem');
    // Roving tabindex: the owning menu makes one item its tab stop (see _setTabStop).
    this.setHostAttribute('tabindex', '-1');
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
  }

  updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('disabled')) {
      this.setHostAttribute('tabindex', '-1');
      this.setHostAttribute('aria-disabled', this.disabled ? 'true' : null);
    }
  }

  /** @internal Set by the owning menu: whether this item is the menu's tab stop. */
  _setTabStop(stop: boolean): void {
    this.setHostAttribute('tabindex', stop && !this.disabled ? '0' : '-1');
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

if (!customElements.get('void-menu-item')) {
  customElements.define('void-menu-item', VoidMenuItem);
}

/**
 * Labelled group of `void-menu-item`s inside a `void-menu`. Its heading is a `<void-menu-group-label>` first in
 * the group, which names the group.
 */
export class VoidMenuGroup extends VoidElement {
  protected readonly _parts = new PartsController(this, {
    tags: ['void-menu-group-label'],
    onChange: () => this._wire(),
  });

  /** The group is named by its label part. */
  private _wire(): void {
    const label = this._parts.one('void-menu-group-label');
    this.setHostAttribute('aria-labelledby', label ? this._parts.id(label, 'void-menu-group-label') : null);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'group');
  }
}

if (!customElements.get('void-menu-group')) {
  customElements.define('void-menu-group', VoidMenuGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-menu': VoidMenu;
    'void-menu-item': VoidMenuItem;
    'void-menu-group': VoidMenuGroup;
  }
}
