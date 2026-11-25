import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Horizontal navigation bar with dropdown sub-menus for site headers, application nav bars, and mega-menu layouts. */
export class VoidNavMenu extends VoidElement {
  @property({ type: String, reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';
  @property({ type: String, reflect: true }) width: string = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'menubar');
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
        this.setHostStyle('--void-nav-menu-width', this.width); // style-ok
      } else {
        this.setHostStyle('--void-nav-menu-width', null);
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

  private _openTimerId: ReturnType<typeof setTimeout> | undefined;
  private _closeTimerId: ReturnType<typeof setTimeout> | undefined;
  /** Decided at the first render and kept, so the trigger container is never re-created. */
  private _asLink: boolean | null = null;

  // Non-empty text goes into the trigger; child elements form the dropdown content.
  protected readonly _projection = new ProjectionController(this, {
    regions: [
      {
        name: 'label',
        target: () => this.querySelector(':scope > .void-nav-menu-trigger'),
        accepts: node => node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim(),
      },
      {
        name: 'content',
        target: () => this.querySelector(':scope > .void-nav-menu-content'),
        accepts: node => node.nodeType === Node.ELEMENT_NODE,
      },
    ],
    onChange: () => this.requestUpdate(),
  });

  private get _hasContent(): boolean {
    return this._projection.nodes('content').length > 0;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'none');
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
    // Whether there is dropdown content is only known once children are projected.
    const content = this.querySelector(':scope > .void-nav-menu-content');
    const trigger = this.querySelector(':scope > .void-nav-menu-trigger');
    const has = this._hasContent;
    if (content && content.hasAttribute('hidden') === has) content.toggleAttribute('hidden', !has);
    if (trigger) {
      if (has) {
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', String(this.open));
      } else {
        trigger.removeAttribute('aria-haspopup');
        trigger.removeAttribute('aria-expanded');
      }
    }
  }

  render() {
    this._asLink ??= !!this.href;
    const tabindex = this.disabled ? '-1' : '0';
    // The trigger is named by the consumer's text, projected into it, which the static lint rule cannot see.
    const trigger = this._asLink
      ? // eslint-disable-next-line lit-a11y/accessible-name
        html`<a class="void-nav-menu-trigger" role="menuitem" href=${this.href || nothing} tabindex=${tabindex}
          aria-disabled=${this.disabled ? 'true' : nothing}></a>`
      : // eslint-disable-next-line lit-a11y/accessible-name
        html`<button type="button" class="void-nav-menu-trigger" role="menuitem" tabindex=${tabindex}
          ?disabled=${this.disabled} aria-disabled=${this.disabled ? 'true' : nothing}></button>`;
    return html`${trigger}<div class="void-nav-menu-content" role="menu" hidden
      @mouseenter=${this._onContentEnter} @mouseleave=${this._onContentLeave}></div>`;
  }

  private _onMouseEnter = (): void => {
    if (this.disabled || !this._hasContent) return;
    clearTimeout(this._closeTimerId);
    this._openTimerId = setTimeout(() => {
      this._openDropdown();
    }, 150);
  };

  private _onMouseLeave = (): void => {
    if (!this._hasContent) return;
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
