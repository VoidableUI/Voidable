// `@voidable/ui/autoloader`: registers nothing up front. It watches the
// document for `void-*` tags (the ones already there and the ones added later
// by Turbo, LiveView, Livewire, htmx or any framework) and imports the module
// for each tag the first time it appears. A page that uses three components
// downloads three components.
//
// Importing this module starts it. Import it once, anywhere that runs in the
// browser:
//
//   import '@voidable/ui/autoloader';
//   // or, with no bundler, through an import map:
//   //   <script type="module">import '@voidable/ui/autoloader.js'</script>
//
// To wait until everything on the page is defined:
//
//   import { ready } from '@voidable/ui/autoloader';
//   await ready();
//
// The tag -> module table is generated from the Custom Elements Manifest at
// build time (packages/ui/cem/autoloader-table.js); it is not maintained by hand.
import { createAutoloader } from './autoloader-core.js';
import { modules, tags } from './autoloader-table.generated.js';

export type { Autoloader, AutoloaderOptions, ModuleLoader } from './autoloader-core.js';

export const autoloader = createAutoloader({ tags, modules });

autoloader.start();

/** Resolves when every `void-*` element currently on the page is defined. */
export const ready = (): Promise<void> => autoloader.ready();

/** Also watch a ShadowRoot or other subtree the document does not contain. */
export const observe = (root: ParentNode): void => autoloader.observe(root);

/**
 * Load components from `<base><name>.js` (for example a CDN directory holding
 * `dist/components/`) instead of next to this module.
 */
export const configure = (options: { base?: string }): void => autoloader.configure(options);
