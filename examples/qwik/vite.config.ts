import { defineConfig } from 'vite';
import { qwikVite } from '@builder.io/qwik/optimizer';

export default defineConfig({
  plugins: [
    qwikVite({
      csr: true,
    }),
  ],
  resolve: {
    conditions: ['development', 'import', 'module', 'browser', 'default'],
  },
});
