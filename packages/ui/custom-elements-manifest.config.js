// Custom Elements Manifest analyzer config for @voidable/ui.
// Run via `pnpm build` (see package.json); writes dist/custom-elements.json.
import { fieldDefaultsPlugin, litAttributeCasePlugin, voidEventsPlugin } from './cem/plugins.js';

export default {
  globs: ['src/**/*.ts'],
  outdir: 'dist',
  litelement: true,
  // package.json already declares `customElements`; never let the analyzer
  // rewrite (and reformat) package.json during a build.
  packagejson: false,
  plugins: [fieldDefaultsPlugin(), litAttributeCasePlugin(), voidEventsPlugin()],
};
