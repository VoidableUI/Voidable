import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { msg } from '../messages.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';
import { actionFor, edgeEnabled, stepEnabled, Typeahead } from '../keyboard.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { multiselectKeys } from '../keymaps/pickers.js';
import { OverlayController, type OverlayCloseReason, type OverlayOpenReason } from '../overlay.js';
import { PartsController } from '../parts.js';
import { ProjectionController } from '../projection.js';
import { valueList } from '../value-list.js';

/**
 * One option of a `<void-combobox>` or `<void-multiselect>`, inside its `-content` part. The option itself is
 * the `role="option"` in the list: the parent gives it an id and writes `aria-selected` (chosen), `active`
 * (highlighted) and, in a combobox, `hidden` while the typed text filters it out.
 */
export class VoidOption extends VoidElement {
  /**
   * Value this option contributes when chosen: what the parent `void-combobox` or `void-multiselect`
   * reports and submits. The option's text content is what the user sees.
   */
  @property({ type: String, reflect: true }) value = '';
  /**
   * Mark the option as chosen. In a `void-multiselect` it is the option's state (any number may be selected);
   * in a `void-combobox` it is the initial choice when the combobox has no `value`.
   */
  @property({ type: Boolean, reflect: true }) selected = false;
  /** A disabled option is listed but cannot be highlighted or chosen. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Text shown for the option once chosen (in the combobox field, on a multiselect chip) and used for
   * filtering and type-ahead, when its content is more than plain text (an icon, a second line). Defaults to
   * the option's text content.
   */
  @property({ type: String }) label = '';

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    // Let the owning picker re-wire (and re-submit) on programmatic changes.
    const changedAny = ['selected', 'disabled', 'label', 'value'].some(k => changed.has(k) && changed.get(k) !== undefined);
    if (changedAny) {
      (this.closest('void-multiselect') ?? this.closest('void-combobox'))?.requestUpdate();
    }
  }
}

if (!customElements.get('void-option')) {
  customElements.define('void-option', VoidOption);
}

/** What an option is called once chosen: its `label`, else its text, else its value. */
/** An option's value and selected state, from its attributes until it has upgraded. */
const valueOf = (o: Element): string => (o instanceof VoidOption ? o.value : o.getAttribute('value') ?? '');
const isSelected = (o: Element): boolean => (o instanceof VoidOption ? o.selected : o.hasAttribute('selected'));

export function optionLabel(opt: Element): string {
  return opt.getAttribute('label') || opt.textContent?.trim() || opt.getAttribute('value') || '';
}

/**
 * Multi-value picker for tag selection, permission assignment, and filter fields that allow several simultaneous choices.
 *
 * One part, `<void-multiselect-content>`, holding the `<void-option>`s: it is the list (`role="listbox"`,
 * `aria-multiselectable`) shown in the top layer under the trigger. The component renders the trigger and its
 * chips itself (after the content part) and never moves, copies or wraps the options.
 *
 * Follows the WAI-ARIA select-only combobox pattern with a multiselectable listbox popup: the trigger is the
 * `role="combobox"` element and keeps DOM focus; the highlighted option is exposed with `aria-activedescendant`
 * and drawn with the `active` attribute; chosen options have `aria-selected="true"` and the others `aria-selected="false"`. The trigger is described by
 * the number of chosen options ("2 selected"). The popup stays open while options are toggled.
 *
 * Keyboard (focus on the trigger): Enter, Space, ArrowDown and Alt+ArrowDown open the list on the first chosen
 * option (else the first); ArrowUp opens it on the first option; Home and End open it on the first or last
 * option; typing characters opens it on the next option starting with them. While open: ArrowDown and ArrowUp
 * move the highlight (stopping at the ends), PageDown and PageUp by ten, Home and End to the first or last option,
 * Enter or Space toggle the highlighted option, typing characters jumps to the next option starting with them,
 * Escape and Alt+ArrowUp close the list (a second Escape reaches the surrounding dialog), Tab closes it and moves
 * on. Disabled options are skipped.
 *
 * The list is shown in the top layer (never clipped by an `overflow` or `transform` ancestor) and placed under the
 * trigger with CSS anchor positioning, flipping above it near the bottom of the viewport. A press outside closes
 * it too.
 *
 * @fires {CustomEvent<{ value: string[] }>} void-change - An option was chosen or unchosen; `value` is every chosen value.
 * @fires {CustomEvent<{ reason: 'trigger' | 'keyboard' | 'api' }>} void-open - The option list opened.
 * @fires {CustomEvent<{ reason: 'trigger' | 'escape' | 'outside' | 'blur' | 'parent' | 'api' }>} void-close - The option list is closing.
 */
