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
    // Off unless asked for (`mise run test:coverage` passes --coverage). No
    // thresholds: the numbers are reported, not enforced.
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
    },
    environment: 'happy-dom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
