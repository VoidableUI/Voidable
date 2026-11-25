import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';

/** Single mutually exclusive option for forms and surveys; typically used inside VoidRadioGroup. */
export class VoidRadio extends NativeFormControl(VoidElement) {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) name = '';
  /** Submitted under `name` while checked; defaults to "on" like a native radio. */
  @property({ type: String, reflect: true }) value = 'on';
  /**
   * One radio with this name must be checked. Forwarded to the native radio,
   * which the browser validates as a group; focus moves to the host.
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
    if (changed.has('disabled') || changed.has('ancestorDisabled')) {
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
      <input type="radio" .checked=${this.checked} ?disabled=${this.formDisabled} ?required=${this.required} name=${this.name} value=${this.value} form=${this.formAttr ?? nothing} tabindex="-1" aria-hidden="true" @focus=${this._onNativeFocus} />
      <span class="void-radio-circle">
        ${this.checked ? html`<span class="void-radio-dot"></span>` : ''}
      </span>
    `;
  }

  /** Form reset target is the checked state; the native radio submits. */
  protected formSnapshot(): unknown {
    return this.checked;
  }

  /** A disabled void-radio-group disables its radios like a fieldset. */
  protected formAncestorDisabled(): boolean {
    return super.formAncestorDisabled() || Boolean(this.closest('void-radio-group')?.hasAttribute('disabled'));
  }

  protected formWriteNativeDefault(state: unknown): void {
    // Inside a void-radio-group the group owns the default.
    if (this.closest('void-radio-group')) return;
    const input = this.querySelector<HTMLInputElement>('input[type="radio"]');
    if (input) input.defaultChecked = Boolean(state);
  }

  protected formReadNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="radio"]');
    if (input) this.checked = input.checked;
  }

  /** The browser focuses the native input to report validity; hand focus to the host. */
  private _onNativeFocus = (): void => {
    this.focus();
  };

  protected formSyncNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="radio"]');
    if (input && input.checked !== this.checked) input.checked = this.checked;
    // Like native radios: checking one unchecks the other same-name radios of its form.
    if (this.checked && this.name && !this.closest('void-radio-group')) {
      const scope: ParentNode = this.form ?? (this.getRootNode() as ParentNode);
      for (const peer of Array.from(scope.querySelectorAll('void-radio')) as VoidRadio[]) {
        if (peer !== this && peer.name === this.name && peer.checked && !peer.closest('void-radio-group')) peer.checked = false;
      }
    }
  }

  /** void-radio elements sharing this radio's name in the same form (or document). */
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
