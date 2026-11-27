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
// The shipped languages, for the Locale toolbar: each registers itself.
import '@voidable/ui/messages/fr';
import '@voidable/ui/messages/ar';
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
    // Reading direction: keys, sides and edges that follow it (tabs, sliders, menus, sidebar) flip.
    direction: {
      toolbar: {
        icon: 'transfer',
        items: [
          { value: 'ltr', title: 'Left to right' },
          { value: 'rtl', title: 'Right to left' },
        ],
        title: 'Direction',
      },
    },
    // The language of the words the components write and of dates and numbers: sets `lang` on the page.
    // Pair Arabic with Direction: Right to left.
    locale: {
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'fr', title: 'Français' },
          { value: 'ar', title: 'العربية' },
        ],
        title: 'Locale',
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
    // Touch targets: on a coarse pointer (a phone, or a desktop browser emulating one) every control's hit
    // area grows to 44px; "Off" is data-hit-target="off", the same as --void-hit-target: 0px.
    hitTarget: {
      toolbar: {
        icon: 'cursor',
        items: [
          { value: 'device', title: 'Touch targets: device default' },
          { value: 'off', title: 'Touch targets: off' },
        ],
        title: 'Touch targets',
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
    direction: 'ltr',
    locale: 'en',
    voidTheme: 'void',
    voidSkin: 'none',
    hitTarget: 'device',
  },
  decorators: [
    (storyFn, context) => {
      const theme = context.globals['theme'] ?? 'dark';
      const voidTheme = context.globals['voidTheme'] ?? 'void';
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      root.setAttribute('dir', context.globals['direction'] ?? 'ltr');
      root.setAttribute('lang', context.globals['locale'] ?? 'en');
      root.setAttribute('data-void-theme', voidTheme);
      const voidSkin = context.globals['voidSkin'] ?? 'none';
      if (voidSkin === 'none') root.removeAttribute('data-void-skin');
      else root.setAttribute('data-void-skin', voidSkin);
      if (context.globals['hitTarget'] === 'off') root.setAttribute('data-hit-target', 'off');
      else root.removeAttribute('data-hit-target');
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
