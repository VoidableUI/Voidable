import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidDropdownMenu extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String, reflect: true }) position: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' = 'bottom-start';

  private _triggerEl: Element | null = null;
  private _panel: HTMLDivElement | null = null;

  connectedCallback(): void {
    super.connectedCallback();

    this._triggerEl = this.children[0] ?? null;

    this._panel = document.createElement('div');
    this._panel.className = 'void-dropdown-menu-panel';
    this._panel.setAttribute('role', 'menu');

    const nodes = Array.from(this.childNodes);
    for (const node of nodes) {
      if (node !== this._triggerEl) {
        this._panel.appendChild(node);
      }
    }

    this.appendChild(this._panel);

    this._triggerEl?.addEventListener('click', this._handleTriggerClick);
    document.addEventListener('mousedown', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._triggerEl?.removeEventListener('click', this._handleTriggerClick);
    document.removeEventListener('mousedown', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  private _handleTriggerClick = (): void => {
    this.open = !this.open;
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
    if (!this.open) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = Array.from(this.querySelectorAll<HTMLElement>('void-dropdown-menu-item:not([disabled])'));
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') {
        (items[idx + 1] ?? items[0]).focus();
      } else {
        (items[idx - 1] ?? items[items.length - 1]).focus();
      }
    }
  };
}

if (!customElements.get('void-dropdown-menu')) {
  customElements.define('void-dropdown-menu', VoidDropdownMenu);
}

export class VoidDropdownMenuItem extends VoidElement {
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) destructive = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'menuitem');
    this.setAttribute('tabindex', this.disabled ? '-1' : '0');
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
      this.setAttribute('tabindex', this.disabled ? '-1' : '0');
      this.setAttribute('aria-disabled', String(this.disabled));
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
