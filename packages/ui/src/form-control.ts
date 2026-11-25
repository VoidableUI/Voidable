import { property } from 'lit/decorators.js';
import type { ReactiveController } from 'lit';
import type { VoidElement } from './base.js';

/*
 * Form participation for Void UI controls.
 *
 * THE RULE: exactly one thing submits a control's value, never two.
 *
 * Void UI renders into light DOM, so a native <input>/<select>/<textarea>
 * rendered by a component is a real descendant of the surrounding <form> and
 * is submitted, reset, validated and fieldset-disabled by the browser on its
 * own. Making the host form-associated as well would submit the value twice.
 *
 * (a) NativeFormControl — the component renders ONE native control whose
 *     value IS the component value (input, textarea, select, slider,
 *     action-input, checkbox, radio). The component forwards
 *     name/value/disabled/required to that control and the browser does the
 *     rest. The host is NOT form-associated. The mixin only keeps the host's
 *     properties in step with the native control on form.reset() and exposes
 *     `formDisabled` so host-level pointer/keyboard handlers can honour an
 *     ancestor <fieldset disabled>. Pass-through containers (radio-group,
 *     checkbox-group) forward `name` to child controls of this kind and
 *     submit nothing themselves.
 *
 * (b) InternalsFormControl — the component has no native control carrying its
 *     value, or its value is composite/formatted (switch, number-input,
 *     date-picker, calendar, pin-input, tags-input, color-picker, toggle-group,
 *     segmented-control, combobox, multiselect, editable, file-upload). The
 *     host is form-associated (`static formAssociated = true`) and submits via
 *     ElementInternals.setFormValue. Any native inputs it renders internally
 *     (pin cells, the tag entry field, the formatted date text, the combobox
 *     query field, ...) MUST NOT carry a `name`.
 *
 * Submission shape for (b): a string is one entry; an array is one entry per
 * item (multi-value controls); null means "contributes nothing" (unchecked
 * boolean, empty choice group). Disabled controls (own `disabled` or an
 * ancestor <fieldset disabled>) contribute nothing.
 *
 * Where `attachInternals` is unavailable (old browsers, happy-dom), (b)
 * controls keep working as UI and still reset on form.reset(), but submit
 * nothing.
 *
 * Reset target: the control's state at its first update (after attributes and
 * properties set before connection have been applied), matching how a native
 * control's default comes from its markup. Later programmatic sets do not
 * move the reset target.
 */

/** What an InternalsFormControl contributes to its form's entry list. */
export type FormSubmission = string | readonly string[] | readonly File[] | null;

// Mixin constructor type; `any[]` is required by TypeScript for mixin constructors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

/** True when `el` sits inside a `<fieldset disabled>` (outside that fieldset's first legend). */
export function isInDisabledFieldset(el: Element): boolean {
  let child: Element = el;
  for (let p = el.parentElement; p; child = p, p = p.parentElement) {
    if (p.tagName !== 'FIELDSET' || !p.hasAttribute('disabled')) continue;
    const legend = Array.from(p.children).find((c) => c.tagName === 'LEGEND');
    if (legend && (legend === child || legend.contains(child))) continue;
    return true;
  }
  return false;
}

/** Set a native input/textarea's current and default value (the default is what native reset restores). */
export function setNativeValue(control: HTMLInputElement | HTMLTextAreaElement | null, value: string): void {
  if (!control) return;
  control.defaultValue = value;
  control.value = value;
}

/** Set a native checkbox/radio's current and default checkedness. */
export function setNativeChecked(control: HTMLInputElement | null, checked: boolean): void {
  if (!control) return;
  control.defaultChecked = checked;
  control.checked = checked;
}

function clone<T>(v: T): T {
  return (Array.isArray(v) ? [...v] : v) as T;
}

/** Public surface shared by every Void form control. */
export interface FormControl {
  /** Field name; reflected. */
  name: string;
  /** The associated form, if any. */
  readonly form: HTMLFormElement | null;
  /** True when disabled directly or via an ancestor `<fieldset disabled>`. */
  readonly formDisabled: boolean;
  /** Form hook: state to remember as the reset target. Defaults to `value`. */
  formSnapshot(): unknown;
  /** Form hook: apply a snapshot (reset / restore). Must not fire void-change. */
  formRestore(state: unknown): void;
  /** Form hook: re-capture the reset target from the current state. */
  formCaptureDefault(): void;
  /** Called by the form on reset (natively for (b), via the reset event otherwise). */
  formResetCallback(): void;
}

/** Surface of an ElementInternals-backed control. */
export interface InternalsFormControlInterface extends FormControl {
  /** When set, an empty submission makes the control invalid (valueMissing). */
  required: boolean;
  readonly validity: ValidityState | undefined;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  /** Form hook: what to submit. Defaults to `String(value)`. */
  formSubmission(): FormSubmission;
  /** Form hook: element that anchors the validation bubble. */
  formValidationAnchor(): HTMLElement | undefined;
  formDisabledCallback(disabled: boolean): void;
  formStateRestoreCallback(state: string | File | FormData | null, mode: string): void;
}

