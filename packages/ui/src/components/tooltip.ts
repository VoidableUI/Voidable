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
  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    this._userContent = Array.from(this.childNodes);
    super.connectedCallback();
    this.addEventListener('mouseenter', this._onMouseEnter);
    this.addEventListener('mouseleave', this._onMouseLeave);
    this.addEventListener('focusin', this._onFocusIn);
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timerId);
    this.removeEventListener('mouseenter', this._onMouseEnter);
    this.removeEventListener('mouseleave', this._onMouseLeave);
    this.removeEventListener('focusin', this._onFocusIn);
    this.removeEventListener('focusout', this._onFocusOut);
  }

  protected override updated(): void {
    if (!this._didSetup) {
      this._didSetup = true;
      const bubble = this.querySelector('.void-tooltip-bubble');
      if (bubble) {
        for (const node of this._userContent) {
          this.insertBefore(node, bubble);
        }
      }
    }

    if (this._visible) {
      this.setAttribute('visible', '');
    } else {
      this.removeAttribute('visible');
    }

    const trigger = this.children[0] as HTMLElement | undefined;
    if (trigger) {
      if (this._visible) {
        trigger.setAttribute('aria-describedby', this._tooltipId);
      } else {
        trigger.removeAttribute('aria-describedby');
      }
    }
  }

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
    return html`<span id="${this._tooltipId}" class="void-tooltip-bubble" role="tooltip" aria-label=${this.text}>${this.text}</span>`;
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
