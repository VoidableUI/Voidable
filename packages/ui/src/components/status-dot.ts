import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { msg, nameHost } from '../messages.js';

/** Presence indicator for user lists and chat rosters showing online/away/offline state at a glance. */
export class VoidStatusDot extends VoidElement {
  /**
   * Presence state: `online`, `away` or `offline` (default). Sets the colour and the accessible name
   * (`Online`, `Away`, `Offline`).
   */
  @property({ type: String, reflect: true }) status: 'online' | 'away' | 'offline' = 'offline';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'status');
    this._name();
  }

  updated(): void {
    this._name();
  }

  private _name(): void {
    const text = msg(this, this.status === 'online' ? 'statusDot.online' : this.status === 'away' ? 'statusDot.away' : 'statusDot.offline');
    nameHost(this, text, (n, v) => this.setHostAttribute(n, v));
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
