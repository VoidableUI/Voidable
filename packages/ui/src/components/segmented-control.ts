import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Individual option within a VoidSegmentedControl button group. */
export class VoidSegmentedControlItem extends VoidElement {
  @property({ type: String, reflect: true }) value = '';
  @property({ type: Boolean, reflect: true }) disabled = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'radio');
    this.setAttribute('tabindex', this.disabled ? '-1' : '0');
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('disabled')) {
      this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    }
  }
}

if (!customElements.get('void-segmented-control-item')) {
  customElements.define('void-segmented-control-item', VoidSegmentedControlItem);
}

/** Mutually exclusive button group for view mode toggles, time range selectors, and compact tab-like navigation. */
export class VoidSegmentedControl extends VoidElement {
  @property({ type: String, reflect: true }) value = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' | 'highlight' = 'default';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'radiogroup');
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
    this._syncItems();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('value')) {
      this._syncItems();
    }
  }

  private _syncItems(): void {
    const items = Array.from(this.querySelectorAll('void-segmented-control-item')) as VoidSegmentedControlItem[];
    for (const item of items) {
      item.setAttribute('aria-checked', String(item.value === this.value));
    }
  }

  private _handleClick = (e: Event): void => {
    const target = e.target as Element;
    const item = target.closest('void-segmented-control-item') as VoidSegmentedControlItem | null;
    if (!item || item.disabled) return;
    this.value = item.value;
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    const items = Array.from(this.querySelectorAll('void-segmented-control-item:not([disabled])')) as VoidSegmentedControlItem[];
    const current = items.findIndex(item => item.value === this.value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (current + 1) % items.length;
      items[next].focus();
      items[next].click();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (current - 1 + items.length) % items.length;
      items[prev].focus();
      items[prev].click();
    }
  };
}

if (!customElements.get('void-segmented-control')) {
  customElements.define('void-segmented-control', VoidSegmentedControl);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-segmented-control': VoidSegmentedControl;
    'void-segmented-control-item': VoidSegmentedControlItem;
  }
}
