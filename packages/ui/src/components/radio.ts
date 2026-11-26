import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { NativeFormControl } from '../form-control.js';
import { ProjectionController } from '../projection.js';
import { actionFor, stepEnabled } from '../keyboard.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { radioKeys } from '../keymaps/choice.js';

// Shift+Tab into a group with nothing checked lands on its last radio, as with native radios.
let tabbingBack = false;
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => { tabbingBack = e.key === 'Tab' && e.shiftKey; }, true);
  document.addEventListener('pointerdown', () => { tabbingBack = false; }, true);
}

/** Single mutually exclusive option for forms and surveys; typically used inside VoidRadioGroup. */
export class VoidRadio extends NativeFormControl(VoidElement) {
  /** Key bindings for this element's actions, as JSON (`{"next":["ArrowRight"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = radioKeys;

  /** Space fires a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, { disabled: () => this.formDisabled });

  /** Whether this radio is the selected one. Checking one radio unchecks the others with the same `name`. */
  @property({ type: Boolean, reflect: true }) checked = false;
  /**
   * Stop the radio reacting and exclude it from the form submission. Also disabled by a `<fieldset
   * disabled>` or a disabled `void-radio-group` around it.
   */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Group name: radios sharing a name in the same form are mutually exclusive, and it is the key the
   * chosen value is submitted under. Within a `void-radio-group` the group's `name` is used.
   */
  @property({ type: String, reflect: true }) name = '';
  /** Submitted under `name` while checked; defaults to "on" like a native radio. */
  @property({ type: String, reflect: true }) value = 'on';
  /**
   * One radio with this name must be checked. Forwarded to the native radio,
   * which the browser validates as a group; focus moves to the host.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  /**
   * Status colour of the selected radio: `default`, `error`, `warning`, `caution`, `success`, `info`,
   * `notice` or `highlight`.
   */
  @property({ type: String, reflect: true }) color: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' = 'default';
  /** Size step: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  // Consumer label content stays on the host, after the rendered control.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'label', target: 'after' }],
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'radio');
    // A group's value reaches `checked` a moment later: the first paint already shows the right state and tab stop.
    this.setHostAttribute('aria-checked', String(this._isOn()));
    this._anchor = this.closest('void-radio-group') ?? this.form ?? (this.getRootNode() as ParentNode);
    this.setHostAttribute('tabindex', '-1');
    this._syncTabStops();
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeydown);
    this.addEventListener('focus', this._handleFocus);
    this.addEventListener('blur', this._handleBlur);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeydown);
    this.removeEventListener('focus', this._handleFocus);
    this.removeEventListener('blur', this._handleBlur);
    this._hasFocus = false;
    // The radios left behind may have lost their tab stop.
    const anchor = this._anchor;
    this._anchor = null;
    if (anchor) {
      queueMicrotask(() => {
        const rest = Array.from(anchor.querySelectorAll('void-radio')) as VoidRadio[];
        rest.find(r => r.isConnected && r.name === this.name && r._anchor === anchor)?._syncTabStops();
      });
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('checked')) {
      this.setHostAttribute('aria-checked', String(this.checked));
    }
    if (changed.has('disabled') || changed.has('ancestorDisabled')) {
      this.setHostAttribute('aria-disabled', this.formDisabled ? 'true' : null);
    }
    if (changed.has('checked') || changed.has('disabled') || changed.has('ancestorDisabled') || changed.has('name')) {
      this._syncTabStops();
    }
  }

  /** A morph may have changed which radio is checked or enabled. */
  protected override morphedCallback(): void {
    this._syncTabStops();
  }

  private _anchor: ParentNode | null = null;
  private _hasFocus = false;

  /** Checked, or chosen by the group's value which has not reached `checked` yet. */
  private _isOn(): boolean {
    if (this.checked) return true;
    const group = this.closest('void-radio-group') as { value?: string } | null;
    return Boolean(group?.value) && group!.value === this.value;
  }

  /**
   * The radios that behave as one group with this one: those of the same `void-radio-group`, or,
   * outside one, those with the same `name` in the same form (or document), as native radios do.
   */
  private _peers(): VoidRadio[] {
    const group = this.closest('void-radio-group');
    // A radio not upgraded yet syncs the set itself when it connects.
    if (group) return (Array.from(group.querySelectorAll('void-radio')) as VoidRadio[]).filter(r => r instanceof VoidRadio && r.closest('void-radio-group') === group);
    if (!this.name) return [this];
    const scope: ParentNode = this.form ?? (this.getRootNode() as ParentNode);
    return (Array.from(scope.querySelectorAll('void-radio')) as VoidRadio[])
      .filter(r => r instanceof VoidRadio && r.name === this.name && r.form === this.form && !r.closest('void-radio-group'));
  }