export class VoidMultiselect extends InternalsFormControl(VoidElement) {
  /** Key bindings for this element's actions, as JSON (`{"close":["Escape"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = multiselectKeys;

  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = '[role=combobox]';

  /**
   * Text shown in the trigger while nothing is selected. Defaults to the `multiselect.placeholder` message (English: `Select...`). It is also the
   * trigger's accessible name when no `void-field` label names it.
   */
  @property({ type: String }) placeholder = '';
  private get _hint(): string { return this.placeholder || msg(this, 'multiselect.placeholder'); }
  /** Stop the trigger opening and exclude the values from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Mark the control invalid: it gets the error styling and `aria-invalid`. The message itself is shown
   * by the wrapping `void-field`.
   */
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) name = '';
  /** Whether the option list is showing. Reflected, so it can be read (and set) from markup. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** The option with visual focus (`aria-activedescendant`), or null. */
  private _active: VoidOption | null = null;
  private readonly _typeahead = new Typeahead();
  /** Inside updated(): the wiring it runs must not schedule another update. */
  private _wiring = false;

  /** The rendered trigger comes first, so reading order puts the field before its (top-layer) list. */
  protected readonly _projection = new ProjectionController(this, { placement: 'start' });

  protected readonly _parts = new PartsController(this, {
    tags: ['void-multiselect-content', 'void-option'],
    onChange: () => {
      this._wire();
      // Options added, removed or toggled change the chips.
      if (!this._wiring) this.requestUpdate();
    },
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'listbox',
    surface: () => this._content(),
    isOpen: () => this.open && !this.formDisabled,
    setOpen: open => {
      this.open = open;
    },
    anchor: () => this._trigger(),
    attr: (el, name, value) => this._parts.set(el, name, value),
    style: (el, p, v) => this._parts.style(el, p, v),
    // The trigger keeps focus (aria-activedescendant) and carries its own ARIA.
    initialFocus: () => false,
  });

  private _content(): HTMLElement | null {
    return this._parts.one('void-multiselect-content');
  }

  private _trigger(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > .void-multiselect-trigger');
  }

  private get _options(): VoidOption[] {
    const content = this._content();
    return content ? this._parts.within<VoidOption>(content, 'void-option') : [];
  }

  /** Values asked for while no option exists yet (an attribute parsed ahead of its options), applied when they arrive. */
  private _wanted: string[] | null = null;
  /** The serialised value last handed to Lit, to notice a choice made on the options (the user, a morph). */
  private _reflected: string | null = null;

  /**
   * The values of the chosen options, as a list. The `value` attribute is the same list as a JSON array
   * (`value='["a","b"]'`), kept in step as the choice changes; setting it chooses those options.
   * @default []
   */
  @property({ converter: valueList, reflect: true })
  get value(): string[] {
    const options = this._options;
    if (this._wanted && options.length === 0) return [...this._wanted];
    return options.filter(isSelected).map(valueOf);
  }

  /** Select exactly the options whose value is listed. Does not fire void-change. */
  set value(values: string[]) {
    const options = this._options;
    const list = Array.isArray(values) ? values : [];
    this._wanted = options.length === 0 ? [...list] : null;
    const wanted = new Set(list);
    for (const opt of options) {
      const on = wanted.has(valueOf(opt));
      // An option not upgraded yet (parsed after its picker) takes the attribute, which it reads on upgrade.
      if (opt instanceof VoidOption) opt.selected = on;
      else (opt as Element).toggleAttribute('selected', on);
    }
    this.requestUpdate('value', undefined);
  }

  /** One entry per selected option. */
  protected formSubmission(): FormSubmission {
    return this.value;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('focusout', this._onFocusOut);
    this.addEventListener('mousedown', this._onPointerDown);
    this.addEventListener('click', this._onClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('focusout', this._onFocusOut);
    this.removeEventListener('mousedown', this._onPointerDown);
    this.removeEventListener('click', this._onClick);
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (changed.has('open') && !this.open) {
      this._active = null;
      this._typeahead.reset();
    }
    // The choice lives on the options: reflect it when it is no longer what the attribute shows.
    const now = JSON.stringify(this.value);
    if (now !== this._reflected) {
      this._reflected = now;
      if (!changed.has('value')) this.requestUpdate('value', undefined);
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    this._wiring = true;
    try {
      this._parts.sync();
    } finally {
      this._wiring = false;
    }
    if (this.open) this._active?.scrollIntoView?.({ block: 'nearest' });
  }

  /** The content part is the multiselectable listbox in the top layer; every option a `role="option"`. */
  private _wire(): void {
    const content = this._content();
    const trigger = this._trigger();
    const options = this._options;
    const open = this.open && !this.formDisabled;
    // Values the attribute asked for before the options were there.
    if (this._wanted && options.length > 0) this.value = this._wanted;
    if (this._active && (!options.includes(this._active) || this._active.disabled)) this._active = null;
    for (const opt of options) {
      this._parts.set(opt, 'role', 'option');
      this._parts.id(opt, 'void-option');
      // Every option says whether it is chosen, true or false (the ARIA Authoring Practices for a multiselectable listbox):
      // an option with no aria-selected is not exposed as selectable, so the change to "selected" has nothing to be announced against (#75).
      this._parts.set(opt, 'aria-selected', opt.selected ? 'true' : 'false');
      this._parts.set(opt, 'aria-disabled', opt.disabled ? 'true' : null);
      this._parts.set(opt, 'active', opt === this._active);
    }
    if (!content) return;
    this._parts.set(content, 'popover', 'manual');
    this._parts.set(content, 'role', 'listbox');
    this._parts.set(content, 'aria-multiselectable', 'true');
    this._parts.id(content, 'void-multiselect-content');
    // Named only while open, so that the field's label finds one element (the control) while closed.
    const labelledby = open ? trigger?.getAttribute('aria-labelledby') ?? null : null;
    this._parts.set(content, 'aria-labelledby', labelledby);
    this._parts.set(content, 'aria-label', open && !labelledby ? trigger?.getAttribute('aria-label') || this._hint || null : null);
    if (trigger) {
      this._parts.set(trigger, 'aria-activedescendant', open && this._active ? this._parts.id(this._active, 'void-option') : null);
    }
  }

  /** The id of the content part while the list is open (one is generated where the author wrote none). */
  private _controls(open: boolean): string | typeof nothing {
    const content = open ? this._content() : null;
    return content ? this._parts.id(content, 'void-multiselect-content') : nothing;
  }

  // aria-description is global in ARIA 1.3; the lint's role table predates it.
  /* eslint-disable lit-a11y/role-supports-aria-attr */
  render() {
    const selectedOpts = this._options.filter(o => o.selected);
    const open = this.open && !this.formDisabled;
    const count = selectedOpts.length;
    return html`
      <div
        class="void-multiselect-trigger"
        role="combobox"
        tabindex=${this.formDisabled ? '-1' : '0'}
        aria-label=${this._hint}
        aria-haspopup="listbox"
        aria-expanded=${String(open)}
        aria-controls=${this._controls(open)}
        aria-description=${count ? msg(this, 'multiselect.selected', { count }) : nothing}
        aria-disabled=${this.formDisabled ? 'true' : nothing}
        aria-required=${this.required ? 'true' : nothing}
        aria-invalid=${this.error ? 'true' : nothing}
        @keydown=${this._onTriggerKeydown}
      >
        ${count > 0
          ? selectedOpts.map(opt => html`
              <span class="void-multiselect-pill">
                <span class="void-multiselect-pill-label">${optionLabel(opt)}</span>
                <button
                  type="button"
                  class="void-multiselect-pill-remove"
                  tabindex="-1"
                  aria-label=${msg(this, 'removeItem', { name: optionLabel(opt) })}
                  data-value=${opt.value}
                >×</button>
              </span>
            `)
          : html`<span class="void-multiselect-placeholder">${this._hint}</span>`
        }
      </div>
      ${this.error ? html`<span class="void-multiselect-error">${this.error}</span>` : nothing}
    `;
  }
  /* eslint-enable lit-a11y/role-supports-aria-attr */

  /** Presses on the list and the chips keep focus on the trigger. */
  private _onPointerDown = (e: MouseEvent): void => {
    const t = e.target as Element;
    if (this._content()?.contains(t) || t.closest?.('.void-multiselect-pill-remove')) e.preventDefault();
  };

  private _onClick = (e: MouseEvent): void => {
    if (this.formDisabled) return;
    const t = e.target as Element;
    const remove = t.closest?.('.void-multiselect-pill-remove');
    if (remove && this._trigger()?.contains(remove)) {
      e.stopPropagation();
      const opt = this._options.find(o => o.value === remove.getAttribute('data-value'));
      if (opt) this._toggleOption(opt, false);
      return;
    }
    const content = this._content();
    if (content?.contains(t)) {
      const opt = t.closest('void-option') as VoidOption | null;
      if (opt && !opt.disabled && this._options.includes(opt)) this._toggleOption(opt);
      return;
    }
    if (this._trigger()?.contains(t)) {
      e.stopPropagation();
      if (this.open) this._close('trigger');
      else this._openList('none', 'trigger');
    }
  };

  /** Opens the list; the highlight starts on the first selected option, the first or last option, or nowhere. */
  private _openList(start: 'selected' | 'first' | 'last' | 'none', reason: OverlayOpenReason = 'keyboard'): void {
    this._overlay.requestOpen(reason);
    if (!this.open) return;
    const options = this._options;
    const disabled = options.map(o => o.disabled);
    let i = -1;
    if (start === 'first') i = edgeEnabled(disabled, 1);
    else if (start === 'last') i = edgeEnabled(disabled, -1);
    else if (start === 'selected') {
      i = options.findIndex(o => o.selected && !o.disabled);
      if (i < 0) i = edgeEnabled(disabled, 1);
    }
    this._active = i >= 0 ? options[i]! : null;
    this.requestUpdate();
  }

  /** Closes the list through the overlay stack (so `void-close` carries the reason). */
  private _close(reason: OverlayCloseReason = 'api'): void {
    if (this.open) this._overlay.requestClose(reason);
  }

  private _moveActive(i: number): void {
    if (i < 0) return;
    this._active = this._options[i]!;
    this.requestUpdate();
  }

  /** The enabled option `n` steps from the current one, stopping at the ends. */
  private _stepBy(n: number): number {
    const options = this._options;
    const disabled = options.map(o => o.disabled);
    const current = this._active ? options.indexOf(this._active) : -1;
    const step = n > 0 ? 1 : -1;
    let best = current;
    for (let i = current, left = Math.abs(n); left > 0; ) {
      const next = stepEnabled(disabled, i, step, false);
      if (next < 0) break;
      best = i = next;
      left--;
    }
    return best >= 0 ? best : edgeEnabled(disabled, step);
  }

  private _onTriggerKeydown = (e: KeyboardEvent): void => {
    if (this.formDisabled || e.target !== e.currentTarget) return;
    const action = actionFor(this, e);
    if (!action) {
      // Tab leaves: close the list first (focus-out would too).
      if (e.key === 'Tab' && this.open && !e.defaultPrevented) this._close('blur');
      return;
    }
    if (!this.open) {
      // Closed, every movement key opens the list where it would have gone.
      if (action === 'first' || action === 'last') this._openList(action);
      else if (action === 'previous') this._openList('first');
      else if (action === 'next' || action === 'activate') this._openList('selected');
      else if (action === 'typeahead') {
        this._openList('selected');
        this._typeaheadTo(e.key);
      } else return;
      e.preventDefault();
      return;
    }
    const disabled = this._options.map(o => o.disabled);
    switch (action) {
      case 'next':
        this._moveActive(this._stepBy(1));
        break;
      case 'previous':
        this._moveActive(this._stepBy(-1));
        break;
      case 'nextPage':
        this._moveActive(this._stepBy(10));
        break;
      case 'previousPage':
        this._moveActive(this._stepBy(-10));
        break;
      case 'first':
        this._moveActive(edgeEnabled(disabled, 1));
        break;
      case 'last':
        this._moveActive(edgeEnabled(disabled, -1));
        break;
      case 'activate':
        if (this._active && !this._active.disabled) this._toggleOption(this._active);
        break;
      case 'close':
        e.stopPropagation();
        this._close('escape');
        break;
      case 'typeahead':
        this._typeaheadTo(e.key);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  private _typeaheadTo(char: string): void {
    const options = this._options;
    const current = this._active ? options.indexOf(this._active) : -1;
    const i = this._typeahead.match(char, options.map(o => optionLabel(o)), options.map(o => o.disabled), current);
    this._moveActive(i);
  }

  /** Focus left the widget (Tab, or a click elsewhere): close the list. */
  private _onFocusOut = (e: FocusEvent): void => {
    if (this.open && !this.contains(e.relatedTarget as Node | null)) this._close('blur');
  };

  private _toggleOption(opt: VoidOption, on = !opt.selected): void {
    opt.selected = on;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }
}

if (!customElements.get('void-multiselect')) {
  customElements.define('void-multiselect', VoidMultiselect);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-option': VoidOption;
    'void-multiselect': VoidMultiselect;
  }
}
