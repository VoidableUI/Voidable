import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Always-visible menu panel for command palettes, side panels, and searchable action lists. */
export class VoidMenu extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) searchable = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String }) placeholder = 'Search...';

  private _query = '';
  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'menu');
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    if (!this._didSetup) {
      this._didSetup = true;
      const list = this.querySelector('.void-menu-list');
      if (list) {
        for (const n of this._userContent) list.appendChild(n);
      }
    }

    if (changed.has('open') && this.open && this.searchable) {
      requestAnimationFrame(() => {
        const input = this.querySelector<HTMLInputElement>('.void-menu-search');
        input?.focus();
      });
    }
  }

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.open = false;
      this._clearSearch();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = Array.from(
        this.querySelectorAll<HTMLElement>('void-menu-item:not([disabled]):not([hidden])')
      );
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') {
        (items[idx + 1] ?? items[0]).focus();
      } else {
        (items[idx - 1] ?? items[items.length - 1]).focus();
      }
    }
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
    if (!this.open) return nothing;
    return html`
      ${this.searchable ? html`
        <input
          class="void-menu-search"
          type="text"
          placeholder=${this.placeholder}
          autocomplete="off"
          @input=${this._onSearchInput}
        />
      ` : nothing}
      <div class="void-menu-list" role="listbox" aria-label="Menu options"></div>
    `;
  }
}

if (!customElements.get('void-menu')) {
  customElements.define('void-menu', VoidMenu);
}

export class VoidMenuItem extends VoidElement {
  @property({ type: String }) value = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String }) shortcut = '';
  @property({ type: String }) icon = '';

  private _originalContent: Node[] | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'menuitem');
    this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);

    if (this._originalContent === null) {
      this._originalContent = Array.from(this.childNodes).map(n => n.cloneNode(true));
    }
    this._buildContent();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('disabled')) {
      this.setAttribute('tabindex', this.disabled ? '-1' : '0');
      this.setAttribute('aria-disabled', String(this.disabled));
    }
  }

  private _buildContent(): void {
    // Only restructure if we have icon or shortcut
    if (!this.icon && !this.shortcut) return;

    const fragment = document.createDocumentFragment();

    if (this.icon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'void-menu-item-icon';
      iconEl.textContent = this.icon;
      fragment.appendChild(iconEl);
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'void-menu-item-label';
    if (this._originalContent) {
      for (const n of this._originalContent) {
        labelEl.appendChild(n.cloneNode(true));
      }
    }
    fragment.appendChild(labelEl);

    if (this.shortcut) {
      const shortcutEl = document.createElement('span');
      shortcutEl.className = 'void-menu-item-shortcut';
      shortcutEl.textContent = this.shortcut;
      fragment.appendChild(shortcutEl);
    }

    this.textContent = '';
    this.appendChild(fragment);
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

export class VoidMenuGroup extends VoidElement {
  @property({ type: String, reflect: true }) label = '';

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    if (this.label) {
      this.setAttribute('aria-label', this.label);
    }
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label') && this.label) {
      this.setAttribute('aria-label', this.label);
    }
    if (!this._didSetup) {
      this._didSetup = true;
      const container = this.querySelector('.void-menu-group-items');
      if (container) {
        for (const n of this._userContent) container.appendChild(n);
      }
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
