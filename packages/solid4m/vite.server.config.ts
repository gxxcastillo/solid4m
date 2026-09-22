import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const __dirname = dirname(fileURLToPath(import.meta.url));

// A second full build, not a second output format: vite-plugin-solid's
// dom-vs-ssr generate mode follows Vite's own per-module ssr transform flag,
// set only by the whole-build `build.ssr` option, so one `vite build` cannot
// produce both. Declarations and the theme copy are handled once, by the DOM
// build; this one only needs the runtime.
export default defineConfig({
  plugins: [solid({ ssr: true })],
  build: {
    ssr: true,
    minify: false,
    sourcemap: true,
    outDir: 'dist/server',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [/^solid-js(\/|$)/]
    }
  }
});
