import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';

/** On/off toggle for feature flags, notification preferences, and settings that take immediate effect. */
export class VoidSwitch extends InternalsFormControl(VoidElement) {
  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, { disabled: () => this.formDisabled });

  /** Whether the switch is on. The attribute is the initial state and the form's reset target. */
  @property({ type: Boolean, reflect: true }) checked = false;
  /**
   * Stop the switch reacting and exclude it from the form submission. Also disabled by an enclosing
   * `<fieldset disabled>`.
   */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Submitted under `name` while checked (like a native checkbox). */
  @property({ type: String, reflect: true }) value = 'on';
  /**
   * Status colour of the switch when on: `default`, `error`, `warning`, `caution`, `success`, `info`,
   * `notice` or `highlight`.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'switch');
    this.setHostAttribute('tabindex', this.disabled ? '-1' : '0');
    this.setHostAttribute('aria-checked', String(this.checked));
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('checked')) {
      this.setHostAttribute('aria-checked', String(this.checked));
    }
    if (changed.has('disabled') || changed.has('ancestorDisabled')) {
      const disabled = this.formDisabled;
      this.setHostAttribute('aria-disabled', disabled ? 'true' : null);
      this.setHostAttribute('tabindex', disabled ? '-1' : '0');
    }
  }

  protected formSubmission(): FormSubmission {
    return this.checked ? this.value : null;
  }

  protected formSnapshot(): unknown {
    return this.checked;
  }

  protected formRestore(state: unknown): void {
    this.checked = Boolean(state);
  }

  private _handleClick = (): void => {
    if (this.formDisabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value, checked: this.checked },
    }));
  };

  render() {
    return html`<span class="void-switch-track"><span class="void-switch-thumb"></span></span>`;
  }
}

if (!customElements.get('void-switch')) {
  customElements.define('void-switch', VoidSwitch);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-switch': VoidSwitch;
  }
}
