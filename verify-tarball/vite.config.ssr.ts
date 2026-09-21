import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const __dirname = dirname(fileURLToPath(import.meta.url));

// `solid4m` stays external (not bundled): the built dist-ssr/ssr-entry.js
// this produces is run directly with plain `node`, so its own
// `import ... from 'solid4m'` resolves through Node's real exports-map
// resolution — the same path a deployed SolidStart server takes — rather than
// through anything Vite does at this build step.
export default defineConfig({
  plugins: [solid({ ssr: true })],
  build: {
    ssr: true,
    outDir: 'dist-ssr',
    emptyOutDir: true,
    // `lib.fileName` is a dom-lib-build option that this ssr+lib combination
    // doesn't honor — the output is named after the entry file instead
    // (ssr-entry.js), which tests/hydrate.spec.ts imports directly.
    lib: {
      entry: resolve(__dirname, 'ssr-entry.tsx'),
      formats: ['es']
    },
    rollupOptions: {
      external: [/^solid-js(\/|$)/, 'solid4m']
    }
  }
});
