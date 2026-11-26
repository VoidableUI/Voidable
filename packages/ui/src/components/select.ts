import { html, nothing, type PropertyValues } from 'lit';
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

  // ── The choice ──
  //
  // `_choice` is the one source of truth. It changes when the user picks in the native select (`input`,
  // `change`), when `value` or the `value` attribute is set (which is how a server morph that changed it
  // arrives), when the server's markup marks other options `selected` than its last render, when the chosen
  // option is gone, and when a script chose an option in the select itself (`select.value = …`, as Vue,
  // Svelte or Angular bindings do) at a moment no patch was under way.
  //
  // A patch is never read back. While a morph library patches the select (options replaced, `selected`
  // rewritten, selectedIndex reset) it holds the server's markup, so after every patch (the adapters'
  // pre-morph hook, a mutation of the select) a select left at its markup's default selection gets the
  // choice written back into it. A form building its data first brings all this up to date (`_onFormData`),
  // so what it submits never depends on when a callback or an observer runs.

  /** The chosen values (one for a single select), or null before anything decided them. */
  private _choice: string[] | null = null;
  /** The choice came from `value` and waits for an option that has it. */
  private _pending = false;
  /** The options the server's markup marks `selected` at its last render (JSON), for the morph rule. */
  private _serverSelection: string | null = null;
  /** The `value` attribute the markup or the server last wrote: what a form reset returns to. */
  private _initial: string | null = null;

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
    if (this._choice) return this._choice[0] ?? '';
    return this.select?.value ?? '';
  }

  set value(next: string) {
    const old = this.value;
    if (next === null || next === undefined) {
      // No value: the options' `selected` decide.
      const select = this.select;
      this._choice = select ? marked(select) : null;
      this._pending = false;
    } else {
      this._choice = [String(next)];
      this._pending = true;
    }
    this._apply();
    this.requestUpdate('value', old);
  }

  /** Lit writes the reflected attribute during update; any other write of `value` is the markup's or the server's. */
  private _reflecting = false;

  protected override update(changed: PropertyValues): void {
    this._reflecting = true;
    try {
      super.update(changed);
    } finally {
      this._reflecting = false;
    }
  }

  /** Asks Lit to reflect the choice when it moved, or when the attribute does not show it yet. */
  private _changed(old: string): void {
    const now = this.value;
    if (now !== old) this.requestUpdate('value', old);
    else if (this.getAttribute('value') !== now) this.requestUpdate('value', null);
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    // The server's (or the author's) value is the new reset target, as a native input's value attribute is.
    if (name === 'value' && !this._reflecting) this._initial = value;
    super.attributeChangedCallback(name, old, value);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Capture: the select's events reach the host even where they do not bubble (a synthetic one).
    this.addEventListener('input', this._onPick, true);
    this.addEventListener('change', this._onChange, true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('input', this._onPick, true);
    this.removeEventListener('change', this._onChange, true);
    this._observe(null);
    this._watchForm(null);
  }

  /** The select was added, replaced or moved (PartsController): follow it, mark it, write the choice into it. */
  private _wire(): void {
    const select = this.select;
    const replaced = !!select && !!this._observed && select !== this._observed;
    // Mutations of the select not delivered yet belong to this round.
    const records = this._observer?.takeRecords() ?? [];
    this._observe(select);
    if (!select) return;
    this._markInvalid(select);
    this._watchForm(select.form);
    // A morph through the adapters reconciles in its own microtask.
    if (this._morphQueued) return;
    if (this._serverSelection === null) this._serverSelection = selectedAttrs(select);
    else if (replaced) this._serverMarked(select);
    this._reconcile(replaced || patched(records) ? 'mutation' : 'none', records);
  }

  /**
   * Brings the choice and the native select into agreement. `patch` says what happened to the select since
   * the choice was last written into it:
   * - `morph`: a morph through the adapters (between the pre-morph hook and its microtask, which the
   *   adapters' contract makes the morph's own synchronous run): any difference is the morph's, and the
   *   choice goes back in;
   * - `mutation`: the select's options, their text or their `selected` were changed: a select left at its
   *   markup's default selection (or none) is that patch, and the choice goes back in;
   * - `none`: nothing.
   * Any other difference is a choice a script made in the select (`select.value = …`), and the choice follows it.
   */
  private _reconcile(patch: 'morph' | 'mutation' | 'none', records: MutationRecord[] = []): void {
    const select = this.select;
    if (!select) return;
    this._finishReset();
    if (patch === 'mutation' && replacedOptions(records)) this._serverMarked(select);
    const old = this.value;
    const choice = this._choice;
    if (choice === null || (!this._pending && !select.multiple && choice.length === 0)) {
      // Nothing decided yet: the select's own selection (its markup, autofill, a restored page) is the start.
      if (select.options.length) this._choice = chosen(select);
    } else if (patch !== 'morph' && !this._pending && choice.every(v => hasOption(select, v))) {
      const now = chosen(select);
      const reset = patch === 'mutation' && same(now, marked(select));
      if (now.length && !reset && !same(now, choice)) this._choice = now;
    }
    this._apply();
    this._changed(old);
  }

  /** Reconciles now, taking the mutations of the select not delivered yet (unless a morph's microtask will). */
  private _flush(): void {
    if (this._morphQueued || !this.select) return;
    const records = this._observer?.takeRecords() ?? [];
    this._reconcile(patched(records) ? 'mutation' : 'none', records);
  }

  /** Puts the choice into the native select (properties only: no attribute, so no mutation of its own). */
  private _apply(): void {
    const select = this.select;
    const choice = this._choice;
    if (!select || !choice) return;
    if (!choice.every(v => hasOption(select, v))) {
      // A value set in code waits for its option. A choice whose option the server removed follows the select.
      if (this._pending) return;
      const old = this.value;
      this._choice = chosen(select);
      this._changed(old);
      return;
    }
    this._pending = false;
    if (!select.multiple) {
      if (choice.length && select.value !== choice[0]) select.value = choice[0]!;
      return;
    }
    const wanted = new Set(choice);
    for (const option of Array.from(select.options)) {
      if (option.selected !== wanted.has(option.value)) option.selected = wanted.has(option.value);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    const select = this.select;
    if (changed.has('error') && select) this._markInvalid(select);
    this._flush();
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

  /** The user picked in the native select. */
  private _onPick = (e: Event): void => {
    const select = this.select;
    if (!select || e.target !== select) return;
    this._pendingReset = null;
    const old = this.value;
    this._choice = chosen(select);
    this._pending = false;
    this._changed(old);
  };

  private _onChange = (e: Event): void => {
    if (e.target !== this.select) return;
    this._onPick(e);
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  };

  // ── Mutations of the native select ──

  private _observer: MutationObserver | null = null;
  private _observed: HTMLSelectElement | null = null;

  private _observe(select: HTMLSelectElement | null): void {
    if (select === this._observed) return;
    this._observer?.disconnect();
    this._observed = select;
    if (!select) return;
    this._observer ??= new MutationObserver(this._onMutations);
    this._observer.observe(select, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  /**
   * Something changed in the select: a morph without the pre-morph hook, options written with innerHTML,
   * LiveView patching a locked select, a framework re-rendering the options.
   */
  private _onMutations = (records: MutationRecord[]): void => {
    // A morph through the adapters reconciles in its own microtask, from the server's markup.
    if (this._morphQueued || !this.isConnected) return;
    this._reconcile(patched(records) ? 'mutation' : 'none', records);
  };

  /**
   * Options the server rendered afresh: when they mark other options `selected` than its last render did,
   * that is the server's new selection, and it wins (unless a value set in code still waits for its option).
   */
  private _serverMarked(select: HTMLSelectElement): void {
    const now = selectedAttrs(select);
    if (now === this._serverSelection) return;
    this._serverSelection = now;
    if (this._pending) return;
    const values = JSON.parse(now) as string[];
    if (!values.length) return;
    const old = this.value;
    this._choice = select.multiple ? values : [values[values.length - 1]!];
    this._changed(old);
  }

  // ── Form data and reset ──

  private _form: HTMLFormElement | null = null;

  private _watchForm(form: HTMLFormElement | null): void {
    if (form === this._form) return;
    this._form?.removeEventListener('reset', this._onReset);
    this._form?.removeEventListener('formdata', this._onFormData);
    this._form = form;
    form?.addEventListener('reset', this._onReset);
    form?.addEventListener('formdata', this._onFormData);
  }

  /**
   * The form is building its data (a submit, `new FormData(form)`, a LiveView event) from the native select.
   * A patch may have reset it a moment ago, before its mutations were delivered or the morph's microtask
   * ran: bring the choice up to date and into the select now, and correct the entries it already gave.
   */
  private _onFormData = (e: FormDataEvent): void => {
    const select = this.select;
    if (!select || select.form !== e.target) return;
    const before = submits(select);
    this._flush();
    this._apply();
    if (!select.name) return;
    const after = submits(select);
    if (same(before, after)) return;
    const entries = e.formData.getAll(select.name);
    for (const v of before) {
      const i = entries.indexOf(v);
      if (i >= 0) entries.splice(i, 1);
    }
    e.formData.delete(select.name);
    for (const v of [...entries, ...after]) e.formData.append(select.name, v);
  };

  /** A reset in progress: the form resets the native select after its reset event, and the choice follows it. */
  private _pendingReset: Event | null = null;

  private _onReset = (e: Event): void => {
    this._pendingReset = e;
    // The form resets its controls after this event: a task later (a reset button's reset included) it has.
    // Anything that reads the choice for the form before then (form data, a patch) finishes the reset first.
    setTimeout(() => {
      this._finishReset();
      this._apply();
    });
  };

  /** After a reset the options' `selected` decide; a `value` attribute (the markup's or the server's) is applied again. */
  private _finishReset(): void {
    const e = this._pendingReset;
    if (!e) return;
    this._pendingReset = null;
    const select = this.select;
    if (e.defaultPrevented || !select || !this.isConnected) return;
    const old = this.value;
    if (this._initial !== null) {
      this._choice = [this._initial];
      this._pending = true;
    } else {
      this._choice = marked(select);
      this._pending = false;
    }
    this._apply();
    this._changed(old);
  }

  // ── Morphs: the user's choice stays unless the server changed the selection ──

  /** A morph through the adapters is under way; the choice is written back in the microtask after it. */
  private _morphQueued = false;

  /**
   * The decision is taken here, from the server's markup, before the morph touches anything: the options
   * it marks `selected`, compared with its last render. A `value` attribute the server changed arrives
   * during the morph itself (the morph writes it, which sets `value`) and so wins over them.
   */
  override voidBeforeMorph(incoming?: Element | null): boolean {
    if (incoming && incoming !== this) {
      // Before the morph touches the select it holds the client's state: take up anything not seen yet.
      this._flush();
      // A copy of a rendered element (LiveView morphs to a clone of a locked one, which it patched) carries
      // what it recorded from the server's markup; its own options may have been re-synced from the live one.
      const recorded = incoming instanceof VoidSelect ? incoming._serverSelection : null;
      const theirs = recorded ?? serverSelect(incoming);
      // An upgraded element that recorded nothing is the server's markup (Livewire builds it in the document)
      // or a copy of the live element that no patch reached: what merely repeats the live options is the copy.
      const copy = recorded === null && incoming instanceof VoidSelect && !!this.select && theirs === selectedAttrs(this.select);
      if (theirs !== null && !copy) {
        const changed = this._serverSelection !== null && theirs !== this._serverSelection;
        this._serverSelection = theirs;
        const values = JSON.parse(theirs) as string[];
        if (changed && values.length && !this._pending) {
          const old = this.value;
          this._choice = this.select?.multiple ? values : [values[values.length - 1]!];
          this._changed(old);
        }
      }
      if (!this._morphQueued) {
        this._morphQueued = true;
        // The morph runs synchronously after this call (the adapters' contract): this runs once it has.
        queueMicrotask(this._afterMorph);
      }
    }
    return super.voidBeforeMorph(incoming);
  }

  private _afterMorph = (): void => {
    this._morphQueued = false;
    // The decision was taken from the server's markup; what the morph did to the select is the patch.
    this._observer?.takeRecords();
    const select = this.select;
    if (!this.isConnected || !select) return;
    // A different select (the morph replaced it): follow it.
    this._observe(select);
    this._watchForm(select.form);
    // Server markup does not carry the aria-invalid the error wrote.
    this._markInvalid(select);
    this._reconcile('morph');
  };
}

function hasOption(select: HTMLSelectElement, value: string): boolean {
  for (const o of Array.from(select.options)) if (o.value === value) return true;
  return false;
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function isOptionNode(n: Node): boolean {
  return n.nodeName === 'OPTION' || n.nodeName === 'OPTGROUP';
}

/** Mutations that can reset a select's selection: options added, removed or re-texted, `selected` or `multiple` rewritten. */
function patched(records: readonly MutationRecord[]): boolean {
  return records.some(r =>
    r.type === 'attributes' ? r.attributeName === 'selected' || r.attributeName === 'multiple' : true,
  );
}

/** Options were replaced (some removed and some added): the server rendered them afresh. */
function replacedOptions(records: readonly MutationRecord[]): boolean {
  let removed = false;
  let added = false;
  for (const r of records) {
    if (r.type !== 'childList') continue;
    removed ||= Array.from(r.removedNodes).some(isOptionNode);
    added ||= Array.from(r.addedNodes).some(isOptionNode);
  }
  return removed && added;
}

/** The values of the options the markup marks `selected`, in order, as JSON. */
function selectedAttrs(select: Element): string {
  return JSON.stringify(Array.from(select.querySelectorAll('option[selected]'), o => (o as HTMLOptionElement).value));
}

/** The incoming element's own select, as `selectedAttrs`, or null when it has none. */
function serverSelect(incoming: Element): string | null {
  const select = incoming.querySelector('select');
  return select ? selectedAttrs(select) : null;
}

/** What the options' `selected` choose, as the select's default selection is (the last one in a single select). */
function marked(select: HTMLSelectElement): string[] {
  const values = JSON.parse(selectedAttrs(select)) as string[];
  if (select.multiple) return values;
  if (values.length) return [values[values.length - 1]!];
  const first = Array.from(select.options).find(o => !o.disabled);
  return first ? [first.value] : [];
}

/** The options the native select has selected now (read from each option: `selectedOptions` can be cached). */
function selectedOptions(select: HTMLSelectElement): HTMLOptionElement[] {
  return Array.from(select.options).filter(o => o.selected);
}

/** The values the native select has selected now. */
function chosen(select: HTMLSelectElement): string[] {
  return selectedOptions(select).map(o => o.value);
}

/** The entries the select contributes to its form's data. */
function submits(select: HTMLSelectElement): string[] {
  if (!select.name || select.matches(':disabled')) return [];
  return selectedOptions(select)
    .filter(o => !o.matches(':disabled'))
    .map(o => o.value);
}

if (!customElements.get('void-select')) {
  customElements.define('void-select', VoidSelect);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-select': VoidSelect;
  }
}
