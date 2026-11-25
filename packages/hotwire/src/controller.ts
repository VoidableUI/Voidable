import { Controller } from '@hotwired/stimulus';

/**
 * @deprecated This controller is no longer needed and does nothing.
 *
 * Stimulus handles custom events natively, so Voidable events can be wired
 * directly with `data-action`:
 *
 * ```html
 * <void-button data-action="void-click->form#submit">Save</void-button>
 * ```
 *
 * Earlier versions re-dispatched each listed event via `this.dispatch(event,
 * { prefix: '' })`. Stimulus builds the event type as `prefix ? prefix:name :
 * name`, so an empty prefix produced the same event type on the same element
 * and re-triggered the listener until the call stack overflowed. The export is
 * kept (as a harmless no-op) so existing `application.register('void-event',
 * VoidEventController)` calls keep working.
 */
export class VoidEventController extends Controller {
  static values = {
    events: { type: String, default: '' },
  };

  declare eventsValue: string;
}
