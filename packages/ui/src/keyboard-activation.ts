import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { actionFor } from './keys.js';

export interface KeyboardActivationOptions {
  /** False while the host leaves the keys to an element inside it (a link button). Default: always on. */
  when?: () => boolean;
  /** True while the element is disabled: no key does anything. */
  disabled?: () => boolean;
  /** What activation does. Default: `host.click()`, a real `click` event that bubbles. */
  activate?: (e: KeyboardEvent) => void;
}

/**
 * Makes a custom element activate like a native `<button>`: the keys of its `activate` action (Enter and Space by
 * default; see `keymaps/activation.ts`) fire a real `click`, Enter on keydown and Space on keyup (and only when the
 * same element saw the keydown), and a disabled or `aria-disabled` element does nothing. Everything that listens
 * for `click` (an overlay trigger, `onClick`, `phx-click`, `wire:click`, Alpine `@click`, Turbo, a form's submit)
 * therefore works the same for the keyboard as for the mouse. Keys that land on an element inside the host (a
 * native `<a>`, `<button>` or `<input>` it contains) are left to that element. The host's class says which keys
 * (`static keyMap`) and an application can rebind or switch them off (`keys`, `configureKeys`).
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
    if (e.target !== this._host || this._options.when?.() === false || actionFor(this._host, e) !== 'activate') return;
    if (e.key === ' ') {
      // Space scrolls the page by default; it activates when released.
      e.preventDefault();
      this._armed = !this._disabled();
    } else if (!this._disabled()) {
      e.preventDefault();
      if (!e.repeat) this._activate(e);
    }
  };

  private _keyup = (e: KeyboardEvent): void => {
    if (e.key !== ' ' || e.target !== this._host || !this._armed) return;
    this._armed = false;
    if (this._options.when?.() === false || this._disabled() || actionFor(this._host, e) !== 'activate') return;
    e.preventDefault();
    this._activate(e);
  };
}
