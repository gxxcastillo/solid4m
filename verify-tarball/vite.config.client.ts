import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const __dirname = dirname(fileURLToPath(import.meta.url));

// No alias for `solid4m`: it must resolve through the real, npm-installed
// tarball in node_modules (run.mjs installs it there), unlike apps/docs and
// apps/a11y, which alias it to source.
export default defineConfig({
  plugins: [solid({ ssr: true })],
  build: {
    outDir: 'dist-client',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/entry-client.tsx'),
      formats: ['es'],
      fileName: () => 'client.js'
    }
  }
});
