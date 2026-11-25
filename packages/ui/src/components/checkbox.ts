import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';
import { ProjectionController } from '../projection.js';

/** Binary or indeterminate selection for form fields, data table row selection, and toggle-able settings. */
export class VoidCheckbox extends NativeFormControl(VoidElement) {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) indeterminate = false;
  @property({ type: String, reflect: true }) name = '';
  /** Submitted under `name` while checked; defaults to "on" like a native checkbox. */
  @property({ type: String, reflect: true }) value = 'on';
  /**
   * Must be checked. Forwarded to the native checkbox, which the browser
   * validates; when it focuses that (aria-hidden) input, focus moves to the host.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' = 'default';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  // Consumer label content stays on the host, after the rendered control.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'label', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'checkbox');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-checked', String(this.checked));
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
    if (changed.has('checked') || changed.has('indeterminate')) {
      if (this.indeterminate) {
        this.setAttribute('aria-checked', 'mixed');
      } else {
        this.setAttribute('aria-checked', String(this.checked));
      }
    }
    if (changed.has('disabled') || changed.has('ancestorDisabled')) {
      const disabled = this.formDisabled;
      this.setAttribute('aria-disabled', String(disabled));
      this.setAttribute('tabindex', disabled ? '-1' : '0');
    }
  }

  render() {
    return html`
      <input type="checkbox" .checked=${this.checked} .indeterminate=${this.indeterminate} ?disabled=${this.formDisabled} ?required=${this.required} name=${this.name} value=${this.value} form=${this.formAttr ?? nothing} tabindex="-1" aria-hidden="true" @focus=${this._onNativeFocus} />
      <span class="void-checkbox-box">
        ${this.checked ? html`<svg viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
        ${this.indeterminate && !this.checked ? html`<svg viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round"/></svg>` : ''}
      </span>
    `;
  }

  /** Form reset target is the checked state; the native checkbox submits. */
  protected formSnapshot(): unknown {
    return this.checked;
  }

  /** A disabled void-checkbox-group disables its checkboxes like a fieldset. */
  protected formAncestorDisabled(): boolean {
    return super.formAncestorDisabled() || Boolean(this.closest('void-checkbox-group')?.hasAttribute('disabled'));
  }

  protected formWriteNativeDefault(state: unknown): void {
    const input = this.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (input) input.defaultChecked = Boolean(state);
  }

  protected formReadNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (input) this.checked = input.checked;
  }

  /** The browser focuses the native input to report validity; hand focus to the host. */
  private _onNativeFocus = (): void => {
    this.focus();
  };

  protected formSyncNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (input && input.checked !== this.checked) input.checked = this.checked;
    // A containing group derives its validity from its checkboxes.
    this.closest('void-checkbox-group')?.requestUpdate();
  }

  private _handleClick = (e: Event): void => {
    if (this.formDisabled) {
      e.stopImmediatePropagation();
      return;
    }
    this.indeterminate = false;
    this.checked = !this.checked;
    const input = this.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    if (input) input.checked = this.checked;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { checked: this.checked } }));
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === ' ' && !this.formDisabled) {
      e.preventDefault();
      this._handleClick(e);
    }
  };
}

if (!customElements.get('void-checkbox')) {
  customElements.define('void-checkbox', VoidCheckbox);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-checkbox': VoidCheckbox;
  }
}
