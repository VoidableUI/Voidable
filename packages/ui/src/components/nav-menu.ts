import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Horizontal navigation bar with dropdown sub-menus for site headers, application nav bars, and mega-menu layouts. */
export class VoidNavMenu extends VoidElement {
  @property({ type: String, reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';
  @property({ type: String, reflect: true }) width: string = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'menubar');
    this.addEventListener('keydown', this._handleKeydown);
    this.addEventListener('void-open', this._handleItemOpen as EventListener);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    this.removeEventListener('void-open', this._handleItemOpen as EventListener);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('width')) {
      if (this.width) {
        this.style.setProperty('--void-nav-menu-width', this.width); // style-ok
      } else {
        this.style.removeProperty('--void-nav-menu-width');
      }
    }
  }

  private _handleItemOpen = (e: CustomEvent): void => {
    const target = e.target as VoidNavMenuItem;
    const items = this._getItems();
    for (const item of items) {
      if (item !== target && item.open) {
        item.open = false;
        item.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
      }
    }
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    const items = this._getItems();
    if (!items.length) return;

    const isHorizontal = this.orientation === 'horizontal';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    if (e.key === nextKey || e.key === prevKey) {
      e.preventDefault();
      const triggers = items.map(item => item.querySelector('.void-nav-menu-trigger') as HTMLElement).filter(Boolean);
      const idx = triggers.indexOf(document.activeElement as HTMLElement);
      if (e.key === nextKey) {
        (triggers[idx + 1] ?? triggers[0])?.focus();
      } else {
        (triggers[idx - 1] ?? triggers[triggers.length - 1])?.focus();
      }
    }

    if (e.key === 'Enter' || e.key === ' ') {
      const activeEl = document.activeElement as HTMLElement;
      const item = activeEl?.closest?.('void-nav-menu-item') as VoidNavMenuItem | null;
      if (item && this.contains(item) && !item.href) {
        e.preventDefault();
        item.open = !item.open;
        if (item.open) {
          item.dispatchEvent(new CustomEvent('void-open', { bubbles: true, composed: true }));
        } else {
          item.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
        }
      }
    }

    if (e.key === 'Escape') {
      for (const item of items) {
        if (item.open) {
          item.open = false;
          item.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
          const trigger = item.querySelector('.void-nav-menu-trigger') as HTMLElement;
          trigger?.focus();
        }
      }
    }
  };

  private _getItems(): VoidNavMenuItem[] {
    return Array.from(this.querySelectorAll<VoidNavMenuItem>(':scope > void-nav-menu-item'));
  }
}

if (!customElements.get('void-nav-menu')) {
  customElements.define('void-nav-menu', VoidNavMenu);
}

/** Individual navigation item with optional dropdown content panel for sub-menus and mega-menu layouts. */
export class VoidNavMenuItem extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String }) href = '';
  @property({ type: Boolean, reflect: true }) active = false;

  private _triggerEl: HTMLElement | null = null;
  private _contentEl: HTMLDivElement | null = null;
  private _contentNodes: Node[] = [];
  private _didSetup = false;
  private _openTimerId: ReturnType<typeof setTimeout> | undefined;
  private _closeTimerId: ReturnType<typeof setTimeout> | undefined;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'none');

    if (!this._didSetup) {
      this._contentNodes = Array.from(this.childNodes);
    }

    this.addEventListener('mouseenter', this._onMouseEnter);
    this.addEventListener('mouseleave', this._onMouseLeave);
    document.addEventListener('mousedown', this._onOutsideClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._openTimerId);
    clearTimeout(this._closeTimerId);
    this.removeEventListener('mouseenter', this._onMouseEnter);
    this.removeEventListener('mouseleave', this._onMouseLeave);
    document.removeEventListener('mousedown', this._onOutsideClick);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    if (!this._didSetup) {
      this._didSetup = true;

      // Build the trigger element
      if (this.href) {
        this._triggerEl = document.createElement('a');
        (this._triggerEl as HTMLAnchorElement).href = this.href;
      } else {
        this._triggerEl = document.createElement('button');
        (this._triggerEl as HTMLButtonElement).type = 'button';
      }
      this._triggerEl.className = 'void-nav-menu-trigger';
      this._triggerEl.setAttribute('role', 'menuitem');
      this._triggerEl.setAttribute('tabindex', this.disabled ? '-1' : '0');

      // Separate text content from child elements for the dropdown
      const textNodes: Node[] = [];
      const dropdownNodes: Node[] = [];

      for (const node of this._contentNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          textNodes.push(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          dropdownNodes.push(node);
        }
      }

      // Put text nodes inside the trigger
      for (const node of textNodes) {
        this._triggerEl.appendChild(node);
      }

      this.appendChild(this._triggerEl);

      // If there are child elements, they form the dropdown content
      if (dropdownNodes.length > 0) {
        this._triggerEl.setAttribute('aria-haspopup', 'true');
        this._triggerEl.setAttribute('aria-expanded', String(this.open));

        this._contentEl = document.createElement('div');
        this._contentEl.className = 'void-nav-menu-content';
        this._contentEl.setAttribute('role', 'menu');

        for (const node of dropdownNodes) {
          this._contentEl.appendChild(node);
        }

        this._contentEl.addEventListener('mouseenter', this._onContentEnter);
        this._contentEl.addEventListener('mouseleave', this._onContentLeave);
        this.appendChild(this._contentEl);
      }
    }

    if (changed.has('open') && this._triggerEl) {
      this._triggerEl.setAttribute('aria-expanded', String(this.open));
    }

    if (changed.has('disabled') && this._triggerEl) {
      this._triggerEl.setAttribute('tabindex', this.disabled ? '-1' : '0');
      this._triggerEl.setAttribute('aria-disabled', String(this.disabled));
      if (this._triggerEl instanceof HTMLButtonElement) {
        this._triggerEl.disabled = this.disabled;
      }
    }

    if (changed.has('href') && this._triggerEl instanceof HTMLAnchorElement) {
      this._triggerEl.href = this.href;
    }
  }

  private _onMouseEnter = (): void => {
    if (this.disabled || !this._contentEl) return;
    clearTimeout(this._closeTimerId);
    this._openTimerId = setTimeout(() => {
      this._openDropdown();
    }, 150);
  };

  private _onMouseLeave = (): void => {
    if (!this._contentEl) return;
    clearTimeout(this._openTimerId);
    this._closeTimerId = setTimeout(() => {
      this._closeDropdown();
    }, 300);
  };

  private _onContentEnter = (): void => {
    clearTimeout(this._closeTimerId);
  };

  private _onContentLeave = (): void => {
    this._closeTimerId = setTimeout(() => {
      this._closeDropdown();
    }, 300);
  };

  private _onOutsideClick = (e: MouseEvent): void => {
    if (this.open && !this.contains(e.target as Node)) {
      this._closeDropdown();
    }
  };

  private _openDropdown(): void {
    if (!this.open) {
      this.open = true;
      this.dispatchEvent(new CustomEvent('void-open', { bubbles: true, composed: true }));
    }
  }

  private _closeDropdown(): void {
    if (this.open) {
      this.open = false;
      this.dispatchEvent(new CustomEvent('void-close', { bubbles: true, composed: true }));
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
