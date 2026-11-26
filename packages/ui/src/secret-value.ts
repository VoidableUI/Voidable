import type { PropertyDeclaration } from 'lit';

/**
 * Value reflection for a control that can hide what is typed (a password field, a masked PIN): its
 * `value` is reflected to the attribute like any control's, except while it is a secret, because an
 * attribute is readable by every script, devtools panel, DOM snapshot and session recorder on the page.
 *
 * A component passes `secret` to {@link valueReflection} from its `requestUpdate`, and calls
 * {@link dropReflectedValue} when the secret state begins.
 */
export function valueReflection(
  secret: boolean,
  name: PropertyKey | undefined,
  options: PropertyDeclaration | undefined,
  declared: () => PropertyDeclaration,
): PropertyDeclaration | undefined {
  if (name !== 'value' || !secret) return options;
  return { ...(options ?? declared()), reflect: false };
}

/**
 * Removes the `value` attribute that was reflected before the control became a secret, keeping the
 * property: removing a reflected attribute from outside resets its property, so the value is put back.
 */
export function dropReflectedValue(el: HTMLElement & { value: unknown }): void {
  if (!el.hasAttribute('value')) return;
  const value = el.value;
  el.removeAttribute('value');
  el.value = value;
}
