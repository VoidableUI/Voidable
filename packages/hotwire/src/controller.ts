import { Controller } from '@hotwired/stimulus';

/**
 * Stimulus controller that bridges CustomEvents from Voidable web components
 * so parent controllers can handle them via `data-action`.
 *
 * Usage:
 * ```html
 * <void-button
 *   data-controller="void-event"
 *   data-void-event-events-value="void-click"
 *   data-action="void-click->form#submit"
 * >
 *   Save
 * </void-button>
 * ```
 */
export class VoidEventController extends Controller {
  static values = {
    events: { type: String, default: '' },
  };

  declare eventsValue: string;
  private _bindings: Array<{ event: string; handler: EventListener }> = [];

  connect(): void {
    this._bind();
  }

  eventsValueChanged(): void {
    this._unbind();
    this._bind();
  }

  disconnect(): void {
    this._unbind();
  }

  private _bind(): void {
    const events = this.eventsValue.split(',').filter(Boolean);

    for (const event of events) {
      const handler = ((e: CustomEvent) => {
        this.dispatch(event, { detail: e.detail, prefix: '' });
      }) as EventListener;
      this.element.addEventListener(event, handler);
      this._bindings.push({ event, handler });
    }
  }

  private _unbind(): void {
    for (const { event, handler } of this._bindings) {
      this.element.removeEventListener(event, handler);
    }
    this._bindings = [];
  }
}
