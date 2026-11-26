import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import { componentSidebar, writeComponentPages } from './src/lib/component-pages.mjs';

// One page per component, written from the Custom Elements Manifest before
// Starlight scans the content directory.
writeComponentPages();

const SITE = 'https://voidable.dev';
const OG_IMAGE = `${SITE}/og.png`;
const OG_ALT = 'Voidable. Devoid of style.';

export default defineConfig({
  site: SITE,
  // Stated explicitly: this Astro leaves `gfm` unset for the Markdown processor
  // to default, and the MDX integration reads the unset value as off, which
  // turns every table in the docs into a paragraph of pipes.
  markdown: { gfm: true },
  vite: {
    resolve: {
      alias: {
        // Before '@voidable/ui', which would otherwise swallow it as a prefix.
        '@voidable/ui/dev': new URL('../packages/ui/src/dev/index.ts', import.meta.url).pathname,
        '@voidable/ui': new URL('../packages/ui/src/index.ts', import.meta.url).pathname,
        '@voidable/theme': new URL('../packages/theme/src/index.css', import.meta.url).pathname,
      },
    },
  },
  integrations: [
    starlight({
      title: 'Voidable',
      description: 'Framework-agnostic Lit 3 web components. Light DOM, zero visual CSS until a theme is loaded, token-driven theming.',
      plugins: [
        starlightLlmsTxt({
          projectName: 'Voidable',
          description:
            'Voidable is a framework-agnostic web component library built on Lit 3. Components render in the light DOM and ship with no visual CSS until the @voidable/theme token package is loaded. Every component is a `void-*` custom element, so the same markup works in HTML, React, Rails, Phoenix, Laravel and any other stack.',
          details:
            'Each component page lists its attributes (type, values, default), events with their `detail`, where children go, form behaviour, keyboard keys, accessibility notes and common mistakes, with an example in HTML, JSX, ERB, HEEx and Blade. Those pages are generated from the library\'s Custom Elements Manifest, so they match the code that ships. The `voidable` command-line tool (`ref`, `check`, `gen snippet`, `mcp`) carries the same data offline; start with the "For AI agents" page.',
        }),
      ],
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: OG_IMAGE } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: OG_ALT } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: OG_IMAGE } },
        { tag: 'meta', attrs: { name: 'twitter:image:alt', content: OG_ALT } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        { tag: 'link', attrs: { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' } },
      ],
      customCss: ['./src/styles/voidable-docs.css', './src/styles/fonts.css', './src/styles/starlight-bridge.css', './src/styles/demos.css'],
      components: {
        Head: './src/components/Head.astro',
        Footer: './src/components/Footer.astro',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/VoidableUI/Voidable',
        },
        {
          icon: 'npm',
          label: 'npm',
          href: 'https://www.npmjs.com/package/@voidable/ui',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Loading components', slug: 'getting-started/loading' },
            { label: 'Development warnings', slug: 'getting-started/development-warnings' },
            { label: 'Design Philosophy', slug: 'getting-started/design-philosophy' },
            { label: 'Component Authoring', slug: 'getting-started/component-authoring' },
            { label: 'Theming', slug: 'getting-started/theming' },
            { label: 'Build a skin', slug: 'getting-started/skins' },
            { label: 'Theme builder', link: '/theme/' },
            { label: 'Design Tokens', slug: 'getting-started/tokens' },
            { label: 'Migrating from the framework packages', slug: 'getting-started/migrating-from-framework-packages' },
            { label: 'For AI agents', slug: 'getting-started/for-agents' },
            { label: 'Measuring agent-friendliness', slug: 'getting-started/agent-evals' },
            { label: 'Testing in real browsers', slug: 'getting-started/browser-tests' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Forms', slug: 'guides/forms' },
            { label: 'Composition and parts', slug: 'guides/composition' },
            { label: 'Events', slug: 'guides/events' },
            { label: 'API conventions', slug: 'guides/conventions' },
            { label: 'Upgrading to 0.8', slug: 'guides/upgrading' },
            { label: 'Road to 1.0', slug: 'guides/road-to-1-0' },
            { label: 'Server-rendered apps', slug: 'guides/server-rendered' },
            { label: 'Accessibility', slug: 'guides/accessibility' },
            { label: 'Accessibility statement', slug: 'guides/accessibility-statement' },
            { label: 'Screen reader results', slug: 'guides/screen-reader-results' },
            { label: 'Browser support', slug: 'guides/browser-support' },
            { label: 'Translation', slug: 'guides/translation' },
            { label: 'Testing', slug: 'guides/testing' },
            { label: 'Editor setup and typings', slug: 'guides/editor-setup' },
          ],
        },
        {
          label: 'Frameworks',
          autogenerate: { directory: 'frameworks' },
        },
        {
          label: 'Patterns',
          items: [
            { label: 'Overview', slug: 'patterns/overview' },
            { label: 'App shell', slug: 'patterns/app-shell' },
            { label: 'Page head', slug: 'patterns/page-head' },
            { label: 'Section', slug: 'patterns/section' },
            { label: 'Labels', slug: 'patterns/labels' },
            { label: 'Figure', slug: 'patterns/figure' },
            { label: 'Description list', slug: 'patterns/description-list' },
            { label: 'State', slug: 'patterns/state' },
            { label: 'Empty state', slug: 'patterns/empty-state' },
            { label: 'Toolbar', slug: 'patterns/toolbar' },
            { label: 'UI over imagery', slug: 'patterns/ui-over-imagery' },
          ],
        },
        {
          label: 'Components',
          items: componentSidebar(),
        },
        {
          label: 'Showcase',
          items: [
            { label: 'Dashboard', link: '/showcase/dashboard/' },
            { label: 'Visual review gallery', link: '/gallery/' },
          ],
        },
      ],
    }),
  ],
});
