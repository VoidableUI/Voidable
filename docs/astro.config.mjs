import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Void UI',
      social: {
        github: 'https://github.com/VoidableUI/Voidable',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: '' },
          ],
        },
        {
          label: 'Resources',
          items: [
            { label: 'Storybook', link: '/storybook/', attrs: { target: '_blank' } },
          ],
        },
      ],
    }),
  ],
});
