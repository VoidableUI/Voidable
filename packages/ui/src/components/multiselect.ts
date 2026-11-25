import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';
import { edgeEnabled, isPrintable, stepEnabled, Typeahead, uid } from '../keyboard.js';
import { OverlayController, type OverlayCloseReason, type OverlayOpenReason } from '../overlay.js';
import { ProjectionController } from '../projection.js';

/** Selectable option child element for VoidMultiselect and VoidCombobox. */
export class VoidOption extends VoidElement {
  /**
   * Value this option contributes when chosen: what the parent `void-combobox` or `void-multiselect`
   * reports and submits. The option's text content is what the user sees.
   */
  @property({ type: String, reflect: true }) value = '';
  /**
   * Mark the option as chosen when the parent first renders. In a `void-multiselect`, any number of
   * options may be selected; in a `void-combobox`, one.
   */
  @property({ type: Boolean, reflect: true }) selected = false;
  /** A disabled option is listed but cannot be highlighted or chosen. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    // Let the owning picker re-render (and re-submit) on programmatic changes.
    const selectedChanged = changed.has('selected') && changed.get('selected') !== undefined;
    const disabledChanged = changed.has('disabled') && changed.get('disabled') !== undefined;
    if (selectedChanged || disabledChanged) {
      this.closest('void-multiselect')?.requestUpdate();
      if (disabledChanged) this.closest('void-combobox')?.requestUpdate();
    }
  }
}

if (!customElements.get('void-option')) {
  customElements.define('void-option', VoidOption);
}

/**
 * Multi-value picker for tag selection, permission assignment, and filter fields that allow several simultaneous choices.
 *
 * Follows the WAI-ARIA select-only combobox pattern with a multiselectable listbox popup: the trigger is
 * the `role="combobox"` element and keeps DOM focus; the highlighted option is exposed with
 * `aria-activedescendant`. The popup stays open while options are toggled.
 *
 * Keyboard (focus on the trigger): Enter, Space, ArrowDown and ArrowUp open the list; Home and End open it
 * and highlight the first or last option. While open: ArrowDown and ArrowUp move the highlight (wrapping),
 * Home and End jump to the first or last option, Enter or Space toggle the highlighted option, typing
 * characters jumps to the next option starting with them, Escape closes the list (a second Escape reaches
 * the surrounding dialog), Tab closes it and moves on. Disabled options are skipped.
 *
 * The option list is shown in the top layer (never clipped by an `overflow` or `transform` ancestor) and placed
 * under the trigger with CSS anchor positioning, flipping above it near the bottom of the viewport. A press
 * outside closes it too.
 *
 * @fires {CustomEvent<{ reason: 'trigger' | 'keyboard' | 'api' }>} void-open - The option list opened.
 * @fires {CustomEvent<{ reason: 'trigger' | 'escape' | 'outside' | 'blur' | 'parent' | 'api' }>} void-close - The option list is closing.
 */
export class VoidMultiselect extends InternalsFormControl(VoidElement) {
  /**
   * Text shown in the trigger while nothing is selected. Defaults to `Select...`. It is also the
   * trigger's accessible name when no `void-field` label names it.
   */
  @property({ type: String }) placeholder = 'Select...';
  /** Stop the trigger opening and exclude the values from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Size step: `sm`, `md` (default), `lg`, `xl` or `xxl`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
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
  private readonly _listId = uid('void-multiselect-list');
  private readonly _typeahead = new Typeahead();
  // Options stay direct children after the rendered trigger; adding or removing one re-renders the list.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'options', target: 'after' }],
    onChange: () => this.requestUpdate(),
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'listbox',
    surface: () => this.querySelector<HTMLElement>(':scope > .void-multiselect-dropdown'),
    isOpen: () => this.open && !this.formDisabled,
    setOpen: open => {
      this.open = open;
    },
    anchor: () => this.querySelector(':scope > .void-multiselect-trigger'),
    // The trigger keeps focus (aria-activedescendant) and carries its own ARIA.
    initialFocus: () => false,
  });

  private get _options(): VoidOption[] {
    return Array.from(this.querySelectorAll<VoidOption>('void-option'));
  }

  get value(): string[] {
    return this._options.filter(o => o.selected).map(o => o.value);
  }

  /** Select exactly the options whose value is listed. Does not fire void-change. */
  set value(values: string[]) {
    const wanted = new Set(values ?? []);
    for (const opt of this._options) opt.selected = wanted.has(opt.value);
    this.requestUpdate();
  }

  /** One entry per selected option. */
  protected formSubmission(): FormSubmission {
    return this.value;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('focusout', this._onFocusOut);
  }

