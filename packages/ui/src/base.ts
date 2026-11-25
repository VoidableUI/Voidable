import { LitElement } from 'lit';
import { PROJECTION_KEY, type ProjectionController } from './projection.js';

export { ProjectionController, PROJECTION_KEY } from './projection.js';
export type { ProjectionOptions, ProjectionRegion, ProjectionTarget } from './projection.js';

export class VoidElement extends LitElement {
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
}
