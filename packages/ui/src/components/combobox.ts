import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { msg } from '../messages.js';
import { InternalsFormControl } from '../form-control.js';
import { OverlayController, type OverlayCloseReason } from '../overlay.js';
import { PartsController } from '../parts.js';
import { isFocusParked, ProjectionController } from '../projection.js';
import { actionFor, edgeEnabled, stepEnabled } from '../keyboard.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { comboboxKeys } from '../keymaps/pickers.js';
import { optionLabel, VoidOption } from './multiselect.js';

/**
 * Filterable dropdown for long option lists like country selectors, user assignment fields, and tag pickers.
 *
 * One part, `<void-combobox-content>`, holding the `<void-option>`s: it is the list (`role="listbox"`) shown in the
 * top layer under the field. The component renders the text field itself (after the content part) and never
 * moves, copies or wraps the options: each `<void-option>` is the `role="option"` the browser and assistive
 * technology see.
 *
 * Follows the WAI-ARIA "editable combobox with list autocomplete" pattern (manual selection): the rendered input
 * carries `role="combobox"` and keeps DOM focus; the highlighted option is exposed with `aria-activedescendant`
 * and drawn with the `active` attribute; the chosen option has `aria-selected="true"`.
 *
 * Keyboard (focus in the input): ArrowDown opens the list and highlights the chosen option, else the first one
 * (open: the next option, wrapping); ArrowUp the same towards the last; Alt+ArrowDown opens it without
 * highlighting; Enter chooses the highlighted option and closes the list (with nothing highlighted it closes the
 * list and lets a surrounding form submit); Escape closes the list (a second Escape reaches the surrounding
 * dialog); ArrowLeft, ArrowRight, Home and End move the text cursor and take the highlight off the list; typing
 * filters the options; Tab closes the list. Disabled options are skipped.
 *
 * The list is shown in the top layer (never clipped by an `overflow` or `transform` ancestor) and placed under the
 * input with CSS anchor positioning, flipping above it near the bottom of the viewport. A press outside closes it
 * too; focus stays in the input.
 *
 * @fires {CustomEvent<{ reason: 'keyboard' | 'focus' | 'api' }>} void-open - The option list opened.
 * @fires {CustomEvent<{ reason: 'escape' | 'outside' | 'blur' | 'select' | 'parent' | 'api' }>} void-close - The option list is closing.
 */
