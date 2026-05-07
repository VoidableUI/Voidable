import '@voidable/theme';
import '@voidable/ui';

import type { Preview } from '@storybook/web-components-vite';
import { themes } from 'storybook/theming';

const preview: Preview = {
  globalTypes: {
    theme: {
      toolbar: {
        icon: 'mirror',
        items: ['dark', 'light'],
        title: 'Theme',
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  decorators: [
    (storyFn, context) => {
      const theme = context.globals['theme'] ?? 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.background = theme === 'light' ? '#ffffff' : '#000000';
      return storyFn();
    },
  ],
  parameters: {
    docs: {
      theme: themes.dark,
    },
    a11y: {
      config: {},
      options: {},
      test: 'error',
    },
  },
};

export default preview;
