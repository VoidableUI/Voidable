import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Test against core sources so the suite does not depend on build order.
      '@voidable/ui': resolve(__dirname, '../ui/src/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