export class VoidCombobox extends InternalsFormControl(VoidElement) {
  /** Key bindings for this element's actions, as JSON (`{"close":["Escape"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = comboboxKeys;

  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = 'input[role=combobox]';

  /**
   * `value` of the chosen `void-option`. Reflected to the attribute as the choice changes. Written in markup
   * it is the initial choice (without it, an option marked `selected` is), which a form reset restores.
   */
  @property({ type: String, reflect: true }) value = '';
  /**
   * Hint shown in the search field while it is empty. Defaults to the `combobox.placeholder` message (English: `Search...`). It is also the field's
   * accessible name when no `void-field` label names it.
   */
  @property({ type: String }) placeholder = '';
  private get _hint(): string { return this.placeholder || msg(this, 'combobox.placeholder'); }
  /** Stop the field opening and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Mark the field invalid: it gets the error styling and `aria-invalid`. The message itself is shown by
   * the wrapping `void-field`.
   */
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) name = '';
  /** Whether the option list is showing. Reflected, so it can be read (and set) from markup. */
  @property({ type: Boolean, reflect: true }) open = false;

  private _query = '';
  /** The option with visual focus (`aria-activedescendant`), or null. */
  private _active: VoidOption | null = null;
  /** Inside updated(): the wiring it runs must not schedule another update. */
  private _wiring = false;

  /** The rendered input comes first, so reading order puts the field before its (top-layer) list. */
  protected readonly _projection = new ProjectionController(this, { placement: 'start' });

  protected readonly _parts = new PartsController(this, {
    tags: ['void-combobox-content', 'void-option'],
    onChange: () => {
      this._wire();
      // An option added, removed or renamed changes what the field shows.
      if (!this._wiring) this.requestUpdate();
    },
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'listbox',
    surface: () => this._content(),
    isOpen: () => this.open && !this.disabled,
    setOpen: open => {
      this.open = open;
    },
    anchor: () => this._input(),
    attr: (el, name, value) => this._parts.set(el, name, value),
    style: (el, p, v) => this._parts.style(el, p, v),
    // Focus stays in the input (aria-activedescendant).
    initialFocus: () => false,
  });

  private _content(): HTMLElement | null {
    return this._parts.one('void-combobox-content');
  }

  private _input(): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>(':scope > input[role=combobox]');
  }

  /** The options of this combobox, in document order (inside its content part). */
  private get _options(): VoidOption[] {
    const content = this._content();
    return content ? this._parts.within<VoidOption>(content, 'void-option') : [];
  }

  /** Options the current query leaves in the list, in document order. */
  private get _visible(): VoidOption[] {
    if (!this._query) return this._options;
    const q = this._query.toLowerCase();
    return this._options.filter(opt => optionLabel(opt).toLowerCase().includes(q));
  }

  /** The markup wrote a `value` attribute (read before the reflected default can add one). */
  private _authoredValue: boolean | null = null;

  override connectedCallback(): void {
    this._authoredValue ??= this.hasAttribute('value');
    super.connectedCallback();
    // A press on an option chooses it; mousedown keeps focus in the input.
    this.addEventListener('mousedown', this._onPointerDown);
  }

  /** Whether the initial choice has been settled (a value, or an option marked `selected`). */
  private _initial = false;

  /** Without an initial value, an option marked `selected` is the initial choice (as in a native select). */
  private _adoptSelected(options: VoidOption[]): void {
    if (this._initial) return;
    if (this.value || this._authoredValue) {
      this._initial = true;
      return;
    }
    const marked = options.find(o => o.hasAttribute('selected'));
    if (marked) {
      this._initial = true;
      // From the attribute: in parsed markup the options upgrade after the combobox.
      this.value = marked.getAttribute('value') ?? '';
    }
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (changed.has('open') && !this.open) {
      this._query = '';
      this._active = null;
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
    // Keep the highlighted option in view while arrowing through a long list.
    if (this.open) this._active?.scrollIntoView?.({ block: 'nearest' });
  }

  /**
   * The content part is the listbox in the top layer; every option is a `role="option"` with an id, chosen
   * (`aria-selected`), highlighted (`active`) and filtered out (`hidden`) by the parent.
   */
  private _wire(): void {
    const content = this._content();
    const input = this._input();
    const options = this._options;
    const open = this.open && !this.disabled;
    const q = open ? this._query.toLowerCase() : '';
    this._adoptSelected(options);
    if (this._active && (!options.includes(this._active) || this._active.disabled)) this._active = null;
    let shown = 0;
    for (const opt of options) {
      this._parts.set(opt, 'role', 'option');
      this._parts.id(opt, 'void-option');
      this._parts.set(opt, 'aria-selected', opt.value === this.value ? 'true' : null);
      this._parts.set(opt, 'aria-disabled', opt.disabled ? 'true' : null);
      const match = !q || optionLabel(opt).toLowerCase().includes(q);
      this._parts.set(opt, 'hidden', !match);
      if (match) shown++;
      else if (opt === this._active) this._active = null;
      this._parts.set(opt, 'active', opt === this._active);
    }
    if (content) {
      this._parts.set(content, 'popover', 'manual');
      this._parts.set(content, 'role', 'listbox');
      this._parts.id(content, 'void-combobox-content');
      // Named like the field: by its label where a void-field labels the input, else by the placeholder.
      // Named only while open, so that the field's label finds one element (the control) while closed.
      const labelledby = open ? input?.getAttribute('aria-labelledby') ?? null : null;
      this._parts.set(content, 'aria-labelledby', labelledby);
      this._parts.set(content, 'aria-label', open && !labelledby ? input?.getAttribute('aria-label') || this._hint || null : null);
      // The "no options" text is drawn by the theme while nothing matches, from this property.
      this.setHostStyle('--_void-combobox-empty', JSON.stringify(msg(this, 'combobox.empty'))); // style-ok
      this._parts.set(content, 'empty', shown === 0);
      if (input) {
        this._parts.set(input, 'aria-activedescendant', open && this._active ? this._parts.id(this._active, 'void-option') : null);
      }
    }
  }

  /** The id of the content part while the list is open (one is generated where the author wrote none). */
  private _controls(open: boolean): string | typeof nothing {
    const content = open ? this._content() : null;
    return content ? this._parts.id(content, 'void-combobox-content') : nothing;
  }

  render() {
    const chosen = this._options.find(o => o.value === this.value);
    const open = this.open && !this.disabled;
    return html`
      <input
        class="void-combobox-input"
        role="combobox"
        .value=${live(open ? this._query : (chosen ? optionLabel(chosen) : this.value || ''))}
        placeholder=${this._hint}
        aria-label=${this._hint}
        ?disabled=${this.disabled}
        autocomplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded=${String(open)}
        aria-controls=${this._controls(open)}
        aria-required=${this.required ? 'true' : nothing}
        aria-invalid=${this.error ? 'true' : 'false'}
        @focus=${this._onInputFocus}
        @input=${this._onInput}
        @keydown=${this._onInputKeydown}
        @blur=${this._onInputBlur}
      />
      ${this.error ? html`<span class="void-combobox-error">${this.error}</span>` : nothing}
    `;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('mousedown', this._onPointerDown);
  }

  private _onPointerDown = (e: MouseEvent): void => {
    const content = this._content();
    if (!content || !content.contains(e.target as Node)) return;
    e.preventDefault();
    const opt = (e.target as Element).closest('void-option') as VoidOption | null;
    if (opt && !opt.disabled && this._options.includes(opt)) this._selectOption(opt);
  };

  /** Closes the list through the overlay stack (so `void-close` carries the reason). */
  private _close(reason: OverlayCloseReason = 'api'): void {
    if (this.open) this._overlay.requestClose(reason);
    this._query = '';
    this._active = null;
  }

  private _onInputFocus = (): void => {
    // Focus coming back after a morph moved the input (browsers without
    // Element.moveBefore) keeps what the user typed.
    if (this.disabled || isFocusParked(this)) return;
    this._overlay.requestOpen('focus');
    this._query = '';
    this._active = null;
  };

  private _onInput = (e: Event): void => {
    this._query = (e.target as HTMLInputElement).value;
    this.open = true;
    // Manual selection: filtering never highlights an option by itself.
    this._active = null;
    this.requestUpdate();
  };

  /** Moves the highlight: `step` from the current option, or to the first/last enabled option. */
  private _moveActive(to: 'next' | 'prev'): void {
    const visible = this._visible;
    const disabled = visible.map(o => o.disabled);
    const from = this._active ? visible.indexOf(this._active) : -1;
    if (from < 0 && !this._query) {
      // Nothing highlighted yet in the full list: start on the chosen option.
      const chosen = visible.find(o => o.value === this.value && !o.disabled);
      if (chosen) {
        this._active = chosen;
        return;
      }
    }
    let i: number;
    if (to === 'next') i = stepEnabled(disabled, from, 1);
    else i = from < 0 ? edgeEnabled(disabled, -1) : stepEnabled(disabled, from, -1);
    this._active = i >= 0 ? visible[i]! : null;
  }

  private _onInputKeydown = (e: KeyboardEvent): void => {
    if (this.disabled || e.isComposing) return;
    const key = e.key;
    const action = actionFor(this, e);
    if (action === 'next' || action === 'previous') {
      e.preventDefault();
      if (!this.open) {
        this._query = '';
        this._overlay.requestOpen('keyboard');
        // Opening highlights the chosen option, else the first (next) or last (previous) one.
        const visible = this._visible;
        const chosen = visible.find(o => o.value === this.value && !o.disabled);
        if (chosen) this._active = chosen;
        else this._moveActive(action === 'next' ? 'next' : 'prev');
      } else {
        this._moveActive(action === 'next' ? 'next' : 'prev');
      }
      this.requestUpdate();
    } else if (action === 'open') {
      // Opens the list without highlighting an option.
      e.preventDefault();
      if (!this.open) {
        this._query = '';
        this._overlay.requestOpen('keyboard');
      }
      this.requestUpdate();
    } else if (action === 'activate') {
      if (this.open && this._active && !this._active.disabled) {
        e.preventDefault();
        this._selectOption(this._active);
      } else if (this.open) {
        // Nothing highlighted: close the list; the key goes on to a surrounding form.
        this._close('escape');
      }
    } else if (action === 'close') {
      // Closes this list only (a second Escape reaches an enclosing dialog).
      if (this.open) {
        e.preventDefault();
        e.stopPropagation();
        this._close('escape');
      }
    } else if (!e.defaultPrevented && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End')) {
      // Text editing keys: the cursor moves in the field, the highlight leaves the list.
      if (this._active) {
        this._active = null;
        this.requestUpdate();
      }
    }
  };

  private _onInputBlur = (): void => {
    setTimeout(() => {
      // Focus may have returned to the input meanwhile (a click on the list keeps it there).
      if (this.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT') return;
      this._close('blur');
    }, 150);
  };

  private _selectOption(opt: VoidOption): void {
    this._initial = true;
    this.value = opt.value;
    this._close('select');
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
}

if (!customElements.get('void-combobox')) {
  customElements.define('void-combobox', VoidCombobox);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-combobox': VoidCombobox;
  }
}
