import { LitElement } from 'lit';
import { PROJECTION_KEY, type ProjectionController } from './projection.js';

export class VoidElement extends LitElement {
  /** @internal Set by ProjectionController for components that project consumer children. */
  declare [PROJECTION_KEY]?: ProjectionController;

  createRenderRoot(): this {
    return this;
  }

  // Frameworks that render children into a host keep calling these on the host
  // with nodes they consider its children. When such a node has been projected
  // into a container (see ProjectionController), forward the call to the node's
  // real parent instead of throwing NotFoundError.

  override insertBefore<T extends Node>(node: T, child: Node | null): T {
    const projection = this[PROJECTION_KEY];
    if (projection && child && child.parentNode !== this && projection.isProjected(child)) {
      return projection.insertBefore(node, child);
    }
    return super.insertBefore(node, child);
  }

  override removeChild<T extends Node>(child: T): T {
    const projection = this[PROJECTION_KEY];
    if (projection && child.parentNode !== this && projection.isProjected(child)) {
      return child.parentNode!.removeChild(child);
    }
    return super.removeChild(child);
  }

  override replaceChild<T extends Node>(node: Node, child: T): T {
    const projection = this[PROJECTION_KEY];
    if (projection && child.parentNode !== this && projection.isProjected(child)) {
      projection.insertBefore(node, child);
      return child.parentNode!.removeChild(child);
    }
    return super.replaceChild(node, child);
  }

  // Setting textContent or calling replaceChildren on a projecting host replaces the
  // consumer's content only (React and Vue set textContent for text-only children,
  // Solid clears with textContent = ''); the rendered chrome stays. Reading
  // textContent is unchanged.

  override get textContent(): string {
    return super.textContent ?? '';
  }

  override set textContent(value: string | null) {
    const projection = this[PROJECTION_KEY];
    const text = value === null || value === undefined ? '' : String(value);
    const nodes = text ? [this.ownerDocument.createTextNode(text)] : [];
    if (!projection || !projection.replaceContent(nodes)) {
      super.textContent = value;
    }
  }

  override replaceChildren(...nodes: (Node | string)[]): void {
    const projection = this[PROJECTION_KEY];
    if (projection) {
      const flat: Node[] = [];
      for (const n of nodes) {
        if (typeof n === 'string') flat.push(this.ownerDocument.createTextNode(n));
        else if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) flat.push(...Array.from(n.childNodes));
        else flat.push(n);
      }
      // Validate before touching existing content, as the DOM spec does.
      for (const n of flat) {
        if (n.nodeType === Node.DOCUMENT_NODE || n.nodeType === Node.DOCUMENT_TYPE_NODE || n.contains(this)) {
          throw new DOMException(
            `Failed to execute 'replaceChildren' on '${this.localName}': the new child cannot be inserted here.`,
            'HierarchyRequestError'
          );
        }
      }
      if (projection.replaceContent(flat)) return;
    }
    super.replaceChildren(...nodes);
  }

  /**
   * Supported pre-morph hook for server-driven DOM morphing (Turbo / idiomorph,
   * Livewire, LiveView / morphdom). Call it on a component right before a morph
   * compares the element's children, e.g. from `turbo:before-morph-element`,
   * Livewire's `morph.updating` or LiveView's `dom.onBeforeElUpdated`.
   *
   * It moves the consumer's children out of the rendered wrappers back onto the
   * element, in their original order, and takes every rendered node out of the
   * element, so the element looks like its server markup and the morph diffs like
   * with like: consumer nodes keep their identity and no chrome is ever recycled.
   * The rendered nodes are parked, not destroyed, and put back on re-projection, so
   * the native select, tab list and inputs keep their identity and state.
   * Properties are untouched. Where `Element.moveBefore` exists, all moves keep
   * focus and text selection without blur/focus events (the parked chrome waits in
   * a hidden `<void-projection-park>` element under `<html>`, outside any morph
   * target); elsewhere focus is restored after the move.
   *
   * The element re-projects on its own in a microtask, so the morph must run
   * synchronously after this call (Turbo, idiomorph, morphdom and Livewire all
   * do); otherwise call {@link voidReproject} once the morph has finished.
   *
   * Returns true if the element was unprojected, false if it does not project
   * children, has nothing rendered yet, or is already unprojected (safe to call on
   * any element, any number of times).
   */
  voidUnproject(): boolean {
    return this[PROJECTION_KEY]?.unproject() ?? false;
  }

  /**
   * Re-projects after {@link voidUnproject} without waiting for the scheduled
   * update. Resolves once the element has rendered. A no-op for elements that are
   * not unprojected.
   */
  voidReproject(): Promise<boolean> {
    return this[PROJECTION_KEY]?.reproject() ?? this.updateComplete;
  }
}
