import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { InternalsFormControl } from '../form-control.js';
import { OverlayController, type OverlayCloseReason } from '../overlay.js';
import { ProjectionController, isFocusParked } from '../projection.js';
import { edgeEnabled, stepEnabled, uid } from '../keyboard.js';
import { VoidOption } from './multiselect.js';

/**
 * Filterable dropdown for long option lists like country selectors, user assignment fields, and tag pickers.
 *
 * Follows the WAI-ARIA "combobox with listbox popup" pattern (editable, list autocomplete, manual
 * selection): the native input carries `role="combobox"` and keeps DOM focus; the highlighted option is
 * exposed with `aria-activedescendant`.
 *
 * Keyboard (focus in the input): ArrowDown opens the list (or highlights the next option), ArrowUp opens
 * it (or highlights the previous option), Alt+ArrowDown opens without highlighting, Enter chooses the
 * highlighted option (without one, Enter is left alone so a surrounding form submits), Escape closes the
 * list (a second Escape reaches the surrounding dialog), Home and End move the text cursor, Tab closes the
 * list. Typing filters the options. Disabled options are skipped.
 *
 * The option list is shown in the top layer (never clipped by an `overflow` or `transform` ancestor) and placed
 * under the input with CSS anchor positioning, flipping above it near the bottom of the viewport. A press
 * outside closes it too; focus stays in the input.
 *
 * @fires {CustomEvent<{ reason: 'keyboard' | 'focus' | 'api' }>} void-open - The option list opened.
 * @fires {CustomEvent<{ reason: 'escape' | 'outside' | 'blur' | 'select' | 'parent' | 'api' }>} void-close - The option list is closing.
 */
export class VoidCombobox extends InternalsFormControl(VoidElement) {
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = 'Search...';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  @property({ type: String, reflect: true }) error = '';
  @property({ type: String, reflect: true }) name = '';
  /** Whether the option list is showing. Reflected, so it can be read (and set) from markup. */
  @property({ type: Boolean, reflect: true }) open = false;

  private _query = '';
  /** The option with visual focus (`aria-activedescendant`), or null. */
  private _active: VoidOption | null = null;
  private readonly _listId = uid('void-combobox-list');
  // Options stay direct children after the rendered input; adding or removing one re-renders the list.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'options', target: 'after' }],
    onChange: () => this.requestUpdate(),
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'listbox',
    surface: () => this.querySelector<HTMLElement>(':scope > .void-combobox-dropdown'),
    isOpen: () => this.open && !this.disabled,
    setOpen: open => {
      this.open = open;
    },
    anchor: () => this.querySelector(':scope > .void-combobox-input'),
    // Focus stays in the input (aria-activedescendant).
    initialFocus: () => false,
  });

  private get _options(): VoidOption[] {
    return Array.from(this.querySelectorAll<VoidOption>('void-option'));
  }

  /** Options the current query leaves in the list, in document order. */
  private get _visible(): VoidOption[] {
    const q = this._query.toLowerCase();
    return this._options.filter(opt => (opt.textContent?.trim().toLowerCase() ?? '').includes(q));
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
    // Keep the highlighted option in view while arrowing through a long list.
    this.querySelector('.void-combobox-option[data-active]')?.scrollIntoView?.({ block: 'nearest' });
  }

  render() {
    const visible = this._visible;
    const selectedOpt = this._options.find(o => o.value === this.value);
    if (this._active && !visible.includes(this._active)) this._active = null;
    const activeIndex = this._active ? visible.indexOf(this._active) : -1;
    const open = this.open && !this.disabled;

    return html`
      <input
        class="void-combobox-input"
        role="combobox"
        .value=${live(open ? this._query : (selectedOpt?.textContent?.trim() || this.value || ''))}
        placeholder=${this.placeholder}
        aria-label=${this.placeholder}
        ?disabled=${this.disabled}
        autocomplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded=${String(open)}
        aria-controls=${open ? this._listId : nothing}
        aria-activedescendant=${open && activeIndex >= 0 ? `${this._listId}-${activeIndex}` : nothing}
        aria-invalid=${this.error ? 'true' : 'false'}
        @focus=${this._onInputFocus}
        @input=${this._onInput}
        @keydown=${this._onInputKeydown}
        @blur=${this._onInputBlur}
      />
      ${open ? html`
        <div class="void-combobox-dropdown" role="listbox" popover="manual" id=${this._listId} aria-label=${this.placeholder}>
          ${visible.length > 0
            ? visible.map((opt, i) => html`
                <div
                  class="void-combobox-option"
                  role="option"
                  id="${this._listId}-${i}"
                  aria-selected=${i === activeIndex ? 'true' : 'false'}
                  aria-disabled=${opt.disabled ? 'true' : nothing}
                  ?data-active=${i === activeIndex}
                  ?data-selected=${opt.value === this.value}
                  @mousedown=${(e: Event) => { e.preventDefault(); if (!opt.disabled) this._selectOption(opt); }}
                >${opt.textContent?.trim() || opt.value}</div>
              `)
            : html`<div class="void-combobox-empty">No options found</div>`
          }
        </div>
      ` : nothing}
      ${this.error ? html`<span class="void-combobox-error">${this.error}</span>` : nothing}
    `;
  }

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
    let i: number;
    if (to === 'next') i = stepEnabled(disabled, from, 1);
    else i = from < 0 ? edgeEnabled(disabled, -1) : stepEnabled(disabled, from, -1);
    this._active = i >= 0 ? visible[i]! : null;
  }

  private _onInputKeydown = (e: KeyboardEvent): void => {
    if (this.disabled || e.isComposing) return;
    const key = e.key;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      e.preventDefault();
      if (!this.open) {
        this._query = '';
        this._overlay.requestOpen('keyboard');
        if (!e.altKey) {
          // Opening highlights the chosen option, else the first (Down) or last (Up) one.
          const visible = this._visible;
          const chosen = visible.find(o => o.value === this.value && !o.disabled);
          if (chosen) this._active = chosen;
          else this._moveActive(key === 'ArrowDown' ? 'next' : 'prev');
        }
      } else if (!e.altKey) {
        this._moveActive(key === 'ArrowDown' ? 'next' : 'prev');
      }
      this.requestUpdate();
    } else if (key === 'Enter') {
      if (this.open && this._active && !this._active.disabled) {
        e.preventDefault();
        this._selectOption(this._active);
      }
    } else if (key === 'Escape') {
      if (this.open) {
        e.preventDefault();
        e.stopPropagation();
        this._close('escape');
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
