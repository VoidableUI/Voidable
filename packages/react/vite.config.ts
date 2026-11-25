import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [/^lit/, /^react/, /^@voidable\/ui/],
      output: {
        // Bundlers drop module-level directives; re-emit it so Next.js App
        // Router treats the wrappers as client components.
        banner: '"use client";',
      },
    },
  },
  plugins: [
    dts({ rollupTypes: true }),
  ],
});
