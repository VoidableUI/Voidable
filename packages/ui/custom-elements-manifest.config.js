// Custom Elements Manifest analyzer config for @voidable/ui.
// Run via `pnpm build` (see package.json); writes dist/custom-elements.json.
import {
  hostAttributesPlugin,
  litPropertyPlugin,
  manifestSupplementPlugin,
  publishedManifestPlugin,
  voidEventsPlugin,
} from './cem/plugins.js';

export default {
  globs: ['src/**/*.ts'],
  outdir: 'dist',
  litelement: true,
  // package.json already declares `customElements`; never let the analyzer
  // rewrite (and reformat) package.json during a build.
  packagejson: false,
  // Order matters: per-class fixes, then the supplement (needs events), then
  // the published-shape cleanup last.
  plugins: [litPropertyPlugin(), voidEventsPlugin(), hostAttributesPlugin(), manifestSupplementPlugin(), publishedManifestPlugin()],
};