  /**
   * The open list is transient UI state, not something the server renders: a morph whose
   * markup does not carry `open` (it never does) must not close a list the user is using.
   */
  override voidBeforeMorph(incoming?: Element | null): boolean {
    if (incoming && this.open && !incoming.hasAttribute('open')) incoming.setAttribute('open', '');
    return super.voidBeforeMorph(incoming);
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (changed.has('open') && !this.open) {
      this._active = null;
      this._typeahead.reset();
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    this.querySelector('.void-multiselect-option[data-active]')?.scrollIntoView?.({ block: 'nearest' });
  }

  // Options are never focused: the trigger handles the keys and points at the highlighted option with
  // aria-activedescendant, so the options themselves have no key listener.
  /* eslint-disable lit-a11y/click-events-have-key-events */
  render() {
    const options = this._options;
    const selectedOpts = options.filter(o => o.selected);
    const open = this.open && !this.formDisabled;
    if (this._active && !options.includes(this._active)) this._active = null;
    const activeIndex = this._active ? options.indexOf(this._active) : -1;
    return html`
      <div
        class="void-multiselect-trigger"
        role="combobox"
        tabindex=${this.formDisabled ? '-1' : '0'}
        aria-label=${this.placeholder}
        aria-haspopup="listbox"
        aria-expanded=${String(open)}
        aria-controls=${open ? this._listId : nothing}
        aria-activedescendant=${open && activeIndex >= 0 ? `${this._listId}-${activeIndex}` : nothing}
        aria-disabled=${this.formDisabled ? 'true' : nothing}
        aria-invalid=${this.error ? 'true' : nothing}
        @click=${this._onTriggerClick}
        @keydown=${this._onTriggerKeydown}
      >
        ${selectedOpts.length > 0
          ? selectedOpts.map(opt => html`
              <span class="void-multiselect-pill">
                <span class="void-multiselect-pill-label">${opt.textContent?.trim() || opt.value}</span>
                <button
                  type="button"
                  class="void-multiselect-pill-remove"
                  tabindex="-1"
                  aria-label="Remove ${opt.textContent?.trim() || opt.value}"
                  @mousedown=${(e: Event) => e.preventDefault()}
                  @click=${(e: Event) => { e.stopPropagation(); this._deselect(opt); }}
                >×</button>
              </span>
            `)
          : html`<span class="void-multiselect-placeholder">${this.placeholder}</span>`
        }
      </div>
      ${open ? html`
        <div
          class="void-multiselect-dropdown"
          role="listbox"
          popover="manual"
          id=${this._listId}
          aria-label=${this.placeholder}
          aria-multiselectable="true"
          @mousedown=${(e: Event) => e.preventDefault()}
        >
          ${options.map((opt, i) => html`
            <div
              class="void-multiselect-option"
              role="option"
              id="${this._listId}-${i}"
              aria-selected=${opt.selected ? 'true' : 'false'}
              aria-disabled=${opt.disabled ? 'true' : nothing}
              ?data-active=${i === activeIndex}
              @click=${() => { if (!opt.disabled) this._toggleOption(opt); }}
            >
              <span class="void-multiselect-checkbox">
                ${opt.selected ? html`<svg viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/></svg>` : nothing}
              </span>
              <span class="void-multiselect-option-label">${opt.textContent?.trim() || opt.value}</span>
            </div>
          `)}
        </div>
      ` : nothing}
      ${this.error ? html`<span class="void-multiselect-error">${this.error}</span>` : nothing}
    `;
  }

  /* eslint-enable lit-a11y/click-events-have-key-events */

  private _onTriggerClick = (e: Event): void => {
    if (this.formDisabled) return;
    e.stopPropagation();
    if (this.open) this._close('trigger');
    else this._openList('none', 'trigger');
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

  private _onTriggerKeydown = (e: KeyboardEvent): void => {
    if (this.formDisabled || e.target !== e.currentTarget || e.isComposing) return;
    const options = this._options;
    const disabled = options.map(o => o.disabled);
    const current = this._active ? options.indexOf(this._active) : -1;
    const key = e.key;
    if (!this.open) {
      if (key === 'Home' || key === 'End') {
        e.preventDefault();
        this._openList(key === 'Home' ? 'first' : 'last');
      } else if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        this._openList('selected');
      } else if (isPrintable(e)) {
        e.preventDefault();
        this._openList('selected');
        this._typeaheadTo(e.key);
      }
      return;
    }
    switch (key) {
      case 'ArrowDown':
        e.preventDefault();
        this._moveActive(stepEnabled(disabled, current, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._moveActive(current < 0 ? edgeEnabled(disabled, -1) : stepEnabled(disabled, current, -1));
        break;
      case 'Home':
        e.preventDefault();
        this._moveActive(edgeEnabled(disabled, 1));
        break;
      case 'End':
        e.preventDefault();
        this._moveActive(edgeEnabled(disabled, -1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this._active && !this._active.disabled) this._toggleOption(this._active);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this._close('escape');
        break;
      case 'Tab':
        this._close('blur');
        break;
      default:
        if (isPrintable(e)) {
          e.preventDefault();
          this._typeaheadTo(e.key);
        }
    }
  };

  private _typeaheadTo(char: string): void {
    const options = this._options;
    const current = this._active ? options.indexOf(this._active) : -1;
    const i = this._typeahead.match(char, options.map(o => o.textContent ?? ''), options.map(o => o.disabled), current);
    this._moveActive(i);
  }

  /** Focus left the widget (Tab, or a click elsewhere): close the list. */
  private _onFocusOut = (e: FocusEvent): void => {
    if (this.open && !this.contains(e.relatedTarget as Node | null)) this._close('blur');
  };

  private _toggleOption(opt: VoidOption): void {
    opt.selected = !opt.selected;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { values: this.value },
    }));
  }

  private _deselect(opt: VoidOption): void {
    opt.selected = false;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { values: this.value },
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
