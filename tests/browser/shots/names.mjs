// SPDX-License-Identifier: MIT
//
// The one place that turns an id (a page id, or a story id such as `story:charts-bar-chart--custom-stagger`)
// into a name that is safe in a path. Artifact upload and Windows reject " : < > | * ? and control
// characters, so no file or directory the shots tooling writes may contain one. The readable id stays
// in the manifest, the gallery's index and the report tables; only the path is mapped.
import { readdirSync } from 'node:fs';

/** `story:x` becomes `story-x`; any other character a path cannot hold becomes `_`. */
export const safeName = (id) => id.replace(/:/g, '-').replace(/["<>|*?\u0000-\u001f]/g, '_');

/** The paths under `dir` that hold a character artifact upload or Windows rejects. */
export function unsafePaths(dir) {
  return readdirSync(dir, { recursive: true }).filter((p) => /[":<>|*?\u0000-\u001f]/.test(String(p)));
}
