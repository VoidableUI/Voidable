import '@voidable/theme';
import '@voidable/theme/themes/void.css';
import '@voidable/theme/themes/dune.css';
import '@voidable/theme/themes/console.css';
import '@voidable/theme/themes/orbit.css';
import '@voidable/theme/themes/capsule.css';
import '@voidable/theme/themes/aurora.css';
import '@voidable/theme/themes/iris.css';
import '@voidable/theme/themes/paper.css';
import '@voidable/theme/skins/loft.css';
import '@voidable/theme/skins/slab.css';
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
    // The shipped themes: each is a file that only sets theme knobs.
    voidTheme: {
      toolbar: {
        icon: 'paintbrush',
        items: ['void', 'dune', 'console', 'orbit', 'capsule', 'aurora', 'iris', 'paper'],
        title: 'Theme',
      },
    },
    // Skins change structure (role and component tokens), not only values, and combine with any theme.
    voidSkin: {
      toolbar: {
        icon: 'component',
        items: [
          { value: 'none', title: 'Hairline (default)' },
          { value: 'loft', title: 'Loft skin' },
          { value: 'slab', title: 'Slab skin' },
        ],
        title: 'Skin',
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
    voidTheme: 'void',
    voidSkin: 'none',
  },
  decorators: [
    (storyFn, context) => {
      const theme = context.globals['theme'] ?? 'dark';
      const voidTheme = context.globals['voidTheme'] ?? 'void';
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-void-theme', voidTheme);
      const voidSkin = context.globals['voidSkin'] ?? 'none';
      if (voidSkin === 'none') root.removeAttribute('data-void-skin');
      else root.setAttribute('data-void-skin', voidSkin);
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
