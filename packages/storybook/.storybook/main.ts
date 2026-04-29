import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import type { StorybookConfig } from '@storybook/web-components-vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|ts)',
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/web-components-vite',
  async viteFinal(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@voidable/ui': resolve(__dirname, '../../ui/src/index.ts'),
    };
    return config;
  },
};

export default config;
