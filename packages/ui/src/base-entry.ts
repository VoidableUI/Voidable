// The `@voidable/ui/base` entry (dist/base.js). Components import ./base.js, which carries no projection code;
// this entry adds it, so a component an application writes on `VoidElement` that renders gets the default
// ProjectionController as before (see projection-api.ts).
import { useProjection } from './projection.js';

export { VoidElement } from './base.js';

useProjection();
