import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { NativeFormControl } from '../form-control.js';
import { useProjection } from '../projection.js';

useProjection();

/** Whether the browser sizes a textarea to its content in CSS (`field-sizing: content`). Only asked when `autosize` is on. */
const fieldSizing = (): boolean => typeof CSS !== 'undefined' && !!CSS.supports?.('field-sizing', 'content');

/**
 * Multi-line text entry for comment fields, description inputs, and freeform text that needs more than one line.
 * The host has no role: the native textarea is the (multi-line) textbox and carries the accessible name,
 * which `<void-field>` supplies.
 *
 * With `autosize` the box is as tall as its text, between `rows` and `max-rows` lines, then it scrolls
 * (`<void-textarea autosize rows="2" max-rows="8">`). The theme does it in CSS (`field-sizing: content`)
 * where the browser supports it; elsewhere the component measures the text itself, when the text changes,
 * when the width changes and when a hidden box (a closed dialog) is first shown, and creates its one
 * `ResizeObserver` only then. Without `autosize` nothing is observed or measured. An autosizing box has no
 * corner handle: `resize` is ignored (the development warnings say so). A server-rendered value does not
 * move the page once the component is defined; before that the host has no text box yet, so the theme
 * draws the `value` attribute as text to reserve its height, an estimate that is exact for the default
 * size and can be a line off for another size or a font that loads late.
 */
export class VoidTextarea extends NativeFormControl(VoidElement) {
  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = 'textarea';

  /** While focus is inside, a morph does not apply the server's value over what the user is typing. */
  static override editState = ['value'];
  /**
   * The text in the box. Reflected to the `value` attribute as it changes, and setting the attribute
   * sets it; the form's reset target stays the value the box started with.
   */
  @property({ type: String, reflect: true }) value = '';
  /**
   * Hint text shown while the box is empty. It is not a label: wrap the textarea in `void-field
   * label="..."`.
   */
  @property({ type: String, reflect: true }) placeholder = '';
  /**
   * Stop the box accepting input and exclude it from the form submission. Also disabled by an enclosing
   * `<fieldset disabled>`.
   */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Show the value but do not let the user edit it. Unlike `disabled`, a readonly box is focusable,
   * selectable and still submitted.
   */
  @property({ type: Boolean, reflect: true }) readonly = false;
  /**
   * The control must have a value before its form can be submitted. An empty control is invalid
   * (`valueMissing`) and the browser reports it, as for a native field.
   */
  @property({ type: Boolean, reflect: true }) required = false;
  /** Key the value is submitted under in the form's `FormData`. Without a name the box submits nothing. */
  @property({ type: String, reflect: true }) name = '';
  /** Visible height in lines of text. Defaults to 3. With `autosize` it is the least height the box shrinks to. */
  @property({ type: Number, reflect: true }) rows = 3;
  /**
   * Grow with the content: the box is as tall as its text, between `rows` and `max-rows` lines, then scrolls.
   * Off by default. The corner handle is gone while it is on (`resize` is ignored).
   */
  @property({ type: Boolean, reflect: true }) autosize = false;
  /** With `autosize`, the most lines the box grows to before it scrolls. Unset: it never stops growing. Ignored without `autosize`. */
  @property({ type: Number, reflect: true, attribute: 'max-rows' }) maxRows: number | undefined = undefined;
  /** Which way the user may drag the corner handle: `vertical` (default), `both` or `none`. Ignored with `autosize`. */
  @property({ type: String, reflect: true }) resize: 'none' | 'vertical' | 'both' = 'vertical';
  /** Size step: `sm`, `md` (default) or `lg`; sets the text size and padding. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Mark the box invalid: it gets the error styling and `aria-invalid`. The message itself is shown by
   * the wrapping `void-field`, whose own `error` attribute sets this one.
   */
  @property({ type: String, reflect: true }) error = '';

  /** Autofill hint forwarded to the native control (`autocomplete`), e.g. `current-password`, `one-time-code`, `email`. */
  @property({ type: String, reflect: true }) autocomplete = '';
  /** Minimum number of characters, enforced by the native control (`minlength`) and reported through validity. */
  @property({ type: Number }) minlength: number | undefined = undefined;
  /** Maximum number of characters accepted by the native control (`maxlength`). */
  @property({ type: Number }) maxlength: number | undefined = undefined;
  /** Virtual keyboard hint forwarded to the native control (`inputmode`). */
  @property({ type: String, attribute: 'inputmode' }) override inputMode: '' | 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url' = '';
  /** Label of the mobile keyboard's enter key (`enterkeyhint`). */
  @property({ type: String, attribute: 'enterkeyhint' }) override enterKeyHint: '' | 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' = '';
  /** Capitalisation behaviour of virtual keyboards (`autocapitalize`). */
  @property({ type: String }) override autocapitalize: '' | 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters' = '';
  /**
   * The host's `spellcheck` attribute as written (`"true"`, `"false"`, `""`, or absent for the browser default),
   * forwarded to the native control: the native enumerated attribute, not a boolean.
   */
  @property({ type: String, attribute: 'spellcheck' }) protected spellcheckAttr: string | null = null;

