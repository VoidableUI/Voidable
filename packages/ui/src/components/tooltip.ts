import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { OverlayController } from '../overlay.js';

/**
 * Hover hint for icon buttons and truncated text that need a label without cluttering the visible interface.
 *
 * Follows the WAI-ARIA tooltip pattern: the trigger (the first child that is not the bubble) is described by the
 * bubble with `aria-describedby`, also when it arrives after the tooltip rendered. The bubble appears after `delay`
 * on pointer hover and at once on keyboard focus, never takes focus, and Escape hides it. It is shown in the top
 * layer and placed with CSS anchor positioning, flipping at viewport edges.
 *
 * @fires {CustomEvent<{ reason: 'hover' | 'focus' | 'api' }>} void-open - The tooltip appeared.
 * @fires {CustomEvent<{ reason: 'hover' | 'blur' | 'escape' | 'parent' | 'api' }>} void-close - The tooltip is hiding.
 */
export class VoidTooltip extends VoidElement {
  /** The hint text shown in the bubble. Keep it short and supplementary: it only appears on hover or focus. */
  @property({ type: String }) text = '';
  /** Side of the trigger the tooltip appears on; it flips to the opposite side when there is no room. */
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  /** Alignment with the trigger along that side. */
  @property({ type: String, reflect: true }) align: 'start' | 'center' | 'end' = 'center';
  /** Milliseconds the pointer rests on the trigger before the bubble appears (keyboard focus shows it at once). Defaults to 200. */
  @property({ type: Number }) delay = 200;
  /** Whether the tooltip is shown. It opens and closes itself from hover, focus and Escape; set it to drive it from script. */
  @property({ type: Boolean, reflect: true }) open = false;

  private _timerId: ReturnType<typeof setTimeout> | undefined;
  private _tooltipId = 'void-tooltip-' + Math.random().toString(36).slice(2);
  /** The trigger the bubble currently describes. */
  private _described: Element | null = null;
  /** The trigger can arrive after the tooltip (blocking script in the head, framework rendering, morphs). */
  private _observer: MutationObserver | null = null;

  protected readonly _overlay: OverlayController = new OverlayController(this, {
    kind: 'tooltip',
    surface: () => this.querySelector<HTMLElement>(':scope > .void-tooltip-bubble'),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    trigger: () => this._trigger(),
    anchor: (): Element => this._trigger() ?? this,
    placement: () => ({ side: this.position, align: this.align }),
  });

  connectedCallback(): void {
    super.connectedCallback();
    this._observer ??= new MutationObserver(() => this._describeTrigger());
    this._observer.observe(this, { childList: true });
    this._describeTrigger();
    this.addEventListener('mouseenter', this._onMouseEnter);
    this.addEventListener('mouseleave', this._onMouseLeave);
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timerId);
    this._observer?.disconnect();
    this.removeEventListener('mouseenter', this._onMouseEnter);
    this.removeEventListener('mouseleave', this._onMouseLeave);
    this.removeEventListener('focusin', this._onFocusIn);
    this.removeEventListener('focusout', this._onFocusOut);
  }

  /** The described element: the first child element that is not the bubble. */
  private _trigger(): HTMLElement | null {
    for (const child of Array.from(this.children)) {
      if (!child.classList.contains('void-tooltip-bubble')) return child as HTMLElement;
    }
    return null;
  }

  // The trigger (consumer content) stays on the host; the bubble is rendered after it.
  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    this._describeTrigger();
  }

  /** The trigger is described by the bubble, keeping any other descriptions it has. */
  private _describeTrigger(): void {
    const trigger = this._trigger();
    if (this._described && this._described !== trigger) this._release(this._described);
    this._described = trigger;
    if (!trigger) return;
    const tokens = this._tokens(trigger);
    // A copy of a described trigger (innerHTML += on the region around it, a
    // page-cache snapshot) still names the bubble of the tooltip it was copied
    // from, which no longer exists: drop such tokens, or each copy adds one.
    const doc = this.ownerDocument;
    const next = tokens.filter(t => t === this._tooltipId || !t.startsWith('void-tooltip-') || !!doc.getElementById(t));
    if (!next.includes(this._tooltipId)) next.push(this._tooltipId);
    if (next.join(' ') !== tokens.join(' ')) trigger.setAttribute('aria-describedby', next.join(' '));
  }

  private _tokens(el: Element): string[] {
    return (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  }

  private _release(el: Element): void {
    const rest = this._tokens(el).filter(t => t !== this._tooltipId);
    if (rest.length) el.setAttribute('aria-describedby', rest.join(' '));
    else el.removeAttribute('aria-describedby');
  }

  private _onMouseEnter = (): void => {
    clearTimeout(this._timerId);
    this._timerId = setTimeout(() => this._overlay.requestOpen('hover'), this.delay);
  };

  private _onMouseLeave = (): void => {
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

  render() {
    // The bubble is named by its text content, which the static lint rule cannot see.
    // eslint-disable-next-line lit-a11y/accessible-name
    return html`<span id="${this._tooltipId}" class="void-tooltip-bubble" role="tooltip" popover="manual">${this.text}</span>`;
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
