import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Form field wrapper that pairs an input with its label, helper text, and validation error. */
export class VoidField extends VoidElement {
  @property({ type: String, reflect: true }) label = '';
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) helper = '';
  @property({ type: Boolean, reflect: true }) required = false;

  private _userContent: Node[] = [];
  private _didSetup = false;
  private _uid = Math.random().toString(36).slice(2);
  private _labelledControl: Element | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (!this._didSetup) {
      this._didSetup = true;
      const control = this.querySelector('.void-field-control');
      if (control) {
        for (const node of this._userContent) {
          control.appendChild(node);
        }
      }
    }
    this._wireControl();
    // Void controls render their inner native input asynchronously; wire again once they have.
    queueMicrotask(() => { if (this.isConnected) this._wireControl(); });
  }

  /** The element that should carry the accessible name: an inner native control (also inside Void components), else the first child. */
  private _findControl(): Element | null {
    const container = this.querySelector('.void-field-control');
    if (!container) return null;
    return container.querySelector('input, select, textarea') ?? container.firstElementChild;
  }

  private _unwireControl(): void {
    const prev = this._labelledControl;
    if (!prev) return;
    const labelId = `${this._uid}-label`;
    const ids = new Set([`${this._uid}-error`, `${this._uid}-helper`]);
    if (prev.getAttribute('aria-labelledby') === labelId) prev.removeAttribute('aria-labelledby');
    const rest = (prev.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(t => t && !ids.has(t));
    if (rest.length) prev.setAttribute('aria-describedby', rest.join(' '));
    else prev.removeAttribute('aria-describedby');
    if (prev.hasAttribute('data-void-field-invalid')) {
      prev.removeAttribute('aria-invalid');
      prev.removeAttribute('data-void-field-invalid');
    }
    this._labelledControl = null;
  }

  private _wireControl(): void {
    const control = this._findControl();
    if (this._labelledControl && this._labelledControl !== control) this._unwireControl();
    if (!control) return;
    this._labelledControl = control;

    const label = this.querySelector('.void-field-label');
    const labelId = `${this._uid}-label`;
    if (label) {
      label.id = labelId;
      // aria-labelledby wins over any aria-label the inner control sets for itself.
      control.setAttribute('aria-labelledby', labelId);
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(control.tagName)) {
        if (!control.id) control.id = `${this._uid}-control`;
        label.setAttribute('for', control.id);
      } else {
        label.removeAttribute('for');
      }
    } else if (control.getAttribute('aria-labelledby') === labelId) {
      control.removeAttribute('aria-labelledby');
    }

    const ours = new Set([`${this._uid}-error`, `${this._uid}-helper`]);
    const tokens = (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(t => t && !ours.has(t));
    const msg = this.querySelector('.void-field-error, .void-field-helper');
    if (msg) tokens.push(msg.id);
    if (tokens.length) control.setAttribute('aria-describedby', tokens.join(' '));
    else control.removeAttribute('aria-describedby');

    if (this.error) {
      if (!control.hasAttribute('aria-invalid')) control.setAttribute('data-void-field-invalid', '');
      control.setAttribute('aria-invalid', 'true');
    } else if (control.hasAttribute('data-void-field-invalid')) {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('data-void-field-invalid');
    }
  }

  render() {
    return html`
      ${this.label ? html`<label class="void-field-label" id="${this._uid}-label">${this.label}${this.required ? html`<span class="void-field-required" aria-hidden="true"> *</span>` : ''}</label>` : nothing}
      <div class="void-field-control"></div>
      ${this.error ? html`<span class="void-field-error" id="${this._uid}-error">${this.error}</span>` : this.helper ? html`<span class="void-field-helper" id="${this._uid}-helper">${this.helper}</span>` : nothing}
    `;
  }
}

if (!customElements.get('void-field')) {
  customElements.define('void-field', VoidField);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-field': VoidField;
  }
}
