import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { OverlayController } from '../overlay.js';
import { PartsController, triggerControl } from '../parts.js';

/**
 * Hover hint for icon buttons and truncated text that need a label without cluttering the visible interface.
 *
 * Two parts: `<void-tooltip-trigger>` around the described element (one element: a `<void-button>`, a link), and
 * `<void-tooltip-content>` with the hint text. The parts are the final DOM. Follows the WAI-ARIA tooltip pattern:
 * the trigger's element is described by the content with `aria-describedby` (its own descriptions are kept), also
 * when either part arrives after the tooltip upgraded. The content appears after `delay` on pointer hover and at
 * once on keyboard focus, never takes focus, and Escape hides it. It is shown in the top layer and placed with CSS
 * anchor positioning, flipping at viewport edges.
 *
 * @fires {CustomEvent<{ reason: 'hover' | 'focus' | 'api' }>} void-open - The tooltip appeared.
 * @fires {CustomEvent<{ reason: 'hover' | 'blur' | 'escape' | 'parent' | 'api' }>} void-close - The tooltip is hiding.
 */
export class VoidTooltip extends VoidElement {
  /** Side of the trigger the tooltip appears on; it flips to the opposite side when there is no room. */
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  /** Alignment with the trigger along that side. */
  @property({ type: String, reflect: true }) align: 'start' | 'center' | 'end' = 'center';
  /** Milliseconds the pointer rests on the trigger before the content appears (keyboard focus shows it at once). Defaults to 200. */
  @property({ type: Number }) delay = 200;
  /** Whether the tooltip is shown. It opens and closes itself from hover, focus and Escape; set it to drive it from script. */
  @property({ type: Boolean, reflect: true }) open = false;

  private _timerId: ReturnType<typeof setTimeout> | undefined;

  protected readonly _parts = new PartsController(this, {
    tags: ['void-tooltip-trigger', 'void-tooltip-content'],
    onChange: () => {
      this._wire();
      this.requestUpdate();
    },
  });

  protected readonly _overlay: OverlayController = new OverlayController(this, {
    kind: 'tooltip',
    surface: () => this._parts.one('void-tooltip-content'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => this._control(),
    anchor: (): Element => this._control() ?? this,
    placement: () => ({ side: this.position, align: this.align }),
    attr: (el, name, value) => this._parts.set(el, name, value),
    style: (el, p, v) => this._parts.style(el, p, v),
  });

  private _control(): HTMLElement | null {
    return triggerControl(this._parts.one('void-tooltip-trigger'));
  }

  /** The content is the trigger's description. */
  private _wire(): void {
    const content = this._parts.one('void-tooltip-content');
    const control = this._control();
    if (!content) return;
    this._parts.set(content, 'popover', 'manual');
    this._parts.set(content, 'role', 'tooltip');
    const id = this._parts.id(content, 'void-tooltip-content');
    if (control) this._parts.token(control, 'aria-describedby', id);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('mouseover', this._onOver);
    this.addEventListener('mouseout', this._onOut);
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timerId);
    this.removeEventListener('mouseover', this._onOver);
    this.removeEventListener('mouseout', this._onOut);
    this.removeEventListener('focusin', this._onFocusIn);
    this.removeEventListener('focusout', this._onFocusOut);
  }

  private _inTrigger(node: EventTarget | null): boolean {
    return node instanceof Node && !!this._parts.one('void-tooltip-trigger')?.contains(node);
  }

  private _onOver = (e: MouseEvent): void => {
    if (!this._inTrigger(e.target) || this._inTrigger(e.relatedTarget)) return;
    clearTimeout(this._timerId);
    this._timerId = setTimeout(() => this._overlay.requestOpen('hover'), this.delay);
  };

  private _onOut = (e: MouseEvent): void => {
    if (!this._inTrigger(e.target) || this._inTrigger(e.relatedTarget)) return;
    clearTimeout(this._timerId);
    if (this.ownerDocument.activeElement && this.contains(this.ownerDocument.activeElement) && this._focusVisible()) return;
    this._overlay.requestClose('hover');
  };

  private _onFocusIn = (): void => {
    clearTimeout(this._timerId);
    // Keyboard focus only: a click that focuses the trigger is not a request for the hint.
    if (this._focusVisible()) this._overlay.requestOpen('focus');
  };

  private _onFocusOut = (): void => {
    clearTimeout(this._timerId);
    this._overlay.requestClose('blur');
  };

  private _focusVisible(): boolean {
    const active = this.ownerDocument.activeElement;
    if (!active) return false;
    try {
      return active.matches(':focus-visible');
    } catch {
      return true;
    }
  }
}

if (!customElements.get('void-tooltip')) {
  customElements.define('void-tooltip', VoidTooltip);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-tooltip': VoidTooltip;
  }
}