function CoreFormControl<T extends Constructor<VoidElement>>(Base: T) {
  class Core extends Base {
    @property({ type: String, reflect: true }) name = '';

    _formDefault: unknown = undefined;
    _formDefaultCaptured = false;
    _resetForm: HTMLFormElement | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      const controller: ReactiveController = {
        hostUpdate: () => {
          if (!this._formDefaultCaptured) this.formCaptureDefault();
        },
      };
      this.addController(controller);
    }

    get form(): HTMLFormElement | null {
      return this.closest('form');
    }

    get formDisabled(): boolean {
      return Boolean((this as { disabled?: boolean }).disabled) || isInDisabledFieldset(this);
    }

    formSnapshot(): unknown {
      return clone((this as unknown as { value: unknown }).value);
    }

    formRestore(state: unknown): void {
      (this as unknown as { value: unknown }).value = clone(state);
    }

    formCaptureDefault(): void {
      this._formDefault = this.formSnapshot();
      this._formDefaultCaptured = true;
    }

    formResetCallback(): void {
      if (!this._formDefaultCaptured) return;
      this.formRestore(clone(this._formDefault));
      // Native descendants may have been reset to their own (stale) defaults;
      // re-render so live() bindings push the restored state back into them.
      this.requestUpdate();
    }

    /** Listen for the form's reset event (used when the browser will not call formResetCallback). */
    _listenForReset(): void {
      const form = this.closest('form');
      if (form === this._resetForm) return;
      this._resetForm?.removeEventListener('reset', this._onFormReset);
      this._resetForm = form;
      form?.addEventListener('reset', this._onFormReset);
    }

    _stopListeningForReset(): void {
      this._resetForm?.removeEventListener('reset', this._onFormReset);
      this._resetForm = null;
    }

    _onFormReset = (e: Event): void => {
      // Only the form's own reset (not a bubbling event of the same name).
      // Compared by type: some DOMs (happy-dom) hand out proxies for the form.
      if (!(e.target instanceof HTMLFormElement)) return;
      this.formResetCallback();
    };
  }
  return Core;
}

/**
 * Strategy (a): the component renders a native control that submits for it.
 * The host is not form-associated; this keeps host state in step on reset and
 * exposes `formDisabled`.
 *
 * Components implementing `formRestore` must also update the native control's
 * *default* (see setNativeValue / setNativeChecked): in browsers the reset
 * event fires before native controls are reset, so the default is what the
 * native control will end up showing.
 */
export function NativeFormControl<T extends Constructor<VoidElement>>(Base: T) {
  class Native extends CoreFormControl(Base) {
    connectedCallback(): void {
      super.connectedCallback();
      this._listenForReset();
    }

    disconnectedCallback(): void {
      super.disconnectedCallback();
      this._stopListeningForReset();
    }
  }
  return Native as unknown as Constructor<FormControl> & T;
}

/**
 * Strategy (b): the host is form-associated and submits through
 * ElementInternals. Guarded so it degrades to "no submission" where
 * attachInternals is unavailable.
 */
export function InternalsFormControl<T extends Constructor<VoidElement>>(Base: T) {
  class Internals extends CoreFormControl(Base) {
    static formAssociated = true;

    @property({ type: Boolean, reflect: true }) required = false;

    _internals: ElementInternals | null = null;
    _lastSubmissionKey: string | undefined = undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      try {
        if (typeof this.attachInternals === 'function') this._internals = this.attachInternals();
      } catch {
        this._internals = null;
      }
      this.addController({ hostUpdated: () => this._syncForm() });
    }

    connectedCallback(): void {
      super.connectedCallback();
      // Browsers with ElementInternals call formResetCallback themselves.
      if (!this._internals) this._listenForReset();
    }

    disconnectedCallback(): void {
      super.disconnectedCallback();
      this._stopListeningForReset();
    }

    override get form(): HTMLFormElement | null {
      return this._internals ? this._internals.form : this.closest('form');
    }

    get validity(): ValidityState | undefined {
      return this._internals?.validity;
    }

    get validationMessage(): string {
      return this._internals?.validationMessage ?? '';
    }

    get willValidate(): boolean {
      return this._internals?.willValidate ?? false;
    }

    checkValidity(): boolean {
      return this._internals?.checkValidity() ?? true;
    }

    reportValidity(): boolean {
      return this._internals?.reportValidity() ?? true;
    }

    formSubmission(): FormSubmission {
      const v = (this as unknown as { value: unknown }).value;
      return v === undefined || v === null ? null : String(v);
    }

    formValidationAnchor(): HTMLElement | undefined {
      return this.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]') ?? undefined;
    }

    formDisabledCallback(disabled: boolean): void {
      // `disabled` covers both the host attribute and an ancestor fieldset.
      this.setAttribute('aria-disabled', String(disabled || this.formDisabled));
      this.requestUpdate();
    }

    formStateRestoreCallback(state: string | File | FormData | null): void {
      if (typeof state !== 'string') return;
      try {
        this.formRestore(JSON.parse(state));
      } catch {
        // Unparseable state (e.g. browser autofill); keep the current value.
      }
    }

    /** Push the current value and validity into ElementInternals. */
    _syncForm(): void {
      const internals = this._internals;
      if (!internals) return;
      const submission = this.formDisabled ? null : this.formSubmission();
      let state: string | null = null;
      try {
        state = JSON.stringify(this.formSnapshot()) ?? null;
      } catch {
        state = null;
      }
      const entries = Array.isArray(submission)
        ? submission.map((v: string | File) => (typeof v === 'string' ? v : [v.name, v.size, v.lastModified]))
        : submission;
      const key = JSON.stringify([this.name, entries, state, this.required]);
      if (key === this._lastSubmissionKey) return;
      this._lastSubmissionKey = key;

      if (!this.name || submission === null) {
        internals.setFormValue(null, state);
      } else if (typeof submission === 'string') {
        internals.setFormValue(submission, state);
      } else {
        const data = new FormData();
        for (const item of submission) data.append(this.name, item);
        internals.setFormValue(data, state);
      }

      const empty = submission === null || submission.length === 0;
      if (this.required && !this.formDisabled && empty) {
        internals.setValidity({ valueMissing: true }, 'Please fill out this field.', this.formValidationAnchor());
      } else {
        internals.setValidity({});
      }
    }
  }
  return Internals as unknown as Constructor<InternalsFormControlInterface> & T;
}
