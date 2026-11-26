import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { PartsController } from '../parts.js';

/**
 * Native dropdown for small option sets in forms where a simple pick-one is sufficient.
 *
 * Wraps the author's own native `<select>` and enhances it in place: `<void-select><select name="plan"><option
 * value="free">Free</option></select></void-select>`. The select, its options and its form attributes (`name`,
 * `required`, `disabled`, `multiple`, `autocomplete`, `form`) are plain HTML and the final DOM, so the control
 * submits, validates, resets and autofills as a native select does, before and after the script loads. The
 * component styles it (`size`, `error`), names it from the host's `aria-label` or a `void-field` label, exposes
 * `value` and `void-change`, and keeps the user's choice through server morphs the server did not change it in.
 * A prompt is a first option with an empty value: `<option value="" disabled selected hidden>Choose a
 * plan</option>`.
 *
 * @fires {CustomEvent<{ value: string }>} void-change - The user chose an option.
 */
export class VoidSelect extends VoidElement {
  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = 'select';

  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Mark the select invalid: it gets the error styling, `aria-invalid` and the message under it. Inside a
   * `void-field`, set `error` on the field instead, which shows the message.
   */
  @property({ type: String, reflect: true }) error = '';

  /** The value the host's `value` attribute or a property set asked for, kept until an option has it. */
  private _wanted: string | null = null;
  /** The server's selection at its last render (`selected` options, in order), for the morph rule. */
  private _serverSelection: string | null = null;
  private _serverValue: string | null = null;
  /** The user's selection, captured before a morph the server did not change it in, put back after. */
  private _keep: string[] | null = null;
  /** The server changed the host's `value` attribute in this morph: it wins over the options' `selected`. */
  private _serverValueChanged = false;
  private _form: HTMLFormElement | null = null;

  protected readonly _parts = new PartsController(this, {
    tags: ['select', 'option', 'optgroup'],
    onChange: () => this._wire(),
  });

  /** The native select this component enhances. */
  get select(): HTMLSelectElement | null {
    return this._parts.one<HTMLSelectElement>('select');
  }

  /**
   * `value` of the chosen option (the native select's value), reflected to the attribute as the choice
   * changes. Written in markup it is the initial choice, applied once an option with that value exists (and
   * what a form reset returns to); without it the options' own `selected` decide, as in plain HTML.
   * @default ''
   */
  @property({ type: String, reflect: true })
  get value(): string {
    const select = this.select;
    if (this._wanted !== null && !(select && hasOption(select, this._wanted))) return this._wanted;
    return select?.value ?? this._wanted ?? '';
  }

  set value(next: string) {
    const old = this.value;
    this._wanted = next === null || next === undefined ? null : String(next);
    this._apply();
    this.requestUpdate('value', old);
  }

  /** The value last handed to Lit, to notice a choice made inside the select (the user, a morph, new options). */
  private _reflected: string | null = null;
  /** The `value` attribute the markup wrote (or the server's last), which a form reset returns to; read before reflection can change it. */
  private _initial: string | null = null;
  private _initialRead = false;

  override connectedCallback(): void {
    if (!this._initialRead) {
      this._initialRead = true;
      this._initial = this.getAttribute('value');
      this._serverValue ??= this.getAttribute('value') ?? '';
    }
    super.connectedCallback();
    // Capture: the select's change reaches the host even where it does not bubble (a synthetic one).
    this.addEventListener('change', this._onChange, true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('change', this._onChange, true);
    this._watchForm(null);
  }

  /** Writes the invalid state on the select, applies a wanted value once its option exists, follows its form. */
  private _wire(): void {
    const select = this.select;
    if (!select) return;
    this._markInvalid(select);
    if (this._serverSelection === null) this._serverSelection = selectedAttrs(select);
    if (this._serverValue === null) this._serverValue = this.getAttribute('value') ?? '';
    this._apply();
    this._watchForm(select.form);
    this._reflectChoice();
  }

  /** The choice is made inside the native select; ask for an update when it is no longer what the attribute shows. */
  private _reflectChoice(): void {
    if (!this._morphing && this.value !== this._reflected) this.requestUpdate();
  }

  /**
   * Between voidBeforeMorph and morphedCallback the native select holds whatever the morph library left in
   * it (it re-syncs the options from the server's `selected`), not the user's choice: nothing is reflected
   * then, or the attribute would take that transient value before the choice is put back.
   */
  private _morphing = false;
  /** The `value` attribute the server sent in a morph that changed it (null: it sent none). */
  private _serverValueText: string | null = null;

  protected override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (this._morphing) return;
    const now = this.value;
    if (now === this._reflected) return;
    const old = this._reflected;
    this._reflected = now;
    // Lit reflects a property that was set; the choice is set inside the select, so say it changed.
    if (!changed.has('value')) this.requestUpdate('value', old);
  }

