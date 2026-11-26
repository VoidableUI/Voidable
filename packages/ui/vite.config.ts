import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Build each component as its own entry so consumers can import
// individual components (e.g. import "@voidable/ui/components/button") and get
// the tree-shaking benefits of subpath imports.
const componentEntries = readdirSync('src/components')
  .filter((file) => file.endsWith('.ts'))
  .reduce<Record<string, string>>((entries, file) => {
    const name = file.replace(/\.ts$/, '');
    entries[`components/${name}`] = resolve(__dirname, `src/components/${file}`);
    return entries;
  }, {});

const entry: Record<string, string> = {
  index: resolve(__dirname, 'src/index.ts'),
  base: resolve(__dirname, 'src/base-entry.ts'),
  autoloader: resolve(__dirname, 'src/autoloader.ts'),
  dev: resolve(__dirname, 'src/dev/index.ts'),
  testing: resolve(__dirname, 'src/testing/index.ts'),
  ...componentEntries,
};

export default defineConfig({
  build: {
    // The build script empties dist/ itself: cem analyze writes the manifest
    // there first and the autoloader table is generated from it.
    emptyOutDir: false,
    lib: {
      entry,
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^lit/],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
  plugins: [
    dts({ entryRoot: 'src' }),
  ],
});
