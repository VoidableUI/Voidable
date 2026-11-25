import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';
import { ProjectionController } from '../projection.js';

/** Marks the placeholder `<option>` the component inserts into its native select. */
const PLACEHOLDER_ATTR = 'data-void-placeholder';

/** Native dropdown for small option sets in forms where a simple pick-one is sufficient. */
export class VoidSelect extends NativeFormControl(VoidElement) {
  @property({ type: String }) value = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: String, reflect: true }) name = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) placeholder = '';

  // Consumer <option>/<optgroup> children are projected into the native <select>.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'options', target: () => this.querySelector(':scope > select') }],
    onChange: () => this._syncOptions(),
  });
  private _didSyncOptions = false;
  /**
   * The placeholder option. The native select is a projection container, which must
   * hold no Lit bindings (a Lit child part there clears the projected options when it
   * switches branches), so the placeholder is inserted and removed imperatively.
   */
  private _placeholderOption: HTMLOptionElement | null = null;
  /** The value captured as the reset target, to tell whether anything has moved it since. */
  private _defaultValue: string | undefined = undefined;
  /** The value last seen on an option, to tell a removed selection from a value that has no option yet. */
  private _matchedValue: string | null = null;

  protected override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (!this.hasUpdated) {
      // Adopt the native select's initial choice before the first render, so the
      // reset target captured in this update is right and no second render follows.
      if (!this.value && !this.placeholder) this.value = this._initialNativeValue();
    } else if (changed.has('placeholder')) {
      this._syncOptions();
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (!this._didSyncOptions) {
      this._didSyncOptions = true;
      this._syncOptions();
    }
  }

  /**
   * Single sync point between the projected options and the native select. Runs
   * after the first render, whenever options are added, removed or reordered, when
   * the placeholder changes, and after the projection recovers from a morph or clone
   * (a fresh native select). Keeps the placeholder option in place, adopts the native
   * select's choice when there is no value and no placeholder, pushes the value into
   * the native select, and, while nothing has moved the value away from the reset
   * target, re-captures that target, so a select upgraded before the parser added its
   * options does not keep a default captured from an empty list.
   */
  private _syncOptions(): void {
    const select = this.querySelector<HTMLSelectElement>(':scope > select');
    if (!select) return;
    const pristine = this._defaultValue !== undefined && this.value === this._defaultValue;
    this._syncPlaceholder(select);
    this._reconcileRemovedSelection(select);
    if (!this.value && !this.placeholder && select.value) {
      this.value = select.value;
    }
    if (pristine) {
      this.formCaptureDefault();
    } else if (this._defaultValue !== undefined) {
      // Keep the reset target on the options: a morph of the unprojected host
      // strips `selected` attributes the server markup does not carry.
      this.formWriteNativeDefault(this._defaultValue);
    }
    // Last, so toggling default-selected attributes cannot change the selection.
    this._applyValue();
  }

  /**
   * When the option the value points at has been removed, fall back the way a native
   * select does (the placeholder if there is one, else the first enabled option, else
   * nothing) so the property, the native select and the submitted value agree. A value
   * that never had an option (options still being parsed or rendered) is left alone.
   * The change is programmatic, so no void-change is dispatched.
   */
  private _reconcileRemovedSelection(select: HTMLSelectElement): void {
    const options = Array.from(select.options);
    if (options.some((o) => o.value === this.value)) {
      this._matchedValue = this.value;
      return;
    }
    if (this._matchedValue === null || this._matchedValue !== this.value) return;
    this.value = this.placeholder ? '' : (options.find((o) => !o.disabled)?.value ?? '');
    this._matchedValue = options.some((o) => o.value === this.value) ? this.value : null;
  }

  /** Inserts, updates or removes the placeholder option; drops stale copies (from a morph, clone or recovery). */
  private _syncPlaceholder(select: HTMLSelectElement): void {
    let own = this._placeholderOption;
    if (own && (own.parentNode !== select || this._projection.regionOf(own))) own = null;
    for (const stale of Array.from(this.querySelectorAll<HTMLOptionElement>(`option[${PLACEHOLDER_ATTR}]`))) {
      if (stale !== own) stale.remove();
    }
    if (!this.placeholder) {
      own?.remove();
      this._placeholderOption = null;
      return;
    }
    if (!own) {
      own = this.ownerDocument.createElement('option');
      own.className = 'void-select-placeholder';
      own.setAttribute(PLACEHOLDER_ATTR, '');
      own.value = '';
      own.disabled = true;
      own.hidden = true;
      // Default-selected while the value is empty, like a native placeholder option.
      own.toggleAttribute('selected', !this.value);
    }
    if (own.textContent !== this.placeholder) own.textContent = this.placeholder;
    if (select.firstChild !== own) select.insertBefore(own, select.firstChild);
    this._placeholderOption = own;
  }

  /**
   * What a native select would show for the consumer's options before they are
   * projected: the options are still direct children of the host at this point.
   */
  private _initialNativeValue(): string {
    const probe = this.ownerDocument.createElement('select');
    for (const node of Array.from(this.querySelectorAll(':scope > option, :scope > optgroup'))) {
      probe.appendChild(node.cloneNode(true));
    }
    return probe.value;
  }

  /** Push the value into the native select without firing void-change. */
  private _applyValue(): void {
    const select = this.querySelector<HTMLSelectElement>(':scope > select');
    if (select && select.value !== this.value) {
      select.value = this.value;
    }
  }

  /** Programmatic value sets reach the native select synchronously (a same-tick requestSubmit() sees them). */
  protected override formSyncNative(): void {
    this._applyValue();
  }

  protected override formCaptureDefault(): void {
    super.formCaptureDefault();
    this._defaultValue = this.value;
  }

  /** The initial value becomes the default-selected option (what native reset selects). */
  protected override formWriteNativeDefault(state: unknown): void {
    const select = this.querySelector('select');
    if (!select) return;
    const value = String(state ?? '');
    const options = Array.from(select.options);
    if (options.some((o) => o.value === value)) {
      // The `selected` content attribute is defaultSelected.
      for (const option of options) option.toggleAttribute('selected', option.value === value);
    }
  }

  protected override formReadNative(): void {
    const select = this.querySelector('select');
    if (select) this.value = select.value;
  }

  render() {
    return html`
      <select
        ?disabled=${this.disabled}
        ?required=${this.required}
        name=${this.name}
        form=${this.formAttr ?? nothing}
        aria-invalid=${this.error ? 'true' : 'false'}
        @change=${this._onChange}
      ></select>
      ${this.error ? html`<span class="void-select-error">${this.error}</span>` : ''}
    `;
  }

  private _onChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.value = select.value;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
}

if (!customElements.get('void-select')) {
  customElements.define('void-select', VoidSelect);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-select': VoidSelect;
  }
}
