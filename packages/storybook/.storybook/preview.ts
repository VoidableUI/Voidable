import '@voidable/theme';
import '@voidable/theme/themes/void.css';
import '@voidable/theme/themes/dune.css';
import '@voidable/theme/themes/console.css';
import '@voidable/ui';
// Development warnings: misused attributes, values and children reach the console, so a story that
// misuses a component is caught by `mise run test:warnings` and by anyone looking at it.
import '@voidable/ui/dev';

import type { Preview } from '@storybook/web-components-vite';
import { themes } from 'storybook/theming';

const preview: Preview = {
  globalTypes: {
    theme: {
      toolbar: {
        icon: 'mirror',
        items: ['dark', 'light'],
        title: 'Colour scheme',
      },
    },
    // The demonstration themes: each is a file that only sets theme knobs.
    voidTheme: {
      toolbar: {
        icon: 'paintbrush',
        items: ['void', 'dune', 'console'],
        title: 'Theme',
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
    voidTheme: 'void',
  },
  decorators: [
    (storyFn, context) => {
      const theme = context.globals['theme'] ?? 'dark';
      const voidTheme = context.globals['voidTheme'] ?? 'void';
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-void-theme', voidTheme);
      // The page colour comes from the theme, so a tinted page shows too.
      root.style.background = 'var(--void-color-bg)';
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
