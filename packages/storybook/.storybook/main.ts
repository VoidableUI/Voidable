import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import type { StorybookConfig } from '@storybook/web-components-vite';
import { voidManifestPlugin } from './manifest-vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig & { title: string } = {
  // Browser tab title for the manager (renders as "Voidable - Storybook").
  // Without this Storybook falls back to the package name ("storybook").
  title: 'Voidable',
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|ts)',
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  // The photographs used by the media stories live once, in the docs site.
  staticDirs: [{ from: '../../../docs/public/media', to: '/media' }],
  framework: '@storybook/web-components-vite',
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), voidManifestPlugin()];
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Before '@voidable/ui', which would otherwise swallow it as a prefix.
      '@voidable/ui/dev': resolve(__dirname, '../../ui/src/dev/index.ts'),
      '@voidable/ui': resolve(__dirname, '../../ui/src/index.ts'),
    };
    return config;
  },
};

export default config;
