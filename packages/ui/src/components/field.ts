import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

/** Recorded in data-void-field-invalid when the control had no aria-invalid of its own. */
const NO_VALUE = '';

/**
 * Form field wrapper that pairs an input with its label, helper text, and validation error.
 *
 * The label names the control as it appears: the native input, select or textarea (also inside Void
 * components), else the widget a component renders inside itself (the multiselect trigger), else the first
 * child. Controls that arrive after the field (a script that runs before the page is parsed, a framework)
 * are wired when they do.
 */
export class VoidField extends VoidElement {
  /**
   * Visible label. It names the control inside (`for` on a native control, `aria-labelledby` otherwise),
   * so use it instead of a `label` attribute on the control.
   */
  @property({ type: String, reflect: true }) label = '';
  /**
   * Validation message shown under the control in the error colour. While it is set the control inside
   * is marked `aria-invalid` and described by the message.
   */
  @property({ type: String, reflect: true }) error = '';
  /**
   * Hint shown under the control when there is no `error`. It describes the control for assistive
   * technology.
   */
  @property({ type: String, reflect: true }) helper = '';
  /**
   * Draws an asterisk after the label. It is only the mark: put `required` on the control itself to make
   * the browser enforce it.
   */
  @property({ type: Boolean, reflect: true }) required = false;

  private _uid = Math.random().toString(36).slice(2);
  private _labelledControl: Element | null = null;
  /** Re-wires when the control's own rendering changes (a Void control re-rendering its native input). */
  private _controlObserver: MutationObserver | null = null;

  // The consumer's control is projected into the control container.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'control', target: () => this.querySelector(':scope > .void-field-control') }],
    onChange: () => this.requestUpdate(),
  });

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this._observeControl();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._controlObserver?.disconnect();
    this._controlObserver = null;
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    this._wireControl();
    this._observeControl();
    // Void controls render their inner native input asynchronously; wire again once they have.
    queueMicrotask(() => { if (this.isConnected) this._wireControl(); });
  }

  private _observeControl(): void {
    const container = this.querySelector(':scope > .void-field-control');
    if (!container || !this.isConnected) return;
    this._controlObserver ??= new MutationObserver(() => this._wireControl());
    this._controlObserver.disconnect();
    // Subtree child changes: a nested Void control that rebuilt its chrome after a
    // morph renders a new native input, which needs the label again.
    this._controlObserver.observe(container, { childList: true, subtree: true });
  }

  /** The element that should carry the accessible name: an inner native control (also inside Void components), else the first child. */
  private _findControl(): Element | null {
    const container = this.querySelector('.void-field-control');
    if (!container) return null;
    // Native controls first (the hidden inputs inside checkboxes and radios are not the control),
    // then the widget a Void component renders inside itself (multiselect's trigger).
    return container.querySelector('input:not([aria-hidden="true"]):not([type="hidden"]), select, textarea')
      ?? container.querySelector('[role="combobox"]')
      ?? container.firstElementChild;
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
    this._restoreInvalid(prev);
    this._labelledControl = null;
  }

  private _wireControl(): void {
    const control = this._findControl();
    if (this._labelledControl && this._labelledControl !== control) this._unwireControl();
    if (!control) {
      // Nothing to label (the content is text only): drop the link to a control that left.
      this.querySelector(':scope > .void-field-label')?.removeAttribute('for');
      return;
    }
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
      // Remember what the control said before (a Void control's own aria-invalid="false"), to put it back.
      if (!control.hasAttribute('data-void-field-invalid')) {
        control.setAttribute('data-void-field-invalid', control.getAttribute('aria-invalid') ?? NO_VALUE);
      }
      control.setAttribute('aria-invalid', 'true');
    } else {
      this._restoreInvalid(control);
    }
  }

  /** Puts back the control's own aria-invalid (or removes it) once the field no longer has an error. */
  private _restoreInvalid(control: Element): void {
    const previous = control.getAttribute('data-void-field-invalid');
    if (previous === null) return;
    if (previous === NO_VALUE) control.removeAttribute('aria-invalid');
    else control.setAttribute('aria-invalid', previous);
    control.removeAttribute('data-void-field-invalid');
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
