import { property, state } from 'lit/decorators.js';
import type { ReactiveElement } from 'lit';
import type { VoidElement } from './base.js';

/*
 * Form participation for Void UI controls.
 *
 * THE RULE: exactly one thing submits a control's value, never two.
 *
 * Void UI renders into light DOM, so a native <input>/<select>/<textarea>
 * rendered by a component is a real descendant of the surrounding <form> and
 * is submitted, validated and fieldset-disabled by the browser on its own.
 * If the host also called setFormValue the value would be submitted twice.
 *
 * (a) NativeFormControl — the component renders ONE native control whose
 *     value IS the component value (input, textarea, select, slider,
 *     action-input, checkbox, radio). The component forwards
 *     name/value/disabled/required to that control and the native control
 *     submits and validates. The host IS form-associated but NEVER calls
 *     setFormValue (so it contributes no entry and, having no validity flags
 *     of its own, never counts as invalid). Form association is used only so
 *     the browser tells the host about real resets (formResetCallback is not
 *     called for a reset whose event was cancelled) and about
 *     <fieldset disabled> (formDisabledCallback). Pass-through containers
 *     (radio-group, checkbox-group) forward `name` to child controls of this
 *     kind and submit nothing themselves.
 *
 * (b) InternalsFormControl — the component has no native control carrying its
 *     value, or its value is composite/formatted (switch, number-input,
 *     date-picker, calendar, pin-input, tags-input, color-picker, toggle-group,
 *     segmented-control, combobox, multiselect, editable, file-upload). The
 *     host is form-associated and submits via ElementInternals.setFormValue.
 *     Any native inputs it renders internally (pin cells, the tag entry field,
 *     the formatted date text, the combobox query field, ...) MUST NOT carry a
 *     `name`.
 *
 * Submission shape for (b): a string is one entry; an array is one entry per
 * item (multi-value controls); null means "contributes nothing" (unchecked
 * boolean, empty choice group). Disabled controls (own `disabled` or an
 * ancestor <fieldset disabled>) contribute nothing.
 *
 * Timing: the form value is pushed synchronously — on every property set once
 * the element has rendered, and immediately before every `void-change`
 * dispatch — so a `void-change` listener that calls form.requestSubmit() (the
 * Turbo auto-submit pattern) or code that sets a value and submits in the same
 * tick sees the new value.
 *
 * Where `attachInternals` is unavailable (old browsers, happy-dom), controls
 * keep working as UI and reset on the form's `reset` event, but (b) controls
 * submit nothing.
 *
 * Reset target: the control's state at its first update (after attributes and
 * properties set before connection have been applied), matching how a native
 * control's default comes from its markup. Later programmatic sets do not
 * move the reset target.
 */

/** What a form-associated control contributes to its form's entry list. */
export type FormSubmission = string | readonly string[] | readonly File[] | null;

/** A validity result for ElementInternals.setValidity. */
export interface FormValidityResult {
  flags: ValidityStateFlags;
  message: string;
  anchor?: HTMLElement;
}

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

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Public and protected surface shared by every Void form control. */
export declare class VoidFormControl {
  /** Field name; reflected. */
  name: string;
  /** The associated form, if any. */
  readonly form: HTMLFormElement | null;
  /** True when disabled directly or via an ancestor `<fieldset disabled>`. */
  readonly formDisabled: boolean;
  /** Browser callback: the form was reset. */
  formResetCallback(): void;
  /** Browser callback: the disabled state (own or via fieldset) changed. */
  formDisabledCallback(disabled: boolean): void;
  /** Reactive mirror of "inside a disabled fieldset", updated by formDisabledCallback. */
  protected fieldsetDisabled: boolean;
  /** Hook: state to remember as the reset target. Defaults to `value`. */
  protected formSnapshot(): unknown;
  /** Hook: apply a snapshot (reset / restore). Must not fire void-change. */
  protected formRestore(state: unknown): void;
  /** Hook: re-capture the reset target from the current state. */
  protected formCaptureDefault(): void;
  /** Hook: validity of the host itself, or null when always valid. */
  protected formValidity(): FormValidityResult | null;
  /** Push the current value, validity and ARIA state to the form now. */
  protected formSync(): void;
}

/** Surface added by NativeFormControl. */
export declare class VoidNativeFormControl extends VoidFormControl {
  /** Hook: push host state into the native control synchronously (no events). */
  protected formSyncNative(): void;
}

/** Surface added by InternalsFormControl. */
export declare class VoidInternalsFormControl extends VoidFormControl {
  /** When set, an empty submission makes the control invalid (valueMissing). */
  required: boolean;
  readonly validity: ValidityState | undefined;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  formStateRestoreCallback(state: string | File | FormData | null, mode: string): void;
  /** Hook: what to submit. Defaults to `String(value)`. */
  protected formSubmission(): FormSubmission;
  /** Hook: element that anchors the validation bubble. */
  protected formValidationAnchor(): HTMLElement | undefined;
}

