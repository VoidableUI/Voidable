import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';

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
            'Voidable is a framework-agnostic web component library built on Lit 3. Components render in the Light DOM and ship with zero visual CSS; styling comes from the @voidable/theme token package.',
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
            { label: 'Theme builder', link: '/theme/' },
            { label: 'Design Tokens', slug: 'getting-started/tokens' },
            { label: 'Migrating from the framework packages', slug: 'getting-started/migrating-from-framework-packages' },
            { label: 'Measuring agent-friendliness', slug: 'getting-started/agent-evals' },
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
          items: [
            { label: 'Overview', slug: 'components/overview' },
            { label: 'Button', slug: 'components/button' },
            { label: 'Table', slug: 'components/table' },
            { label: 'Keyboard and ARIA', slug: 'components/keyboard' },
            { label: 'Storybook', link: '/storybook/', attrs: { target: '_blank' } },
          ],
        },
        {
          label: 'Showcase',
          items: [
            { label: 'Dashboard', link: '/showcase/dashboard/' },
          ],
        },
      ],
    }),
  ],
});
