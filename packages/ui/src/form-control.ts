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
 *     name/value/disabled/required/form to that control and the native
 *     control submits and validates. The host is NOT form-associated, so the
 *     native control is the only thing listed in form.elements under that
 *     name (form.elements.email.value keeps working). On reset the host does
 *     not restore anything itself: it listens for `reset` (capture phase) and,
 *     in a task after the reset has run, re-reads its state from the native
 *     control. The browser has by then reset the control (real reset) or left
 *     it alone (cancelled reset), whichever listener cancelled. For that to be
 *     right the native control's own defaults (defaultValue, defaultChecked,
 *     option defaultSelected) are set to the host's initial state.
 *     <fieldset disabled> and disabled groups are observed on the ancestors.
 *     Pass-through containers (radio-group, checkbox-group) forward `name`,
 *     `disabled`, `required` and `form` to child controls of this kind and
 *     submit nothing themselves.
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
 * Where `attachInternals` is unavailable (old browsers, happy-dom), (b)
 * controls keep working as UI and restore their default on the form's `reset`
 * event, but submit nothing.
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
  /** True when disabled directly or via a disabled ancestor (`<fieldset disabled>`, disabled group). */
  get formDisabled(): boolean;
  /** Reset callback (called by the browser for form-associated hosts). */
  formResetCallback(): void;
  /** Browser callback: the disabled state (own or via fieldset) changed. */
  formDisabledCallback(disabled: boolean): void;
  /** Reactive mirror of formAncestorDisabled(), kept current by observing ancestors. */
  protected ancestorDisabled: boolean;
  /** Hook: whether an ancestor disables this control. Defaults to a disabled fieldset. */
  protected formAncestorDisabled(): boolean;
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
  /** The `form` attribute, forwarded to the native control. */
  protected formAttr: string | null;
  /** Hook: push host state into the native control synchronously (no events). */
  protected formSyncNative(): void;
  /** Hook: make the native control's default (reset target) equal `state`. */
  protected formWriteNativeDefault(state: unknown): void;
  /** Hook: after a reset, mirror the native control's state into the host (no events). */
  protected formReadNative(): void;
  /** Hook: the native control that owns form association. */
  protected formNativeControl(): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
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
const onFormReset = Symbol('onFormReset');
const listenForReset = Symbol('listenForReset');

function CoreFormControl<T extends Constructor<VoidElement>>(Base: T) {
  class Core extends Base {
    /**
     * Key the control's value is submitted under in the form's `FormData`. Without a name the control
     * submits nothing.
     */
    @property({ type: String, reflect: true }) name = '';
    @state() protected ancestorDisabled = false;

    #internals: ElementInternals | null = null;
    #default: unknown = undefined;
    #defaultCaptured = false;
    #resetForm: HTMLFormElement | null = null;
    #syncKey: string | undefined = undefined;
    /** Like :user-invalid — only expose aria-invalid after interaction or a failed submit. */
    #interacted = false;
    #ancestorObserver: MutationObserver | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      const associated = (this.constructor as { formAssociated?: boolean }).formAssociated;
      try {
        if (associated && typeof this.attachInternals === 'function') this.#internals = this.attachInternals();
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
      // resets that were not cancelled). Without it, use the reset event.
      if (!this.#internals) this[listenForReset]();
      this.#observeAncestors();
    }

    disconnectedCallback(): void {
      super.disconnectedCallback();
      this.#stopListeningForReset();
      this.#ancestorObserver?.disconnect();
      this.#ancestorObserver = null;
    }

    /** Watch every ancestor's `disabled` attribute (fieldsets, disabled groups). */
    #observeAncestors(): void {
      this.#ancestorObserver?.disconnect();
      this.ancestorDisabled = this.formAncestorDisabled();
      if (typeof MutationObserver === 'undefined') return;
      this.#ancestorObserver = new MutationObserver(() => {
        const next = this.formAncestorDisabled();
        if (next !== this.ancestorDisabled) {
          this.ancestorDisabled = next;
          this.formSync();
        }
      });
      for (let p = this.parentElement; p; p = p.parentElement) {
        this.#ancestorObserver.observe(p, { attributes: true, attributeFilter: ['disabled'] });
      }
    }

    protected formAncestorDisabled(): boolean {
      return isInDisabledFieldset(this);
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
      return Boolean((this as { disabled?: boolean }).disabled) || this.formAncestorDisabled();
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

    formDisabledCallback(): void {
      this.ancestorDisabled = this.formAncestorDisabled();
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
      // Machine-readable disabled state (own, fieldset or group).
      if (disabled) this.#setAria('aria-disabled', 'true');
      else if (this.hasAttribute('aria-disabled')) this.#setAria('aria-disabled', 'false');

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
      if (!this.hasAttribute('tabindex')) this.setHostAttribute('tabindex', '-1');
      return undefined;
    }

    /**
     * Host attributes rather than ElementInternals ARIA defaults: Void UI keeps
     * state machine-readable in the DOM, and it works without ElementInternals.
     */
    #setAria(attr: string, value: string | null): void {
      this.setHostAttribute(attr, value);
    }

    #onInvalid = (): void => {
      // A submit or reportValidity() found us invalid: expose it, and refresh
      // the anchor (children may have rendered since the last sync).
      this.#interacted = true;
      this.#syncKey = undefined;
      this.formSync();
    };

    /** (Re)attach the capture-phase reset listener to the current owning form. */
    [listenForReset](): void {
      const form = this.isConnected ? this.form : null;
      if (form === this.#resetForm) return;
      this.#resetForm?.removeEventListener('reset', this.#onFormReset, true);
      this.#resetForm = form;
      form?.addEventListener('reset', this.#onFormReset, true);
    }

    #stopListeningForReset(): void {
      this.#resetForm?.removeEventListener('reset', this.#onFormReset, true);
      this.#resetForm = null;
    }

    #onFormReset = (e: Event): void => {
      // Only the form's own reset (not a bubbling event of the same name).
      // Compared by type: some DOMs (happy-dom) hand out proxies for the form.
      if (!(e.target instanceof HTMLFormElement)) return;
      this[onFormReset]();
    };

    /** Without ElementInternals: restore from the remembered default. */
    [onFormReset](): void {
      this.formResetCallback();
    }
  }
  return Core;
}

