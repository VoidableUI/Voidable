import '@voidable/theme';
import '@voidable/ui';

import type { Preview } from '@storybook/web-components-vite';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#000000' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    a11y: {
      config: {},
      options: {},
      test: 'error',
    },
  },
};

export default preview;
