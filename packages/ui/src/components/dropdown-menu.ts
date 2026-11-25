import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement, ProjectionController } from '../base.js';

/** Trigger-anchored action menu for table row actions, toolbar overflow menus, and context menus. */
export class VoidDropdownMenu extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String, reflect: true }) position: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' = 'bottom-start';

  // The first element child is the trigger and stays before the panel; everything else goes into the panel.
  protected readonly _projection: ProjectionController = new ProjectionController(this, {
    regions: [
      {
        name: 'trigger',
        target: 'before',
        accepts: node => node instanceof Element && !this._projection.nodes('trigger').some(n => n instanceof Element),
      },
      { name: 'panel', target: () => this.querySelector(':scope > .void-dropdown-menu-panel') },
    ],
  });

  private get _triggerEl(): Element | null {
    return (this._projection.nodes('trigger').find(n => n instanceof Element) as Element | undefined) ?? null;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Delegated on the host so a replaced trigger keeps working and reconnects never stack listeners.
    this.addEventListener('click', this._handleTriggerClick);
    document.addEventListener('mousedown', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleTriggerClick);
    document.removeEventListener('mousedown', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  render() {
    return html`<div class="void-dropdown-menu-panel" role="menu" ?hidden=${!this.open}></div>`;
  }

  private _handleTriggerClick = (e: Event): void => {
    const trigger = this._triggerEl;
    if (trigger && trigger.contains(e.target as Node)) {
      this.open = !this.open;
    }
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
