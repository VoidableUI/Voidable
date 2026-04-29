import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidStatusDot extends VoidElement {
  @property({ type: String, reflect: true }) status: 'online' | 'away' | 'offline' = 'offline';

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', this._ariaLabel());
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('status')) {
      this.setAttribute('aria-label', this._ariaLabel());
    }
  }

  private _ariaLabel(): string {
    switch (this.status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'offline':
      default: return 'Offline';
    }
  }
}

if (!customElements.get('void-status-dot')) {
  customElements.define('void-status-dot', VoidStatusDot);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-status-dot': VoidStatusDot;
  }
}
