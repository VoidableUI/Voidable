import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';
import { ProjectionController } from '../projection.js';
import { valueList } from '../value-list.js';
import type { VoidCheckbox } from './checkbox.js';

/** A checkbox's value, from its attribute until it has upgraded. */
const boxValue = (el: VoidCheckbox): string => el.value ?? el.getAttribute('value') ?? 'on';

/**
 * Grouped multi-option selection for preference forms, filter panels, and permission editors.
 *
 * Form strategy: pass-through. `name` is forwarded to the child void-checkbox
 * elements, whose native checkboxes submit one entry per checked box; the
 * group itself submits nothing and each checkbox resets itself. `required`
 * means "at least one checked", enforced with setCustomValidity on the first
 * enabled checkbox's native input. `disabled` and `form` are forwarded.
 */
export class VoidCheckboxGroup extends NativeFormControl(VoidElement) {
  /** Name of the group, shown above the boxes and used as its accessible name. */
  @property({ type: String, reflect: true }) label = '';
  /** Lay the checkboxes out in a `vertical` column (default) or a `horizontal` row. */
  @property({ type: String, reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';
  /** Field name forwarded to every child checkbox. */
  @property({ type: String, reflect: true }) name = '';
  /**
   * The control must have a value before its form can be submitted. An empty control is invalid
   * (`valueMissing`) and the browser reports it, as for a native field.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  /** Disables every checkbox in the group (like a fieldset). */
  @property({ type: Boolean, reflect: true }) disabled = false;

  // Consumer checkboxes are projected into the items container; late checkboxes
  // get the group's name and form, and the "at least one" validity is recomputed.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'items', target: () => this.querySelector(':scope > .void-checkbox-group-items') }],
    onChange: () => {
      // Values the attribute asked for before the checkboxes were there.
      if (this._wanted && this._boxes().length > 0) this.value = this._wanted;
      this._syncNames();
      this._syncFormAttr();
      this._syncRequiredValidity();
    },
  });
  /** Values asked for while no checkbox exists yet (an attribute parsed ahead of its children), applied when they arrive. */
  private _wanted: string[] | null = null;
  /** The serialised value last handed to Lit, to notice a choice made on the checkboxes (the user, a morph). */
  private _reflected: string | null = null;

  /**
   * The values of the checked checkboxes, as a list. The `value` attribute is the same list as a JSON array
   * (`value='["a","b"]'`), kept in step as the boxes change; setting it checks those boxes.
   * @default []
   */
  @property({ converter: valueList, reflect: true })
  get value(): string[] {
    const boxes = this._boxes();
    if (this._wanted && boxes.length === 0) return [...this._wanted];
    return boxes.filter((el) => el.checked).map(boxValue);
  }

  /** Check exactly the child checkboxes whose value is listed. Does not fire void-change. */
  set value(values: string[]) {
    const boxes = this._boxes();
    const list = Array.isArray(values) ? values : [];
    this._wanted = boxes.length === 0 ? [...list] : null;
    const wanted = new Set(list);
    for (const el of boxes) {
      el.checked = wanted.has(boxValue(el));
    }
    this.requestUpdate('value', undefined);
    this.formSync();
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    // The choice lives on the checkboxes: reflect it when it is no longer what the attribute shows.
    const now = JSON.stringify(this.value);
    if (now !== this._reflected) {
      this._reflected = now;
      if (!changed.has('value')) this.requestUpdate('value', undefined);
    }
  }

  /** The checkboxes reset themselves; the group has no state of its own. */
  protected formSnapshot(): unknown {
    return null;
  }

  /** "At least one" validity, carried by the first enabled native checkbox. */
  protected formSyncNative(): void {
    const boxes = Array.from(this.querySelectorAll('void-checkbox')) as VoidCheckbox[];
    const anchor = this.required && this.value.length === 0 ? boxes.find((b) => !b.formDisabled) : undefined;
    for (const box of boxes) {
      const input = box.querySelector<HTMLInputElement>('input[type="checkbox"]');
      input?.setCustomValidity(box === anchor ? 'Please check at least one box.' : '');
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'group');
    if (this.label) this.setHostAttribute('aria-label', this.label);
    this.addEventListener('void-change', this._handleChildChange);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('void-change', this._handleChildChange);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('label')) {
      if (this.label) {
        this.setHostAttribute('aria-label', this.label);
      } else if (changed.get('label')) {
        // Only a label that was set is taken back: an author's own `aria-label` stands.
        this.setHostAttribute('aria-label', null);
      }
    }
    if (changed.has('name')) {
      this._syncNames();
    }
    if (changed.has('formAttr')) {
      this._syncFormAttr();
    }
    if (changed.has('disabled') || changed.has('ancestorDisabled')) {
      this.setHostAttribute('aria-disabled', this.formDisabled ? 'true' : null);
    }
    if (changed.has('required')) {
      this._syncRequiredValidity();
    }
  }

  /** A morph may have replaced or added checkboxes that do not carry the group's name, form or validity yet. */
  protected override morphedCallback(): void {
    this._syncNames();
    this._syncFormAttr();
    this._syncRequiredValidity();
  }

  private _boxes(): VoidCheckbox[] {
    return Array.from(this.querySelectorAll('void-checkbox')) as VoidCheckbox[];
  }

  /** Recompute "at least one" validity once the checkboxes have rendered their native inputs. */
  private _syncRequiredValidity(): void {
    Promise.all(this._boxes().map((b) => b.updateComplete)).then(() => this.formSyncNative());
  }

  private _syncFormAttr(): void {
    for (const el of this._boxes()) {
      if (this.formAttr === null) el.removeAttribute('form');
      else el.setAttribute('form', this.formAttr);
    }
  }

  private _syncNames(): void {
    if (!this.name) return;
    for (const el of this._boxes()) {
      el.name = this.name;
    }
  }

  render() {
    return html`
      ${this.label ? html`<span class="void-checkbox-group-label">${this.label}</span>` : nothing}
      <div class="void-checkbox-group-items"></div>
    `;
  }

  private _handleChildChange = (e: Event): void => {
    const target = e.target as Element;
    if (!target.closest('void-checkbox') || target.closest('void-checkbox')?.closest('void-checkbox-group') !== this) return;
    e.stopImmediatePropagation();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  };
}

if (!customElements.get('void-checkbox-group')) {
  customElements.define('void-checkbox-group', VoidCheckboxGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-checkbox-group': VoidCheckboxGroup;
  }
}
