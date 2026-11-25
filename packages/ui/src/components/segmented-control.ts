import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';
import { edgeEnabled, stepEnabled } from '../keyboard.js';

type ItemGroup = Element & { value?: string; _syncItems?: () => void };

/** Individual option within a VoidSegmentedControl button group. */
export class VoidSegmentedControlItem extends VoidElement {
  /**
   * What the parent reports and submits when this segment is selected. Must be unique within the
   * control.
   */
  @property({ type: String, reflect: true }) value = '';
  /** Show the segment but skip it in keyboard navigation and refuse selection. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'radio');
    // Items can arrive after the control (a blocking script in the head, framework
    // rendering, a server morph): take the checked state and tab stop from the
    // control right away, so the first paint is already correct.
    const group = this._group();
    group?._syncItems?.();
    if (!this.hasAttribute('aria-checked')) this.setHostAttribute('aria-checked', String(!!group && group.value === this.value));
    if (!this.hasAttribute('tabindex')) this.setHostAttribute('tabindex', '-1');
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('disabled') || changed.has('value')) this._group()?._syncItems?.();
  }

  private _group(): ItemGroup | null {
    return this.closest('void-segmented-control');
  }

  /**
   * @internal Applied by the control: `aria-checked`, the roving tab stop (one
   * item per group has tabindex 0) and `aria-disabled`.
   */
  _apply(checked: boolean, tabStop: boolean, disabled: boolean): void {
    this.setHostAttribute('aria-checked', String(checked));
    this.setHostAttribute('tabindex', tabStop && !disabled ? '0' : '-1');
    this.setHostAttribute('aria-disabled', disabled ? 'true' : null);
  }
}

if (!customElements.get('void-segmented-control-item')) {
  customElements.define('void-segmented-control-item', VoidSegmentedControlItem);
}

/**
 * Mutually exclusive button group for view mode toggles, time range selectors, and compact tab-like navigation.
 *
 * Follows the WAI-ARIA radio group pattern: `role="radiogroup"` with `role="radio"` items, a single tab
 * stop (roving tabindex: the checked item, or the first enabled one when nothing is checked), and
 * selection that follows focus. Keyboard: Tab and Shift+Tab enter and leave the group; ArrowRight and
 * ArrowDown select the next item, ArrowLeft and ArrowUp the previous one (wrapping, skipping disabled
 * items; with nothing selected, the first or the last); Space selects the focused item.
 */
export class VoidSegmentedControl extends InternalsFormControl(VoidElement) {
  /**
   * `value` of the selected item. Selection follows focus, so each arrow key changes it and fires
   * `void-change`. As an attribute it is the initial value and the form's reset target.
   */
  @property({ type: String, reflect: true }) value = '';
  /** Stop the whole control reacting and exclude the value from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Size step: `sm`, `md` (default), `lg`, `xl` or `xxl`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';
  /**
   * Status colour of the selected segment: `default`, `error`, `warning`, `success`, `info`, `notice` or
   * `highlight`.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' | 'highlight' = 'default';

  private _observer: MutationObserver | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'radiogroup');
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
    // Items removed (or replaced) later change which item is the tab stop.
    this._observer ??= new MutationObserver(() => this._syncItems());
    this._observer.observe(this, { childList: true, subtree: true });
    this._syncItems();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
    this._observer?.disconnect();
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('value') || changed.has('disabled') || changed.has('ancestorDisabled') || !this._itemsSynced) {
      this._itemsSynced = true;
      this._syncItems();
    }
  }

  private _itemsSynced = false;

  /** A morph may have replaced or added items that do not show the control's value yet. */
  protected override morphedCallback(): void {
    this._syncItems();
  }

  /** The selected value, or nothing when no segment is selected. */
  protected formSubmission(): FormSubmission {
    return this.value || null;
  }

  private get _items(): VoidSegmentedControlItem[] {
    // An item not upgraded yet syncs itself when it connects.
    return (Array.from(this.querySelectorAll('void-segmented-control-item')) as VoidSegmentedControlItem[])
      .filter(item => item instanceof VoidSegmentedControlItem);
  }

  /** @internal Applies `aria-checked`, the roving tab stop and `aria-disabled` to every item. */
  _syncItems(): void {
    const items = this._items;
    const off = this.formDisabled;
    const checked = items.findIndex(item => item.value === this.value);
    let stop = checked >= 0 && !items[checked]!.disabled ? checked : -1;
    if (stop < 0) stop = edgeEnabled(items.map(i => i.disabled), 1);
    items.forEach((item, i) => item._apply(i === checked, i === stop, off || item.disabled));
  }

  private _select(item: VoidSegmentedControlItem): void {
    if (item.disabled || this.formDisabled || item.value === this.value) return;
    this.value = item.value;
    this._syncItems();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }

  private _handleClick = (e: Event): void => {
    const item = (e.target as Element).closest('void-segmented-control-item') as VoidSegmentedControlItem | null;
    if (item) this._select(item);
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.altKey || e.ctrlKey || e.metaKey || this.formDisabled) return;
    const items = this._items;
    const focused = (e.target as Element | null)?.closest?.('void-segmented-control-item') as VoidSegmentedControlItem | null;
    if (e.key === ' ') {
      if (!focused) return;
      e.preventDefault();
      this._select(focused);
      return;
    }
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    if (!forward && e.key !== 'ArrowLeft' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const disabled = items.map(i => i.disabled);
    // Move from the focused item; with none (the key went to the group itself), from the checked one.
    const from = focused ? items.indexOf(focused) : items.findIndex(i => i.value === this.value);
    let next: number;
    if (from < 0) next = edgeEnabled(disabled, forward ? 1 : -1);
    else next = stepEnabled(disabled, from, forward ? 1 : -1);
    const item = items[next];
    if (!item) return;
    item.focus();
    this._select(item);
  };
}

if (!customElements.get('void-segmented-control')) {
  customElements.define('void-segmented-control', VoidSegmentedControl);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-segmented-control': VoidSegmentedControl;
    'void-segmented-control-item': VoidSegmentedControlItem;
  }
}
