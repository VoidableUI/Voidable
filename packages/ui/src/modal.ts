import { property } from 'lit/decorators.js';
import { VoidElement } from './base.js';
import { defaultTrueBoolean } from './converters.js';
import { OverlayController } from './overlay.js';
import { attachChrome, PartsController } from './parts.js';

/**
 * The shared modal behind `<void-dialog>` and `<void-drawer>`.
 *
 * The author's parts (title, description, body, actions) stay the host's own
 * light-DOM children; the native `<dialog>` that `showModal()` needs lives in
 * the host's shadow root around a `<slot>`, so the top layer, `::backdrop`,
 * the inert page and focus containment come from the platform while the
 * author's markup stays the final DOM. The close button is part of that
 * internal structure too. The theme styles both with `::part(surface)` and
 * `::part(close)`.
 * @internal
 */
export class VoidModal extends VoidElement {
  /** Whether it is open. Set or remove the attribute (or property) to open and close it; the server may do the same through a morph. */
  @property({ type: Boolean, reflect: true }) open = false;
  /** Set `closable="false"` in markup to hide the close button and ignore Escape and backdrop presses. */
  @property({ type: Boolean, reflect: true, converter: defaultTrueBoolean }) closable = true;

  protected readonly _parts = new PartsController(this, {
    tags: ['title', 'description', 'body', 'actions'].map(p => `${this.localName}-${p}`),
    onChange: () => this._wire(),
  });

  protected readonly _overlay = new OverlayController(this, {
    kind: 'modal',
    surface: () => this._surface(),
    isOpen: () => this.open,
    setOpen: open => {
      this.open = open;
    },
    closable: () => this.closable,
  });

  private _chrome(): ShadowRoot {
    return attachChrome(
      this,
      '<dialog part="surface"><button type="button" part="close" aria-label="Close">&times;</button><slot></slot></dialog>'
    );
  }

  private _surface(): HTMLDialogElement {
    return this._chrome().querySelector('dialog')!;
  }

  override connectedCallback(): void {
    const close = this._chrome().querySelector('button')!;
    close.addEventListener('click', this._close);
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    this._chrome().querySelector('button')!.removeEventListener('click', this._close);
    super.disconnectedCallback();
  }

  // willUpdate, not updated: the overlay controller opens (and moves focus)
  // in hostUpdated, which runs before updated(), so the button must be hidden
  // first or a dialog opened with closable="false" focuses it.
  protected override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (changed.has('closable')) {
      const close = this._chrome().querySelector('button')!;
      close.hidden = !this.closable;
      // The theme's ::part(close) display rule outranks the UA [hidden] rule.
      close.style.display = this.closable ? '' : 'none';
    }
  }

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'aria-label'];
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);
    if (name === 'aria-label' && old !== value && this.isConnected) this._wire();
  }

  /**
   * Names the native dialog after the title part and describes it with the
   * description part. The dialog role lives only on the native `<dialog>` in
   * the shadow root, the one element assistive technology sees while it is
   * modal; giving the host the role as well exposes two nested dialogs to
   * DOM-based tools (Testing Library, Playwright) and, likely, Firefox.
   * See "Dialogs and drawers" in the composition guide for what this means for
   * role-scoped test queries.
   */
  private _wire(): void {
    const dialog = this._surface();
    const title = this._parts.one(`${this.localName}-title`);
    const description = this._parts.one(`${this.localName}-description`);
    if (title) {
      // The title is the dialog's heading, as the rendered <h2> used to be.
      this._parts.provide(title, 'role', 'heading');
      this._parts.provide(title, 'aria-level', '2');
    }
    // The dialog is in the shadow root and its title in the light DOM: an id
    // reference cannot cross that boundary, element references can.
    const reflect = dialog as HTMLDialogElement & { ariaLabelledByElements?: Element[] | null; ariaDescribedByElements?: Element[] | null };
    if ('ariaLabelledByElements' in reflect) {
      reflect.ariaLabelledByElements = title ? [title] : null;
      reflect.ariaDescribedByElements = description ? [description] : null;
    }
    const label = this.getAttribute('aria-label');
    if (title || !label) dialog.removeAttribute('aria-label');
    else dialog.setAttribute('aria-label', label);
    if (title && !('ariaLabelledByElements' in reflect)) dialog.setAttribute('aria-label', title.textContent?.trim() ?? '');
  }

  private _close = (): void => {
    this._overlay.requestClose('close-button');
  };
}
