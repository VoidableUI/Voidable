import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';
import type { VoidCheckbox } from './checkbox.js';

/** Grouped multi-option selection for preference forms, filter panels, and permission editors. */
/**
 * Form strategy: pass-through. `name` is forwarded to the child void-checkbox
 * elements, whose native checkboxes submit one entry per checked box; the
 * group itself submits nothing and each checkbox resets itself. `required`
 * means "at least one checked", enforced with setCustomValidity on the first
 * enabled checkbox's native input. `disabled` and `form` are forwarded.
 */
export class VoidCheckboxGroup extends NativeFormControl(VoidElement) {
  @property({ type: String, reflect: true }) label = '';
  @property({ type: String, reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';
  /** Field name forwarded to every child checkbox. */
  @property({ type: String, reflect: true }) name = '';
  @property({ type: Boolean, reflect: true }) required = false;
  /** Disables every checkbox in the group (like a fieldset). */
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _userContent: Node[] = [];
  private _didSetup = false;

  get value(): string[] {
    return Array.from(this.querySelectorAll('void-checkbox')).filter((el) => (el as VoidCheckbox).checked).map((el) => (el as VoidCheckbox).value);
  }

  /** Check exactly the child checkboxes whose value is listed. Does not fire void-change. */
  set value(values: string[]) {
    const wanted = new Set(values ?? []);
    for (const el of Array.from(this.querySelectorAll('void-checkbox')) as VoidCheckbox[]) {
      el.checked = wanted.has(el.value);
    }
    this.formSync();
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
    this.setAttribute('role', 'group');
    if (this.label) this.setAttribute('aria-label', this.label);
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
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
        this.setAttribute('aria-label', this.label);
      } else {
        this.removeAttribute('aria-label');
      }
    }
    if (changed.has('name')) {
      this._syncNames();
    }
    if (changed.has('formAttr')) {
      for (const el of Array.from(this.querySelectorAll('void-checkbox'))) {
        if (this.formAttr === null) el.removeAttribute('form');
        else el.setAttribute('form', this.formAttr);
      }
    }
    if (changed.has('disabled') || changed.has('ancestorDisabled')) {
      this.setAttribute('aria-disabled', String(this.formDisabled));
    }
    if (changed.has('required')) {
      Promise.all((Array.from(this.querySelectorAll('void-checkbox')) as VoidCheckbox[]).map((b) => b.updateComplete))
        .then(() => this.formSyncNative());
    }
    if (!this._didSetup) {
      this._didSetup = true;
      const container = this.querySelector('.void-checkbox-group-items');
      if (container) {
        for (const node of this._userContent) {
          container.appendChild(node);
        }
      }
      this._syncNames();
    }
  }

  private _syncNames(): void {
    if (!this.name) return;
    for (const el of Array.from(this.querySelectorAll('void-checkbox')) as VoidCheckbox[]) {
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
      detail: { values: this.value },
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
