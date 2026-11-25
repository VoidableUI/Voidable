import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface KeyboardActivationOptions {
  /** Enter activates, on keydown, as a native button does. Default true. */
  enter?: boolean | (() => boolean);
  /** Space activates, on keyup, as a native button does. Default true. */
  space?: boolean | (() => boolean);
  /** True while the element is disabled: no key does anything. */
  disabled?: () => boolean;
  /** What activation does. Default: `host.click()`, a real `click` event that bubbles. */
  activate?: (e: KeyboardEvent) => void;
}

const on = (v: boolean | (() => boolean) | undefined): boolean => (typeof v === 'function' ? v() : v ?? true);

/**
 * Makes a custom element activate like a native `<button>`: Enter fires a real `click` on keydown, Space fires one
 * on keyup (and only when the same element saw the keydown), and a disabled or `aria-disabled` element does
 * nothing. Everything that listens for `click` (an overlay trigger, `onClick`, `phx-click`, `wire:click`, Alpine
 * `@click`, Turbo, a form's submit) therefore works the same for the keyboard as for the mouse. Keys that land on
 * an element inside the host (a native `<a>`, `<button>` or `<input>` it contains) are left to that element.
 */
export class KeyboardActivation implements ReactiveController {
  private _armed = false;

  constructor(
    private readonly _host: ReactiveControllerHost & HTMLElement,
    private readonly _options: KeyboardActivationOptions = {},
  ) {
    _host.addController(this);
  }

  hostConnected(): void {
    this._host.addEventListener('keydown', this._keydown);
    this._host.addEventListener('keyup', this._keyup);
    this._host.addEventListener('blur', this._disarm);
  }

  hostDisconnected(): void {
    this._host.removeEventListener('keydown', this._keydown);
    this._host.removeEventListener('keyup', this._keyup);
    this._host.removeEventListener('blur', this._disarm);
    this._armed = false;
  }

  private _disabled(): boolean {
    return !!this._options.disabled?.() || this._host.getAttribute('aria-disabled') === 'true';
  }

  private _activate(e: KeyboardEvent): void {
    if (this._options.activate) this._options.activate(e);
    else this._host.click();
  }

  private _disarm = (): void => {
    this._armed = false;
  };

  private _keydown = (e: KeyboardEvent): void => {
    if (e.target !== this._host || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    if (e.key === 'Enter' && on(this._options.enter)) {
      if (this._disabled()) return;
      e.preventDefault();
      if (!e.repeat) this._activate(e);
    } else if (e.key === ' ' && on(this._options.space)) {
      // Space scrolls the page by default; it activates when released.
      e.preventDefault();
      this._armed = !this._disabled();
    }
  };

  private _keyup = (e: KeyboardEvent): void => {
    if (e.key !== ' ' || e.target !== this._host || !this._armed) return;
    this._armed = false;
    if (!on(this._options.space) || this._disabled()) return;
    e.preventDefault();
    this._activate(e);
  };
}
