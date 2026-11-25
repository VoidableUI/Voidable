import tseslint from 'typescript-eslint';
import litA11y from 'eslint-plugin-lit-a11y';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'storybook-static/**', 'ref/**', 'packages/liveview/*/deps/**', '**/_build/**', '**/vendor/**', '**/.astro/**'] },
  {
    files: ['packages/ui/src/**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      litA11y.configs.recommended,
    ],
  },
);
