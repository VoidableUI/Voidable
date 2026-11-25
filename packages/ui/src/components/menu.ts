import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { isPrintable, stepEnabled, Typeahead } from '../keyboard.js';
import { ProjectionController } from '../projection.js';

/**
 * Always-visible menu panel for command palettes, side panels, and searchable action lists.
 *
 * Follows the WAI-ARIA menu pattern: the list is the `role="menu"` (the host has no role, so the search
 * field is not a menu child) and the items are `menuitem`s, one tab stop at a time (roving tabindex).
 * Keys are handled on the menu itself, never on the document. Keyboard: ArrowDown and ArrowUp move between
 * items (wrapping, skipping disabled and filtered-out ones; with `searchable`, ArrowDown from the search
 * field goes to the first item and ArrowUp from the first item returns to the field), Home and End jump to
 * the first and last item, typing jumps to the next item starting with the characters (not when
 * `searchable`), Enter or Space activate the item (`void-select`), Escape closes the menu.
 */
export class VoidMenu extends VoidElement {
  /**
   * Whether the menu list is shown. It starts hidden: add `open` to show it (the list has no trigger of
   * its own). Escape sets it back to false.
   */
  @property({ type: Boolean, reflect: true }) open = false;
  /**
   * Show a search field above the items that filters them as the user types; it takes focus when the
   * menu opens.
   */
  @property({ type: Boolean, reflect: true }) searchable = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Hint in the search field. Defaults to `Search...`. Only used with `searchable`. */
  @property({ type: String }) placeholder = 'Search...';

  private _query = '';
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'list', target: () => this.querySelector(':scope > .void-menu-list') }],
  });

  private readonly _typeahead = new Typeahead();
  private _observer: MutationObserver | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // Keys are handled on the menu itself (never on the document), so arrow keys keep
    // working in every other control on the page.
    this.addEventListener('keydown', this._handleKeydown);
    this.addEventListener('focusin', this._handleFocusIn);
    // Items arrive late (framework rendering, morphs) and change when filtered: keep the tab stop valid.
    this._observer ??= new MutationObserver(() => this._syncTabStop());
    this._observer.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });
    this._syncTabStop();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    this.removeEventListener('focusin', this._handleFocusIn);
    this._observer?.disconnect();
    this._typeahead.reset();
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    this._syncTabStop();

    if (changed.has('open') && this.open && this.searchable) {
      requestAnimationFrame(() => {
        const input = this.querySelector<HTMLInputElement>('.void-menu-search');
        input?.focus();
      });
    }
  }

  /** Items that can take focus: enabled and not filtered out, in document order. */
  private get _focusableItems(): VoidMenuItem[] {
    return (Array.from(this.querySelectorAll('void-menu-item')) as VoidMenuItem[]).filter(
      item => !item.disabled && !item.closest('[hidden]'),
    );
  }

  /** Roving tabindex: one item (the one last focused, else the first) is the menu's tab stop. */
  private _syncTabStop(current?: VoidMenuItem | null): void {
    const items = this._focusableItems;
    const stop = current && items.includes(current)
      ? current
      : items.find(i => i.getAttribute('tabindex') === '0') ?? items[0];
    for (const item of this.querySelectorAll('void-menu-item') as NodeListOf<VoidMenuItem>) {
      if (typeof item._setTabStop === 'function') item._setTabStop(item === stop);
    }
  }

  private _handleFocusIn = (e: FocusEvent): void => {
    const item = (e.target as Element).closest('void-menu-item') as VoidMenuItem | null;
    if (item) this._syncTabStop(item);
  };

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
    const inSearch = target.classList.contains('void-menu-search');
    const current = items.indexOf(target.closest('void-menu-item') as VoidMenuItem);
    const disabled = items.map(() => false);
    let next: HTMLElement | undefined;

    if (e.key === 'ArrowDown') {
      next = inSearch || current < 0 ? items[0] : items[stepEnabled(disabled, current, 1)];
    } else if (e.key === 'ArrowUp') {
      if (this.searchable && current === 0) next = this.querySelector<HTMLElement>('.void-menu-search') ?? undefined;
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

  private _onSearchInput = (e: Event): void => {
    this._query = (e.target as HTMLInputElement).value;
    this._filterItems();
  };

  private _filterItems(): void {
    const q = this._query.toLowerCase();
    const items = this.querySelectorAll<HTMLElement>('void-menu-item');
    items.forEach(item => {
      const text = (item.textContent?.trim() ?? '').toLowerCase();
      const value = (item.getAttribute('value') ?? '').toLowerCase();
      const match = !q || text.includes(q) || value.includes(q);
      if (match) {
        item.removeAttribute('hidden');
      } else {
        item.setAttribute('hidden', '');
      }
    });

    // Hide groups where all items are hidden
    const groups = this.querySelectorAll<HTMLElement>('void-menu-group');
    groups.forEach(group => {
      const visibleItems = group.querySelectorAll('void-menu-item:not([hidden])');
      if (visibleItems.length === 0) {
        group.setAttribute('hidden', '');
      } else {
        group.removeAttribute('hidden');
      }
    });

    this._updateEmptyState();
  }

  private _updateEmptyState(): void {
    const list = this.querySelector('.void-menu-list');
    if (!list) return;
    let emptyEl = this.querySelector('.void-menu-empty');
    const visibleItems = this.querySelectorAll('void-menu-item:not([hidden])');

    if (visibleItems.length === 0 && this._query) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.className = 'void-menu-empty';
        emptyEl.textContent = 'No results found';
        this._projection.own(emptyEl);
        list.appendChild(emptyEl);
      }
    } else if (emptyEl) {
      emptyEl.remove();
    }
  }

  private _clearSearch(): void {
    this._query = '';
    const input = this.querySelector<HTMLInputElement>('.void-menu-search');
    if (input) input.value = '';
    // Unhide all items and groups
    this.querySelectorAll('void-menu-item[hidden], void-menu-group[hidden]').forEach(el => {
      el.removeAttribute('hidden');
    });
    const emptyEl = this.querySelector('.void-menu-empty');
    if (emptyEl) emptyEl.remove();
  }

  render() {
    // The list is always rendered so projected items survive close/reopen; hidden while closed.
    return html`
      ${this.open && this.searchable ? html`
        <input
          class="void-menu-search"
          type="text"
          placeholder=${this.placeholder}
          autocomplete="off"
          aria-label=${this.placeholder}
          @input=${this._onSearchInput}
        />
      ` : nothing}
      <div class="void-menu-list" role="menu" aria-label=${this.getAttribute('aria-label') || 'Menu'} ?hidden=${!this.open}></div>
    `;
  }
}

