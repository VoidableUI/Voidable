/**
 * Dismissing a notice (alert, banner, toast), shared so the three behave alike.
 *
 * The close part wraps the author's own control. Pressing it fires `void-close`
 * (it bubbles, is composed and is not cancelable: by then the user has chosen;
 * each notice dispatches it from its own source) and the notice removes itself. When focus was inside the notice, it would
 * fall to the document body with the node, so it moves first to the next
 * focusable element after the notice in document order (where the reader's
 * attention continues), or the last one before it when nothing follows.
 */

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

function isFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.closest('[inert], fieldset[disabled]')) return false;
  if (el.getAttribute('aria-disabled') === 'true' && el.tabIndex < 0) return false;
  if (el.tabIndex < 0) return false;
  if (el.hidden || el.closest('[hidden]:not([hidden="until-found"])')) return false;
  const check = (el as HTMLElement & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  if (typeof check === 'function' && !check.call(el, { visibilityProperty: true })) return false;
  return true;
}

/** The element focus should go to when `host`, which holds it, is removed; `null` for none. */
export function focusSuccessor(host: HTMLElement): HTMLElement | null {
  // A notice inside a modal or a popover must not hand focus to the inert page behind it. (The toast
  // container is a popover too, but only to sit in the top layer: focus goes back to the page.)
  const scope: ParentNode =
    host.parentElement?.closest('dialog, void-dialog, void-drawer, [popover]:not(void-toast-container), [role="dialog"]') ?? host.ownerDocument;
  const candidates = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !host.contains(el) && isFocusable(el));
  const after = candidates.find(el => host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  if (after) return after;
  const before = candidates.filter(el => host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
  return before[before.length - 1] ?? null;
}

/** Removes `host`, first moving focus out of it if it held focus (see the file comment). */
export function removeWithFocus(host: HTMLElement): void {
  const active = host.ownerDocument.activeElement;
  const held = !!active && active !== host.ownerDocument.body && host.contains(active);
  const next = held ? focusSuccessor(host) : null;
  host.remove();
  if (next?.isConnected) next.focus();
}

/**
 * Whether a click landed on a working control inside a notice's close part (one
 * that is not disabled). The notice then fires `void-close` itself (so the event
 * is declared in its own source and manifest) and calls {@link removeWithFocus}.
 */
export function closeControlPressed(close: HTMLElement | null, e: Event): boolean {
  if (!close || !(e.target instanceof Node) || !close.contains(e.target)) return false;
  const control = close.firstElementChild as (HTMLElement & { disabled?: boolean }) | null;
  return !(control?.disabled || control?.hasAttribute('disabled') || control?.getAttribute('aria-disabled') === 'true');
}
