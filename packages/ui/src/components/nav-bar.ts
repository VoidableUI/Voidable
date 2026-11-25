import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';
import { defaultTrueBoolean } from '../converters.js';

/** Top application navigation bar for branding, primary links, and user account controls. */
export class VoidNavBar extends VoidElement {
  @property({ type: Boolean, reflect: true }) sticky = false;
  @property({ type: Boolean, reflect: true, converter: defaultTrueBoolean }) bordered = true;
  @property({ type: String, reflect: true }) variant: 'default' | 'elevated' = 'default';

  // Consumer content is projected into the content wrapper.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'content', target: () => this.querySelector(':scope > .void-nav-bar-content') }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'navigation');
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