if (!customElements.get('void-menu')) {
  customElements.define('void-menu', VoidMenu);
}

/** One action in a `void-menu`: activating it (click, Enter or Space) fires `void-select` with its `value`. */
export class VoidMenuItem extends VoidElement {
  /**
   * Identifier the item reports in the `void-select` event's `detail.value`. Use it instead of matching
   * on the item's text.
   */
  @property({ type: String }) value = '';
  /** Dim the item, skip it in keyboard navigation and stop it firing `void-select`. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Text shown at the end of the row to advertise a keyboard shortcut, such as `Ctrl+K`. Display only:
   * it does not bind the key.
   */
  @property({ type: String }) shortcut = '';
  /** Text drawn before the label, usually a single glyph or emoji. It is plain text, not an icon name. */
  @property({ type: String }) icon = '';

  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'label', target: () => this.querySelector(':scope > .void-menu-item-label') }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'menuitem');
    // Roving tabindex: the owning menu makes one item its tab stop (see _setTabStop).
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
    super.updated(changed);
    if (changed.has('disabled')) {
      this.setHostAttribute('tabindex', '-1');
      this.setHostAttribute('aria-disabled', String(this.disabled));
    }
  }

  /** @internal Set by the owning menu: whether this item is the menu's tab stop. */
  _setTabStop(stop: boolean): void {
    this.setHostAttribute('tabindex', stop && !this.disabled ? '0' : '-1');
  }

  render() {
    // The label wrapper is always rendered: it is the stable container consumer content is projected into.
    return html`${this.icon ? html`<span class="void-menu-item-icon">${this.icon}</span>` : nothing}<span class="void-menu-item-label"></span>${this.shortcut ? html`<span class="void-menu-item-shortcut">${this.shortcut}</span>` : nothing}`;
  }

  private _handleClick = (e: Event): void => {
    if (this.disabled) {
      e.stopImmediatePropagation();
      return;
    }
    this.dispatchEvent(new CustomEvent('void-select', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !this.disabled) {
      e.preventDefault();
      this._handleClick(e);
    }
  };
}

if (!customElements.get('void-menu-item')) {
  customElements.define('void-menu-item', VoidMenuItem);
}

/** Labelled group of `void-menu-item`s inside a `void-menu`, with a heading drawn from `label`. */
export class VoidMenuGroup extends VoidElement {
  /** Heading of the group, also its accessible name. */
  @property({ type: String, reflect: true }) label = '';

  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'items', target: () => this.querySelector(':scope > .void-menu-group-items') }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'group');
    if (this.label) {
      this.setHostAttribute('aria-label', this.label);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label') && this.label) {
      this.setHostAttribute('aria-label', this.label);
    }
  }

  render() {
    return html`
      ${this.label ? html`<div class="void-menu-group-label">${this.label}</div>` : nothing}
      <div class="void-menu-group-items"></div>
    `;
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
