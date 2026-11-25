import { defineConfig } from 'vitest/config';

export default defineConfig({
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
  },
});
