import { html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Hover hint for icon buttons and truncated text that need a label without cluttering the visible interface. */
export class VoidTooltip extends VoidElement {
  @property({ type: String }) text = '';
  @property({ type: String, reflect: true }) position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  @property({ type: Number }) delay = 200;

  @state() private _visible = false;

  private _timerId: ReturnType<typeof setTimeout> | undefined;
  private _tooltipId = 'void-tooltip-' + Math.random().toString(36).slice(2);
  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('mouseenter', this._onMouseEnter);
    this.addEventListener('mouseleave', this._onMouseLeave);
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
    document.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timerId);
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

    const trigger = this.children[0] as HTMLElement | undefined;
    if (trigger && !trigger.classList.contains('void-tooltip-bubble') && trigger.getAttribute('aria-describedby') !== this._tooltipId) {
      trigger.setAttribute('aria-describedby', this._tooltipId);
    }
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
