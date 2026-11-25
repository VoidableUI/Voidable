import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl, setNativeChecked, type FormValidityResult } from '../form-control.js';

/** Single mutually exclusive option for forms and surveys; typically used inside VoidRadioGroup. */
export class VoidRadio extends NativeFormControl(VoidElement) {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) name = '';
  @property({ type: String, reflect: true }) value = '';
  /**
   * One radio with this name must be checked (as for native radios). Validated
   * on the host: the inner native radio is aria-hidden.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'radio');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-checked', String(this.checked));
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('checked')) {
      this.setAttribute('aria-checked', String(this.checked));
    }
    if (changed.has('disabled') || changed.has('fieldsetDisabled')) {
      const disabled = this.formDisabled;
      this.setAttribute('aria-disabled', String(disabled));
      this.setAttribute('tabindex', disabled ? '-1' : '0');
    }
    if (!this._didSetup) {
      this._didSetup = true;
      for (const node of this._userContent) {
        this.appendChild(node);
      }
    }
  }

  render() {
    return html`
      <input type="radio" .checked=${this.checked} ?disabled=${this.disabled} name=${this.name} value=${this.value} tabindex="-1" aria-hidden="true" />
      <span class="void-radio-circle">
        ${this.checked ? html`<span class="void-radio-dot"></span>` : ''}
      </span>
    `;
  }

  /** Form reset target is the checked state; the native radio submits. */
  protected formSnapshot(): unknown {
    return this.checked;
  }

  formResetCallback(): void {
    // Inside a void-radio-group the group owns the checked state.
    if (this.closest('void-radio-group')) return;
    super.formResetCallback();
  }

  protected formRestore(state: unknown): void {
    this.checked = Boolean(state);
    setNativeChecked(this.querySelector('input[type="radio"]'), this.checked);
  }

  protected formSyncNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="radio"]');
    if (input && input.checked !== this.checked) input.checked = this.checked;
    // Validity depends on the whole same-name set.
    for (const peer of this._peers()) if (peer !== this) peer.formSync();
  }

  protected formValidity(): FormValidityResult | null {
    if (!this.required || this._peers().some((r) => r.checked)) return null;
    return { flags: { valueMissing: true }, message: 'Please select one of these options.' };
  }

  /** void-radio elements sharing this radio's name in the same form (or document). */
  private _peers(): VoidRadio[] {
    if (!this.name) return [this];
    const scope: ParentNode = this.closest('form') ?? this.getRootNode() as ParentNode;
    return (Array.from(scope.querySelectorAll('void-radio')) as VoidRadio[]).filter((r) => r.name === this.name);
  }

  private _handleClick = (e: Event): void => {
    const disabled = this.formDisabled;
    if (disabled || this.checked) {
      if (disabled) e.stopImmediatePropagation();
      return;
    }
    this.checked = true;
    const input = this.querySelector('input[type="radio"]') as HTMLInputElement | null;
    if (input) input.checked = true;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value, checked: true } }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === ' ' && !this.formDisabled) {
      e.preventDefault();
      this._handleClick(e);
    }
  };
}

if (!customElements.get('void-radio')) {
  customElements.define('void-radio', VoidRadio);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-radio': VoidRadio;
  }
}
