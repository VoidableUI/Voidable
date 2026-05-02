import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://voidable.dev',
  vite: {
    resolve: {
      alias: {
        '@voidable/ui': new URL('../packages/ui/src/index.ts', import.meta.url).pathname,
      },
    },
  },
  integrations: [
    starlight({
      title: 'Void UI',
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
            { label: 'Theming', slug: 'getting-started/theming' },
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
      ],
    }),
  ],
});