type RequestUpdateArgs = Parameters<ReactiveElement['requestUpdate']>;

// Symbol keys for members shared between the mixin layers but kept off the
// public (and custom-elements-manifest) surface. Immutable module constants.
const onFormChange = Symbol('onFormChange');
const formInternals = Symbol('formInternals');
const formSubmissionOrUndefined = Symbol('formSubmissionOrUndefined');

function CoreFormControl<T extends Constructor<VoidElement>>(Base: T) {
  class Core extends Base {
    static formAssociated = true;

    @property({ type: String, reflect: true }) name = '';
    @state() protected fieldsetDisabled = false;

    #internals: ElementInternals | null = null;
    #default: unknown = undefined;
    #defaultCaptured = false;
    #resetForm: HTMLFormElement | null = null;
    #syncKey: string | undefined = undefined;
    /** Like :user-invalid — only expose aria-invalid after interaction or a failed submit. */
    #interacted = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      try {
        if (typeof this.attachInternals === 'function') this.#internals = this.attachInternals();
      } catch {
        this.#internals = null;
      }
      this.addController({
        hostUpdate: () => {
          if (!this.#defaultCaptured) this.formCaptureDefault();
        },
        hostUpdated: () => this.formSync(),
      });
      this.addEventListener('invalid', this.#onInvalid);
    }

    connectedCallback(): void {
      super.connectedCallback();
      // With ElementInternals the browser calls formResetCallback (only for
      // resets that were not cancelled). Without it, fall back to the event.
      if (!this.#internals) this.#listenForReset();
    }

    disconnectedCallback(): void {
      super.disconnectedCallback();
      this.#stopListeningForReset();
    }

    /** Sync synchronously on every property set once rendered. */
    override requestUpdate(...args: RequestUpdateArgs): void {
      super.requestUpdate(...args);
      if (this.hasUpdated) this[onFormChange]();
    }

    /** Sync before every void-change so listeners that submit see the new value. */
    override dispatchEvent(event: Event): boolean {
      if (event.type === 'void-change' && this.hasUpdated) {
        this.#interacted = true;
        this[onFormChange]();
      }
      return super.dispatchEvent(event);
    }

    /** Called on every change; Native adds the native-control push. */
    [onFormChange](): void {
      this.formSync();
    }

    get [formInternals](): ElementInternals | null {
      return this.#internals;
    }

    get form(): HTMLFormElement | null {
      return this.#internals ? this.#internals.form : this.closest('form');
    }

    get formDisabled(): boolean {
      return Boolean((this as { disabled?: boolean }).disabled) || isInDisabledFieldset(this);
    }

    protected formSnapshot(): unknown {
      return clone((this as unknown as { value: unknown }).value);
    }

    protected formRestore(state: unknown): void {
      (this as unknown as { value: unknown }).value = clone(state);
    }

    protected formCaptureDefault(): void {
      this.#default = this.formSnapshot();
      this.#defaultCaptured = true;
    }

    protected formValidity(): FormValidityResult | null {
      return null;
    }

    /** Submission for (b); undefined means the host never calls setFormValue. */
    [formSubmissionOrUndefined](): FormSubmission | undefined {
      return undefined;
    }

    formResetCallback(): void {
      if (!this.#defaultCaptured) return;
      this.#interacted = false;
      this.formRestore(clone(this.#default));
      // Native descendants may have been reset to their own (stale) defaults;
      // re-render so live() bindings push the restored state back into them.
      this.requestUpdate();
      this.formSync();
    }

    formDisabledCallback(disabled: boolean): void {
      this.fieldsetDisabled = isInDisabledFieldset(this);
      // `disabled` covers both the host attribute and an ancestor fieldset.
      this.setAttribute('aria-disabled', String(disabled || this.formDisabled));
      this.formSync();
    }

    protected formSync(): void {
      const internals = this.#internals;
      const disabled = this.formDisabled;
      const submission = this[formSubmissionOrUndefined]();
      const validity = disabled ? null : this.formValidity();
      const required = Boolean((this as { required?: boolean }).required);

      let state: string | null = null;
      if (submission !== undefined) {
        try {
          state = JSON.stringify(this.formSnapshot()) ?? null;
        } catch {
          state = null;
        }
      }
      const entries = Array.isArray(submission)
        ? submission.map((v: string | File) => (typeof v === 'string' ? v : [v.name, v.size, v.lastModified]))
        : submission;
      const key = JSON.stringify([
        this.name, entries, state, disabled, required, this.#interacted,
        validity ? [validity.flags, validity.message] : null,
      ]);
      if (key === this.#syncKey) return;
      this.#syncKey = key;

      if (internals && submission !== undefined) {
        if (!this.name || submission === null || disabled) {
          internals.setFormValue(null, state);
        } else if (typeof submission === 'string') {
          internals.setFormValue(submission, state);
        } else {
          const data = new FormData();
          for (const item of submission) data.append(this.name, item);
          internals.setFormValue(data, state);
        }
      }
      if (internals) {
        if (validity) internals.setValidity(validity.flags, validity.message, this.#anchor(validity));
        else internals.setValidity({});
      }
      // Only hosts that carry a role are what assistive tech reads.
      if (this.hasAttribute('role')) {
        this.#setAria('aria-required', required ? 'true' : null);
        this.#setAria('aria-invalid', validity && this.#interacted ? 'true' : null);
      }
    }

    #anchor(validity: FormValidityResult): HTMLElement | undefined {
      const anchor = validity.anchor && validity.anchor.isConnected ? validity.anchor : undefined;
      if (anchor) return anchor;
      // No focusable descendant: let the host itself take focus so the browser
      // can show the message instead of silently refusing to submit.
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
      return undefined;
    }

    /**
     * Host attributes rather than ElementInternals ARIA defaults: Void UI keeps
     * state machine-readable in the DOM, and it works without ElementInternals.
     */
    #setAria(attr: string, value: string | null): void {
      if (value === null) {
        if (this.getAttribute(attr) !== null) this.removeAttribute(attr);
      } else if (this.getAttribute(attr) !== value) {
        this.setAttribute(attr, value);
      }
    }

    #onInvalid = (): void => {
      // A submit or reportValidity() found us invalid: expose it, and refresh
      // the anchor (children may have rendered since the last sync).
      this.#interacted = true;
      this.#syncKey = undefined;
      this.formSync();
    };

    #listenForReset(): void {
      const form = this.closest('form');
      if (form === this.#resetForm) return;
      this.#resetForm?.removeEventListener('reset', this.#onFormReset);
      this.#resetForm = form;
      form?.addEventListener('reset', this.#onFormReset);
    }

    #stopListeningForReset(): void {
      this.#resetForm?.removeEventListener('reset', this.#onFormReset);
      this.#resetForm = null;
    }

    #onFormReset = (e: Event): void => {
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
 * The host is form-associated only for reset/fieldset callbacks and never
 * calls setFormValue.
 *
 * Components implementing `formRestore` must also update the native control's
 * *default* (see setNativeValue / setNativeChecked) so that a reset handled
 * by the `reset`-event fallback agrees with the browser's own native reset.
 */
export function NativeFormControl<T extends Constructor<VoidElement>>(Base: T) {
  class Native extends CoreFormControl(Base) {
    override [onFormChange](): void {
      this.formSyncNative();
      super[onFormChange]();
    }

    protected formSyncNative(): void {}
  }
  return Native as unknown as Constructor<VoidNativeFormControl> & T;
}

/**
 * Strategy (b): the host is form-associated and submits through
 * ElementInternals. Degrades to "no submission" where attachInternals is
 * unavailable.
 */
export function InternalsFormControl<T extends Constructor<VoidElement>>(Base: T) {
  class Internals extends CoreFormControl(Base) {
    @property({ type: Boolean, reflect: true }) required = false;

    get validity(): ValidityState | undefined {
      return this[formInternals]?.validity;
    }

    get validationMessage(): string {
      return this[formInternals]?.validationMessage ?? '';
    }

    get willValidate(): boolean {
      return this[formInternals]?.willValidate ?? false;
    }

    checkValidity(): boolean {
      return this[formInternals]?.checkValidity() ?? true;
    }

    reportValidity(): boolean {
      return this[formInternals]?.reportValidity() ?? true;
    }

    override [formSubmissionOrUndefined](): FormSubmission | undefined {
      return this.formSubmission();
    }

    protected formSubmission(): FormSubmission {
      const v = (this as unknown as { value: unknown }).value;
      return v === undefined || v === null ? null : String(v);
    }

    protected formValidationAnchor(): HTMLElement | undefined {
      return this.querySelector<HTMLElement>(FOCUSABLE) ?? undefined;
    }

    protected override formValidity(): FormValidityResult | null {
      if (!this.required) return null;
      const submission = this.formSubmission();
      const empty = submission === null || submission.length === 0;
      if (!empty) return null;
      return { flags: { valueMissing: true }, message: 'Please fill out this field.', anchor: this.formValidationAnchor() };
    }

    formStateRestoreCallback(state: string | File | FormData | null): void {
      if (typeof state !== 'string') return;
      try {
        this.formRestore(JSON.parse(state));
      } catch {
        // Unparseable state (e.g. browser autofill); keep the current value.
      }
    }
  }
  return Internals as unknown as Constructor<VoidInternalsFormControl> & T;
}

/** Selector for the first focusable descendant; exported for components that pick their own anchor. */
export const FORM_FOCUSABLE_SELECTOR = FOCUSABLE;