  /** Pushes the wanted value into the select (once an option has it); then the select is the truth. */
  private _apply(): void {
    const select = this.select;
    if (!select || this._wanted === null || !hasOption(select, this._wanted)) return;
    if (select.value !== this._wanted) select.value = this._wanted;
    this._wanted = null;
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('error')) {
      const select = this.select;
      if (select) this._markInvalid(select);
    }
  }

  /** The select we last marked `aria-invalid` (a `void-field` with an error marks it too; that stays theirs). */
  private _invalid: HTMLSelectElement | null = null;

  private _markInvalid(select: HTMLSelectElement): void {
    if (this.error) {
      if (select.getAttribute('aria-invalid') !== 'true') select.setAttribute('aria-invalid', 'true');
      this._invalid = select;
    } else if (this._invalid) {
      if (this._invalid.getAttribute('aria-invalid') === 'true' && !this._invalid.hasAttribute('data-void-field-invalid')) {
        this._invalid.removeAttribute('aria-invalid');
      }
      this._invalid = null;
    }
  }

  render() {
    return this.error ? html`<span class="void-select-error">${this.error}</span>` : nothing;
  }

  private _onChange = (e: Event): void => {
    if (e.target !== this.select) return;
    this._wanted = null;
    this._reflectChoice();
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  };

  // ── Form reset ──

  private _watchForm(form: HTMLFormElement | null): void {
    if (form === this._form) return;
    this._form?.removeEventListener('reset', this._onReset);
    this._form = form;
    form?.addEventListener('reset', this._onReset);
  }

  /** After a reset the options' `selected` decide; an initial `value` attribute is applied again. */
  private _onReset = (): void => {
    setTimeout(() => {
      const initial = this._initial;
      if (initial !== null && this.isConnected) this.value = initial;
      else this._reflectChoice();
    });
  };

  // ── Morphs: the user's choice stays unless the server changed the selection ──

  override voidBeforeMorph(incoming?: Element | null): boolean {
    const select = this.select;
    if (incoming && incoming !== this && select) {
      const theirs = incoming.querySelector('select');
      const now = theirs ? selectedAttrs(theirs) : '';
      const value = incoming.getAttribute('value') ?? '';
      this._serverValueChanged = value !== this._serverValue;
      // The server's new initial choice is the one a reset returns to.
      this._serverValueText = this._serverValueChanged ? incoming.getAttribute('value') : null;
      if (this._serverValueChanged) this._initial = this._serverValueText;
      this._morphing = true;
      // A morph that never reaches morphedCallback must not leave reflection off.
      setTimeout(() => {
        if (!this._morphing) return;
        this._morphing = false;
        this._reflectChoice();
      }, 100);
      const serverChanged = now !== this._serverSelection || this._serverValueChanged;
      this._serverSelection = now;
      this._serverValue = value;
      this._keep = serverChanged ? null : Array.from(select.selectedOptions, o => o.value);
    }
    return super.voidBeforeMorph(incoming);
  }

  protected override morphedCallback(): void {
    const keep = this._keep;
    const valueChanged = this._serverValueChanged;
    this._keep = null;
    this._serverValueChanged = false;
    const serverValue = this._serverValueText;
    this._serverValueText = null;
    this._morphing = false;
    const select = this.select;
    if (!select) return;
    // Server markup does not carry the aria-invalid the error wrote.
    if (this.error) this._markInvalid(select);
    // Morph libraries sync the select from its options' `selected` after the host's attributes, which would
    // undo a new `value` attribute (the server's choice): apply it again once the options are in place.
    if (valueChanged && serverValue !== null) {
      this.value = serverValue;
      return;
    }
    if (keep) {
      const wanted = new Set(keep);
      for (const option of Array.from(select.options)) {
        if (option.selected !== wanted.has(option.value)) option.selected = wanted.has(option.value);
      }
    }
    // The morph may have moved the choice inside the select.
    this._reflectChoice();
  }
}

function hasOption(select: HTMLSelectElement, value: string): boolean {
  for (const o of Array.from(select.options)) if (o.value === value) return true;
  return false;
}

/** The values of the options the markup marks `selected`. */
function selectedAttrs(select: Element): string {
  return Array.from(select.querySelectorAll('option[selected]'), o => (o as HTMLOptionElement).value).join('\u0000');
}

if (!customElements.get('void-select')) {
  customElements.define('void-select', VoidSelect);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-select': VoidSelect;
  }
}
