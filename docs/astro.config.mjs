import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://voidable.dev',
  vite: {
    resolve: {
      alias: {
        '@voidable/ui': new URL('../packages/ui/src/index.ts', import.meta.url).pathname,
        '@voidable/theme': new URL('../packages/theme/src/index.css', import.meta.url).pathname,
      },
    },
  },
  integrations: [
    starlight({
      title: 'Voidable',
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        { tag: 'link', attrs: { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' } },
      ],
      customCss: ['./src/styles/voidable-docs.css', './src/styles/fonts.css', './src/styles/starlight-bridge.css'],
      components: {
        Head: './src/components/Head.astro',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/VoidableUI/Voidable',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Design Philosophy', slug: 'getting-started/design-philosophy' },
            { label: 'Component Authoring', slug: 'getting-started/component-authoring' },
            { label: 'Theming', slug: 'getting-started/theming' },
            { label: 'Design Tokens', slug: 'getting-started/tokens' },
          ],
        },
        {
          label: 'Frameworks',
          items: [
            { label: 'React', slug: 'frameworks/react' },
            { label: 'Vue', slug: 'frameworks/vue' },
            { label: 'Solid', slug: 'frameworks/solid' },
            { label: 'Svelte', slug: 'frameworks/svelte' },
            { label: 'Angular', slug: 'frameworks/angular' },
            { label: 'Hotwire', slug: 'frameworks/hotwire' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Overview', slug: 'components/overview' },
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
