import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Styled data table for admin lists, report grids, and comparison layouts. */
export class VoidTable extends VoidElement {
  @property({ type: Boolean, reflect: true }) striped = false;
  @property({ type: Boolean, reflect: true }) hoverable = false;
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ type: Boolean, reflect: true }) bordered = false;

}

if (!customElements.get('void-table')) {
  customElements.define('void-table', VoidTable);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-table': VoidTable;
  }
}
