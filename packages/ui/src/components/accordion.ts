import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidAccordion extends VoidElement {
  @property({ type: Boolean, reflect: true }) multiple = false;
}

if (!customElements.get('void-accordion')) {
  customElements.define('void-accordion', VoidAccordion);
}

export class VoidAccordionItem extends VoidElement {
  @property({ type: String }) heading = '';
  @property({ type: Boolean, reflect: true }) open = false;

  private _id = Math.random().toString(36).slice(2);
  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (!this._didSetup) {
      this._didSetup = true;
      const content = this.querySelector('.void-accordion-content');
      if (content) {
        for (const node of this._userContent) {
          content.appendChild(node);
        }
      }
    }
  }

  private _handleClick = (e: Event): void => {
    e.preventDefault();
    this.open = !this.open;
    const parent = this.parentElement;
    if (parent instanceof VoidAccordion && !parent.multiple) {
      const siblings = Array.from(parent.querySelectorAll('void-accordion-item')) as VoidAccordionItem[];
      for (const sib of siblings) {
        if (sib !== this) sib.open = false;
      }
    }
    this.dispatchEvent(new CustomEvent('void-toggle', {
      bubbles: true,
      composed: true,
      detail: { open: this.open },
    }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleClick(e);
    }
  };

  render() {
    return html`
      <button
        id="trigger-${this._id}"
        class="void-accordion-trigger"
        aria-expanded=${String(this.open)}
        aria-controls="content-${this._id}"
        @click=${this._handleClick}
        @keydown=${this._handleKeydown}
      >
        ${this.heading}
        <svg class="void-accordion-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div
        id="content-${this._id}"
        class="void-accordion-content"
        role="region"
        aria-labelledby="trigger-${this._id}"
      ></div>
    `;
  }
}

if (!customElements.get('void-accordion-item')) {
  customElements.define('void-accordion-item', VoidAccordionItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-accordion': VoidAccordion;
    'void-accordion-item': VoidAccordionItem;
  }
}
