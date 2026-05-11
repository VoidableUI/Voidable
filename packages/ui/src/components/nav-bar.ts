import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Top application navigation bar for branding, primary links, and user account controls. */
export class VoidNavBar extends VoidElement {
  @property({ type: Boolean, reflect: true }) sticky = false;
  @property({ type: Boolean, reflect: true }) bordered = true;
  @property({ type: String, reflect: true }) variant: 'default' | 'elevated' = 'default';

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'navigation');
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSetup) {
      this._didSetup = true;
      const content = this.querySelector('.void-nav-bar-content')!;
      for (const node of this._userContent) {
        content.appendChild(node);
      }
    }
  }

  render() {
    return html`<div class="void-nav-bar-content"></div>`;
  }
}

if (!customElements.get('void-nav-bar')) {
  customElements.define('void-nav-bar', VoidNavBar);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-nav-bar': VoidNavBar;
  }
}