  /**
   * Roving tabindex: one radio of the group is tabbable: the checked one, else (nothing checked) the
   * focused one, else the first enabled one. Disabled radios are never tabbable.
   * @internal
   */
  _syncTabStops(): void {
    const peers = this._peers();
    const enabled = peers.filter(r => !r.formDisabled);
    const on = enabled.find(r => r._isOn());
    const stop = on ?? enabled.find(r => r._hasFocus) ?? enabled[0];
    for (const r of peers) r.setHostAttribute('tabindex', r === stop ? '0' : '-1');
  }

  /**
   * Arrow keys move to the next or previous enabled radio of the group, wrapping, and check it with a
   * real `click`, as native radios do (so a click listener, `void-change` and the form value all follow
   * as for a pointer click). The inline arrows follow the reading direction.
   */
  private _handleKeydown = (e: KeyboardEvent): void => {
    const action = actionFor(this, e);
    if ((action !== 'next' && action !== 'previous') || e.target !== this) return;
    const forward = action === 'next';
    e.preventDefault();
    const peers = this._peers();
    const next = peers[stepEnabled(peers.map(r => r.formDisabled), peers.indexOf(this), forward ? 1 : -1)];
    if (!next) return;
    next.focus();
    next.click();
  };

  private _handleFocus = (e: FocusEvent): void => {
    const peers = this._peers();
    const from = e.relatedTarget as Node | null;
    // Shift+Tab into a group with nothing checked goes to its last enabled radio, as native radios do.
    if (tabbingBack && from && !peers.some(r => r.contains(from)) && !peers.some(r => !r.formDisabled && r._isOn())
      && this.compareDocumentPosition(from) & Node.DOCUMENT_POSITION_FOLLOWING) {
      const last = peers.filter(r => !r.formDisabled).pop();
      if (last && last !== this) { last.focus(); return; }
    }
    this._hasFocus = true;
    this._syncTabStops();
  };

  private _handleBlur = (e: FocusEvent): void => {
    this._hasFocus = false;
    const to = e.relatedTarget as Node | null;
    if (!to || !this._peers().some(r => r.contains(to))) this._syncTabStops();
  };

  render() {
    return html`
      <input type="radio" .checked=${this.checked} ?disabled=${this.formDisabled} ?required=${this.required} name=${this.name} value=${this.value} form=${this.formAttr ?? nothing} tabindex="-1" aria-hidden="true" inert @invalid=${this._onNativeInvalid} @focus=${this._onNativeFocus} />
      <span class="void-radio-circle">
        ${this.checked ? html`<span class="void-radio-dot"></span>` : ''}
      </span>
    `;
  }

  /** Form reset target is the checked state; the native radio submits. */
  protected formSnapshot(): unknown {
    return this.checked;
  }

  /** A disabled void-radio-group disables its radios like a fieldset. */
  protected formAncestorDisabled(): boolean {
    return super.formAncestorDisabled() || Boolean(this.closest('void-radio-group')?.hasAttribute('disabled'));
  }

  protected formWriteNativeDefault(state: unknown): void {
    // Inside a void-radio-group the group owns the default.
    if (this.closest('void-radio-group')) return;
    const input = this.querySelector<HTMLInputElement>('input[type="radio"]');
    if (input) input.defaultChecked = Boolean(state);
  }

  protected formReadNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="radio"]');
    if (input) this.checked = input.checked;
  }

  /** The browser focuses the native input to report validity; hand focus to the host. */
  private _onNativeFocus = (): void => {
    this.focus();
  };

  /**
   * The native input is `inert`, so assistive technology and axe see one widget (the host)
   * rather than a focusable input nested in it. An inert input cannot be focused, which
   * would silently block submission of a required control, so it is made focusable for the
   * moment the browser reports validity.
   */
  private _onNativeInvalid = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    input.inert = false;
    setTimeout(() => { input.inert = true; });
  };

  protected formSyncNative(): void {
    const input = this.querySelector<HTMLInputElement>('input[type="radio"]');
    if (input && input.checked !== this.checked) input.checked = this.checked;
    // Like native radios: checking one unchecks the other same-name radios of its form.
    if (this.checked && this.name && !this.closest('void-radio-group')) {
      const scope: ParentNode = this.form ?? (this.getRootNode() as ParentNode);
      for (const peer of Array.from(scope.querySelectorAll('void-radio')) as VoidRadio[]) {
        if (peer !== this && peer.name === this.name && peer.checked && !peer.closest('void-radio-group')) peer.checked = false;
      }
    }
  }

  /** void-radio elements sharing this radio's name in the same form (or document). */
  private _handleClick = (e: Event): void => {
    const disabled = this.formDisabled;
    if (disabled || this.checked) {
      if (disabled) e.stopImmediatePropagation();
      return;
    }
    this.checked = true;
    const input = this.querySelector('input[type="radio"]') as HTMLInputElement | null;
    if (input) input.checked = true;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value, checked: true } }));
  };
}

if (!customElements.get('void-radio')) {
  customElements.define('void-radio', VoidRadio);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-radio': VoidRadio;
  }
}
