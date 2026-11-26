import type { LitElement } from 'lit';

/** @internal Instance key under which a host's controller is stored (read by VoidElement's DOM overrides). */
export const PROJECTION_KEY = '__voidProjection';

/**
 * @internal What `VoidElement` needs from projection.ts (about 19 kB minified, of which a button, a badge or any
 * component with explicit parts needs none). projection.ts registers itself here when it is loaded, so a
 * component pays for it only if it, or what it extends, imports it: the components that render or host children
 * through a `ProjectionController` do (`useProjection()`), and so does the public `@voidable/ui/base` entry.
 */
export interface ProjectionApi {
  /** Gives a rendering component with no controller of its own the region-less default one. */
  create(host: LitElement): void;
  /** Drops the chrome of a serialised copy of a rendered element; true when it was one. */
  strip(host: Element): boolean;
  /** Focus inside `host` is parked by a morph. */
  isFocusParked(host: Element): boolean;
  /** Puts back focus a morph is still holding. */
  restoreParkedFocus(doc: Document): void;
}

/** Set by projection.ts when it loads; undefined until then. */
export const projectionApi: { current?: ProjectionApi } = {};
