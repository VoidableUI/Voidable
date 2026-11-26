import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/**
 * Small status chip for issue trackers, tag systems, and categorization UIs where color conveys state at a glance.
 *
 * A badge has no role: it is text beside other text, and a screen reader reads it where it sits. It is not
 * a live region, because a table of status badges would announce every one as it is inserted. For the one
 * badge whose change must be heard (a count that updates while the user works), write `role="status"` on it
 * yourself; the component leaves it alone.
 */
export class VoidBadge extends VoidElement {
  /**
   * Status colour: `default`, `error`, `warning`, `caution`, `success`, `info`, `notice` or `highlight`.
   * Colour carries the state, so also say the state in the badge text.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** `filled` (default) fills the badge with its colour; `outline` draws only a border and tinted text. */
  @property({ type: String, reflect: true }) variant: 'filled' | 'outline' = 'filled';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
}

if (!customElements.get('void-badge')) {
  customElements.define('void-badge', VoidBadge);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-badge': VoidBadge;
  }
}
