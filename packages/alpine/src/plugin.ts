import type { Alpine } from 'alpinejs';

/**
 * Alpine.js plugin that bridges Voidable custom events into the Alpine
 * reactivity system and provides morph protection for Livewire re-renders.
 *
 * Usage:
 * ```js
 * import Alpine from 'alpinejs';
 * import { VoidableAlpine } from '@voidable/ui-alpine';
 *
 * Alpine.plugin(VoidableAlpine);
 * Alpine.start();
 * ```
 *
 * Template usage:
 * ```html
 * <void-input x-void-on:void-change="name = $event.detail.value">
 * </void-input>
 * ```
 */
export function VoidableAlpine(Alpine: Alpine): void {
  // x-void-on directive: listens for Voidable custom events and evaluates
  // the bound Alpine expression when they fire.
  // Usage: <void-input x-void-on:void-change="handler($event)">
  Alpine.directive('void-on', (el, { value: eventName, expression }, { evaluate }) => {
    if (!eventName) return;

    el.addEventListener(eventName, (event: Event) => {
      evaluate(expression, { scope: { $event: event } });
    });
  });

  // x-void-preserve directive: adds `wire:ignore` so Livewire's morph engine
  // skips the element and its Lit-rendered children. (`wire:ignore.self` only
  // protects the element's own attributes and still morphs children.)
  // Usage: <void-select x-void-preserve><select>...</select></void-select>
  Alpine.directive('void-preserve', (el) => {
    // Livewire reads this attribute from the live element at morph time, so
    // setting it during Alpine init is early enough for every later update.
    el.setAttribute('wire:ignore', '');
  });

  // $voidable magic: dispatch a CustomEvent to a Voidable component.
  // Usage: <button @click="$voidable($refs.input, 'void-clear')">Clear</button>
  Alpine.magic('voidable', () => {
    return (target: Element, eventName: string, detail: unknown = {}) => {
      target.dispatchEvent(
        new CustomEvent(eventName, { detail, bubbles: true, composed: true }),
      );
    };
  });
}