  /** Watches the zero-height sizer, whose width is the box's width and which no height change of ours can move. */
  #observer: ResizeObserver | null = null;
  #observed: Element | null = null;
  /** Width of the box at the last measurement; 0 while it was hidden. */
  #width = 0;
  /** Whether the host carries the custom properties the theme sizes the box from. */
  #styled = false;
  #fitted = false;

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    if (this.autosize || this.#styled) {
      // The theme turns these into the minimum and maximum block size, in `lh` units.
      const max = this.maxRows !== undefined && this.maxRows >= 1 ? Math.max(this.maxRows, this.rows) : null;
      this.setHostStyle('--_void-textarea-rows', this.autosize ? String(this.rows) : null);
      this.setHostStyle('--_void-textarea-max-rows', this.autosize && max ? String(max) : null);
      this.#styled = this.autosize;
    }
  }

  protected override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    if (!this.autosize && !this.#fitted && !this.#observer) return;
    if (changed.has('autosize') || changed.has('resize')) this.#checkResize();
    if (['autosize', 'value', 'rows', 'maxRows', 'size'].some((k) => changed.has(k))) this.#sync(true);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && this.autosize) this.#sync(true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#observer = this.#observed = null;
  }

  /** `resize` has no effect with `autosize`. The default, `vertical`, is reflected whether or not it was written, so only `both` can be told apart as a choice. */
  #checkResize(): void {
    if (this.autosize && this.resize === 'both') {
      this.reportDev('attribute-conflict', 'resize', `resize="${this.resize}" is ignored while autosize is on: an autosizing box has no corner handle. Remove resize, or remove autosize.`);
    }
  }

  /**
   * Where the browser cannot size a textarea to its content (`field-sizing: content`), set the height from
   * the content here: once when something changes, and again when the width changes or the box first shows.
   */
  #sync(force: boolean): void {
    if (!this.autosize || fieldSizing()) {
      this.#observer?.disconnect();
      this.#observer = this.#observed = null;
      if (this.#fitted) this.setHostStyle('--_void-textarea-fit', null);
      this.#fitted = false;
      return;
    }
    const sizer = this.querySelector('.void-textarea-sizer');
    if (sizer && sizer !== this.#observed && typeof ResizeObserver !== 'undefined') {
      this.#observer ??= new ResizeObserver(() => this.#sync(false));
      this.#observer.disconnect();
      this.#observer.observe((this.#observed = sizer));
    }
    const ta = this.querySelector('textarea');
    if (!ta) return;
    // Read everything first, then write, then read once: two layouts for a change, however long the text.
    const width = ta.clientWidth;
    // Hidden (a closed dialog) has no scrollHeight; the observer calls again when the box shows.
    if (!width || (!force && width === this.#width)) {
      this.#width = width;
      return;
    }
    this.#width = width;
    // Hold the host's height while the box is reset, so a page scrolled to the bottom does not jump.
    this.style.setProperty('min-block-size', `${this.offsetHeight}px`);
    ta.style.setProperty('block-size', 'auto');
    const fit = ta.scrollHeight + ta.offsetHeight - ta.clientHeight;
    ta.style.removeProperty('block-size');
    this.style.removeProperty('min-block-size');
    this.#fitted = true;
    this.setHostStyle('--_void-textarea-fit', `${fit}px`);
  }

  render() {
    return html`
      <textarea
        .value=${live(this.value)}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        name=${this.name}
        autocomplete=${this.autocomplete || nothing}
        minlength=${this.minlength ?? nothing}
        maxlength=${this.maxlength ?? nothing}
        inputmode=${this.inputMode || nothing}
        enterkeyhint=${this.enterKeyHint || nothing}
        autocapitalize=${this.autocapitalize || nothing}
        spellcheck=${this.spellcheckAttr ?? nothing}
        form=${this.formAttr ?? nothing}
        rows=${this.rows}
        style="--void-textarea-resize: ${this.resize}"
        aria-invalid=${this.error ? 'true' : 'false'}
        @input=${this._onInput}
        @change=${this._onChange}
      ></textarea>
      ${this.autosize && !fieldSizing() ? html`<span class="void-textarea-sizer" aria-hidden="true"></span>` : nothing}
      ${this.error ? html`<span class="void-textarea-error">${this.error}</span>` : ''}
    `;
  }

  protected formWriteNativeDefault(state: unknown): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('textarea');
    if (control) control.defaultValue = String(state ?? '');
  }

  protected formReadNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('textarea');
    if (control) this.value = control.value;
  }

  protected formSyncNative(): void {
    const control = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('textarea');
    if (control && control.value !== this.value) control.value = this.value;
  }

  private _onInput(e: Event): void {
    const ta = e.target as HTMLTextAreaElement;
    this.value = ta.value;
    this.dispatchEvent(new CustomEvent('void-input', { bubbles: true, composed: true, detail: { value: this.value } }));
  }

  private _onChange(e: Event): void {
    const ta = e.target as HTMLTextAreaElement;
    this.value = ta.value;
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
}

if (!customElements.get('void-textarea')) {
  customElements.define('void-textarea', VoidTextarea);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-textarea': VoidTextarea;
  }
}
