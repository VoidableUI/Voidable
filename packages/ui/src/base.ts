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
      if (projection.replaceContent(flat)) return;
    }
    super.replaceChildren(...nodes);
  }
}