/**
 * Strategy (a): the component renders a native control that submits for it.
 * The host is not form-associated; see the header comment for how reset,
 * defaults and disabled ancestors are handled.
 */
export function NativeFormControl<T extends Constructor<VoidElement>>(Base: T) {
  class Native extends CoreFormControl(Base) {
    /**
     * `id` of a `<form>` elsewhere in the page that this control belongs to, as on a native control.
     * Without it the control belongs to the form it sits inside.
     */
    @property({ attribute: 'form' }) protected formAttr: string | null = null;

    #nativeDefault: unknown = undefined;
    #nativeDefaultPending = false;
    #nativeDefaultRetry = false;
    /** The native control the reset target was last written to. */
    #nativeDefaultControl: Element | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      this.addController({
        hostUpdated: () => {
          const control = this.formNativeControl();
          if (this.#nativeDefaultPending && control) {
            this.#nativeDefaultPending = false;
            this.formWriteNativeDefault(this.#nativeDefault);
          } else if (this.#nativeDefaultPending && !this.#nativeDefaultRetry) {
            // The native control belongs to children that render after this
            // host (radios in a group): try again once they have.
            this.#nativeDefaultRetry = true;
            setTimeout(() => {
              this.#nativeDefaultRetry = false;
              if (this.#nativeDefaultPending && this.formNativeControl()) {
                this.#nativeDefaultPending = false;
                this.formWriteNativeDefault(this.#nativeDefault);
              }
            }, 0);
          }
          // A native control rebuilt after its chrome was lost (a morph without
          // the pre-morph hook) gets the reset target again.
          if (!this.#nativeDefaultPending && control && control !== this.#nativeDefaultControl) {
            if (this.#nativeDefaultControl) this.formWriteNativeDefault(this.#nativeDefault);
            this.#nativeDefaultControl = control;
          }
          // The owning form can change with the `form` attribute.
          this[listenForReset]();
        },
      });
    }

    override get form(): HTMLFormElement | null {
      return this.formNativeControl()?.form ?? null;
    }

    protected override formCaptureDefault(): void {
      super.formCaptureDefault();
      this.#nativeDefault = this.formSnapshot();
      this.#nativeDefaultPending = true;
      if (this.hasUpdated && this.formNativeControl()) {
        this.#nativeDefaultPending = false;
        this.formWriteNativeDefault(this.#nativeDefault);
      }
    }

    /**
     * Mirror, don't restore: run after the reset has finished (a new task, so
     * also after a reset triggered by a native reset button) and copy whatever
     * the native control now holds. A cancelled reset changed nothing.
     */
    override [onFormReset](): void {
      setTimeout(() => {
        this.formReadNative();
        this.formSync();
      }, 0);
    }

    override [onFormChange](): void {
      this.formSyncNative();
      super[onFormChange]();
    }

    protected formSyncNative(): void {}

    protected formWriteNativeDefault(state: unknown): void {
      void state;
    }

    protected formReadNative(): void {}

    protected formNativeControl(): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
      return this.querySelector('input, select, textarea');
    }
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
    static formAssociated = true;

    /**
     * The control must have a value before its form can be submitted. An empty control is invalid
     * (`valueMissing`) and the browser reports it, as for a native field.
     */
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
