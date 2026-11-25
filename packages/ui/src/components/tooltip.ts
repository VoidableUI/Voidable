import { html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/**
 * Hover hint for icon buttons and truncated text that need a label without cluttering the visible interface.
 *
 * The trigger (the first child that is not the bubble) is described by the bubble with `aria-describedby`,
 * also when it arrives after the tooltip rendered. The tooltip shows on hover and on focus within, and
 * Escape hides it.
 */
export class VoidTooltip extends VoidElement {
  /**
   * The hint text shown in the bubble. Keep it short: it is not for anything the user must read, since
   * it only appears on hover or focus.
   */
  @property({ type: String }) text = '';
  /** Which side of the trigger the bubble appears on: `top` (default), `bottom`, `left` or `right`. */
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  /** Milliseconds the pointer rests on the trigger before the bubble appears. Defaults to 200. */
  @property({ type: Number }) delay = 200;

  @state() private _visible = false;

  private _timerId: ReturnType<typeof setTimeout> | undefined;
  private _tooltipId = 'void-tooltip-' + Math.random().toString(36).slice(2);
  /** The trigger the bubble currently describes. */
  private _described: Element | null = null;
  /** The trigger can arrive after the tooltip (blocking script in the head, framework rendering, morphs). */
  private _observer: MutationObserver | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this._observer ??= new MutationObserver(() => this._describeTrigger());
    this._observer.observe(this, { childList: true });
    this._describeTrigger();
    this.addEventListener('mouseenter', this._onMouseEnter);
    this.addEventListener('mouseleave', this._onMouseLeave);
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
    document.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timerId);
    this._observer?.disconnect();
    this.removeEventListener('mouseenter', this._onMouseEnter);
    this.removeEventListener('mouseleave', this._onMouseLeave);
    this.removeEventListener('focusin', this._onFocusIn);
    this.removeEventListener('focusout', this._onFocusOut);
    document.removeEventListener('keydown', this._onKeydown);
  }

  // The trigger (consumer content) stays on the host; the bubble is rendered after it.
  protected override updated(): void {
    if (this._visible) {
      this.setHostAttribute('visible', '');
    } else {
      this.setHostAttribute('visible', null);
    }

    this._describeTrigger();
  }

  /** The trigger is the first element that is not the bubble; it is described by the bubble. */
  private _describeTrigger(): void {
    const trigger = Array.from(this.children).find(c => !c.classList.contains('void-tooltip-bubble')) ?? null;
    if (this._described && this._described !== trigger) this._release(this._described);
    this._described = trigger;
    if (trigger && !this._tokens(trigger).includes(this._tooltipId)) {
      trigger.setAttribute('aria-describedby', [...this._tokens(trigger), this._tooltipId].join(' '));
    }
  }

  private _tokens(el: Element): string[] {
    return (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  }

  private _release(el: Element): void {
    const rest = this._tokens(el).filter(t => t !== this._tooltipId);
    if (rest.length) el.setAttribute('aria-describedby', rest.join(' '));
    else el.removeAttribute('aria-describedby');
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._visible) {
      clearTimeout(this._timerId);
      this._visible = false;
      this.requestUpdate();
    }
  };

  private _onMouseEnter = (): void => {
    clearTimeout(this._timerId);
    this._timerId = setTimeout(() => {
      this._visible = true;
      this.requestUpdate();
    }, this.delay);
  };

  private _onMouseLeave = (): void => {
    clearTimeout(this._timerId);
    this._visible = false;
    this.requestUpdate();
  };

  private _onFocusIn = (): void => {
    clearTimeout(this._timerId);
    this._visible = true;
    this.requestUpdate();
  };

  private _onFocusOut = (): void => {
    clearTimeout(this._timerId);
    this._visible = false;
    this.requestUpdate();
  };

  render() {
    // The bubble is named by its text content, which the static lint rule cannot see.
    // eslint-disable-next-line lit-a11y/accessible-name
    return html`<span id="${this._tooltipId}" class="void-tooltip-bubble" role="tooltip">${this.text}</span>`;
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
