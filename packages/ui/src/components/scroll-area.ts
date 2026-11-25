import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Scrollable container with styled scrollbars for long content areas, code blocks, and chat histories. */
export class VoidScrollArea extends VoidElement {
  @property({ type: String }) maxHeight = '';
  @property({ type: String, reflect: true }) direction: 'vertical' | 'horizontal' | 'both' = 'vertical';

  // Consumer content is projected into the scroll viewport.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'viewport', target: () => this.querySelector(':scope > .void-scroll-area-viewport') }],
  });

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    this.style.setProperty('--void-scroll-area-max-height', this.maxHeight || '');
  }

  render() {
    return html`<div class="void-scroll-area-viewport"></div>`;
  }
}

if (!customElements.get('void-scroll-area')) {
  customElements.define('void-scroll-area', VoidScrollArea);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-scroll-area': VoidScrollArea;
  }
}
