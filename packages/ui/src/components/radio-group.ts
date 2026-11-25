import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';
import { ProjectionController } from '../projection.js';
import type { VoidRadio } from './radio.js';

/**
 * Mutually exclusive option group for plan pickers, survey questions, and preference settings.
 *
 * Form strategy: pass-through. `name` is forwarded to the child void-radio
 * elements, whose native radios submit; the group itself submits nothing.
 */
export class VoidRadioGroup extends NativeFormControl(VoidElement) {
  /** Name of the group, shown above the radios and used as its accessible name. */
  @property({ type: String }) label = '';
  /**
   * `value` of the selected radio. Set it to choose one; it is the initial selection and the form's
   * reset target.
   */
  @property({ type: String }) value = '';
  @property({ type: String, reflect: true }) name = '';
  /** Forwarded to the child radios: the browser then requires one of them to be checked. */
  @property({ type: Boolean, reflect: true }) required = false;
  /** Disables every radio in the group (like a fieldset). */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Lay the radios out in a `vertical` column (default) or a `horizontal` row. */
  @property({ type: String, reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';

  // Consumer radios are projected into the options container; late radios get the
  // group's name, value, required and form.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'options', target: () => this.querySelector(':scope > .void-radio-group-options') }],
    onChange: () => {
      this._syncNames();
      this._syncRequired();
      this._syncFormAttr();
      this._syncChecked();
      // Radios that arrived late (a framework, children re-created by innerHTML) get the default checkedness.
      this.formRewriteNativeDefault();
      // Lets a pending native default (formWriteNativeDefault) reach radios that arrived late.
      this.requestUpdate();
    },
  });
  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'radiogroup');
    if (this.label) this.setHostAttribute('aria-label', this.label);
    this.addEventListener('void-change', this._handleChildChange as EventListener);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('void-change', this._handleChildChange as EventListener);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label') && this.label) {
      this.setHostAttribute('aria-label', this.label);
    }
    if (changed.has('name')) {
      this._syncNames();
    }
    if (changed.has('required')) {
      this._syncRequired();
    }
    if (changed.has('formAttr')) {
      this._syncFormAttr();
    }
    if (changed.has('disabled') || changed.has('ancestorDisabled')) {
      this.setHostAttribute('aria-disabled', this.formDisabled ? 'true' : null);
    }
    if (!this._didSync) {
      this._didSync = true;
      this._syncNames();
      this._syncChecked();
    } else if (changed.has('value')) {
      // Controlled value: programmatic sets update the radios without firing void-change.
      this._syncChecked();
    }
  }

  private _didSync = false;

  /** A morph may have replaced or added radios that do not show the group's value, name or form yet. */
  protected override morphedCallback(): void {
    this._syncNames();
    this._syncRequired();
    this._syncFormAttr();
    this._syncChecked();
  }

  protected formSyncNative(): void {
    // Programmatic value sets reach the radios (and their native inputs) synchronously.
    if (this._didSync) this._syncChecked();
  }

  /** The group's initial value becomes the native radios' default checkedness. */
  protected formWriteNativeDefault(state: unknown): void {
    const value = String(state ?? '');
    for (const radio of this._radios()) {
      radio.updateComplete.then(() => {
        const input = radio.querySelector<HTMLInputElement>('input[type="radio"]');
        if (input) input.defaultChecked = radio.value === value;
      });
    }
  }

  protected formReadNative(): void {
    let value = '';
    for (const radio of this._radios()) {
      const input = radio.querySelector<HTMLInputElement>('input[type="radio"]');
      radio.checked = Boolean(input?.checked);
      if (radio.checked) value = radio.value;
    }
    this.value = value;
  }

  private _radios(): VoidRadio[] {
    return Array.from(this.querySelectorAll('void-radio')) as VoidRadio[];
  }

  private _syncNames(): void {
    if (!this.name) return;
    for (const radio of this._radios()) {
      radio.name = this.name;
    }
  }

  private _syncRequired(): void {
    for (const radio of this._radios()) radio.required = this.required;
  }

  private _syncFormAttr(): void {
    for (const radio of this._radios()) {
      if (this.formAttr === null) radio.removeAttribute('form');
      else radio.setAttribute('form', this.formAttr);
    }
  }

  private _syncChecked(): void {
    for (const radio of this._radios()) {
      radio.checked = radio.value === this.value;
    }
  }

  private _handleChildChange = (e: CustomEvent): void => {
    const target = e.target as VoidRadio;
    if (!target || target.tagName.toLowerCase() !== 'void-radio') return;
    if (!e.detail?.checked) return;
    e.stopImmediatePropagation();
    this.value = target.value;
    for (const radio of this._radios()) {
      if (radio !== target) radio.checked = false;
    }
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  };

  render() {
    return html`
      ${this.label ? html`<span class="void-radio-group-label">${this.label}</span>` : nothing}
      <div class="void-radio-group-options"></div>
    `;
  }
}

if (!customElements.get('void-radio-group')) {
  customElements.define('void-radio-group', VoidRadioGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-radio-group': VoidRadioGroup;
  }
}
