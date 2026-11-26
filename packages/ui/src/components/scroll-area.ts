import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Scrollable container with styled scrollbars for long content areas, code blocks, and chat histories. */
export class VoidScrollArea extends VoidElement {
  /**
   * CSS length (for example `20rem` or `50vh`) at which the area stops growing and scrolls. Without it
   * the area is as tall as its content and does not scroll vertically.
   */
  @property({ type: String, attribute: 'max-height' }) maxHeight = '';
  /** Which way the content scrolls: `vertical` (default), `horizontal` or `both`. */
  @property({ type: String, reflect: true }) orientation: 'vertical' | 'horizontal' | 'both' = 'vertical';

  // Consumer content is projected into the scroll viewport.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'viewport', target: () => this.querySelector(':scope > .void-scroll-area-viewport'), scrolls: true }],
  });

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    this.setHostStyle('--void-scroll-area-max-height', this.maxHeight || '');
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
