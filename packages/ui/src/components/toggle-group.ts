import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';
import type { VoidToggle } from './toggle.js';

/** Multi-button toggle set for text editor toolbars and filter chips where one or many options can be active. */
export class VoidToggleGroup extends InternalsFormControl(VoidElement) {
  /**
   * Comma-separated `value`s of the pressed toggles (`bold,italic`), or the single pressed value. As an
   * attribute it is the initial state and the form's reset target.
   */
  @property({ type: String, reflect: true }) value = '';
  /** Let several toggles be pressed at once. Without it pressing one releases the others. */
  @property({ type: Boolean, reflect: true }) multiple = false;
  /** Stop every toggle reacting and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Status colour of the pressed toggles: `default`, `error`, `warning`, `caution`, `success`, `info`, `notice` or `highlight`. */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Lay the toggles out in a `horizontal` row (default) or a `vertical` column. */
  @property({ type: String, reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'group');
    this.addEventListener('void-change', this._handleChildChange as EventListener);
    this.addEventListener('keydown', this._handleKeydown);
    this._syncToggles();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('void-change', this._handleChildChange as EventListener);
    this.removeEventListener('keydown', this._handleKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('value') || changed.has('disabled') || changed.has('size') || changed.has('color')) {
      this._syncToggles();
    }
  }

  /** Multiple: one entry per pressed toggle. Single: the pressed value, or nothing. */
  protected formSubmission(): FormSubmission {
    if (this.multiple) return this._selectedValues();
    return this.value || null;
  }

  private _toggles(): VoidToggle[] {
    return Array.from(this.querySelectorAll('void-toggle')) as VoidToggle[];
  }

  private _selectedValues(): string[] {
    if (!this.value) return [];
    return this.value.split(',').map(v => v.trim()).filter(Boolean);
  }

  /** A morph may have replaced or added toggles that do not show the group's value yet. */
  protected override morphedCallback(): void {
    this._syncToggles();
  }

  private _syncToggles(): void {
    const selected = this._selectedValues();
    for (const toggle of this._toggles()) this._applyTo(toggle, selected);
  }

  /** @internal Gives one toggle the group's state; toggles call it when they connect after the group (a blocking script in the head, framework rendering). */
  _syncToggle(toggle: VoidToggle): void {
    if (toggle.closest('void-toggle-group') === this) this._applyTo(toggle, this._selectedValues());
  }

  private _applyTo(toggle: VoidToggle, selected: string[]): void {
    const val = toggle.getAttribute('value') || '';
    toggle.pressed = selected.includes(val);
    if (this.disabled) {
      toggle.disabled = true;
    }
    toggle.size = this.size;
    if (this.color !== 'default') {
      toggle.color = this.color;
    }
  }

  private _handleChildChange = (e: CustomEvent): void => {
    const target = e.target as Element;
    const toggle = target.closest('void-toggle') as VoidToggle | null;
    if (!toggle || toggle.closest('void-toggle-group') !== this) return;

    e.stopImmediatePropagation();

    if (this.formDisabled) {
      // e.g. inside <fieldset disabled>: undo the toggle's own flip.
      this._syncToggles();
      return;
    }

    const toggleValue = toggle.getAttribute('value') || '';
    if (!toggleValue) return;

    if (this.multiple) {
      const selected = this._selectedValues();
      const idx = selected.indexOf(toggleValue);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else {
        selected.push(toggleValue);
      }
      this.value = selected.join(',');

      // sync pressed state back since the toggle already toggled itself
      this._syncToggles();

      this.dispatchEvent(new CustomEvent('void-change', {
        bubbles: true,
        composed: true,
        detail: { value: selected },
      }));
    } else {
      // single mode — clicking the already-selected toggle deselects it
      const newValue = this.value === toggleValue ? '' : toggleValue;
      this.value = newValue;

      // sync pressed state back
      this._syncToggles();

      this.dispatchEvent(new CustomEvent('void-change', {
        bubbles: true,
        composed: true,
        detail: { value: newValue },
      }));
    }
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    const toggles = this._toggles().filter(t => !t.disabled);
    if (!toggles.length) return;

    const horizontal = this.orientation === 'horizontal';
    const forward = horizontal ? 'ArrowRight' : 'ArrowDown';
    const backward = horizontal ? 'ArrowLeft' : 'ArrowUp';

    if (e.key !== forward && e.key !== backward) return;

    e.preventDefault();
    const currentIndex = toggles.indexOf(e.target as VoidToggle);
    let nextIndex: number;
    if (e.key === forward) {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % toggles.length;
    } else {
      nextIndex = currentIndex < 0 ? toggles.length - 1 : (currentIndex - 1 + toggles.length) % toggles.length;
    }
    toggles[nextIndex].focus();
  };
}

if (!customElements.get('void-toggle-group')) {
  customElements.define('void-toggle-group', VoidToggleGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-toggle-group': VoidToggleGroup;
  }
}
