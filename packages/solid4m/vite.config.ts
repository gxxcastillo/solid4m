import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Plugin, defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import solid from 'vite-plugin-solid';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ship the theme stylesheets (token overrides) as standalone, importable files
// under dist/themes/. `themes/base.css` is also bundled into dist/index.css,
// but copying it lets consumers pull just the tokens if they want. Structural
// CSS (the CSS modules) is emitted separately by Vite, named after the
// lib.fileName below; package.json's `./styles.css` export points at that
// file, so consumers only ever see the subpath, never the dist filename.
function copyThemes(): Plugin {
  return {
    name: 'sf-copy-themes',
    closeBundle() {
      const src = resolve(__dirname, 'themes');
      const dest = resolve(__dirname, 'dist/themes');
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
    }
  };
}

// `solid({ ssr: true })` here does not select the server build (see
// vite.server.config.ts for what does): it makes vite-plugin-solid emit
// hydratable DOM output, without which this build's markup would mismatch
// what the server build renders.
export default defineConfig({
  plugins: [solid({ ssr: true }), dts({ exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'] }), copyThemes()],
  build: {
    minify: false,
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false
      },
      mangle: false
    },
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      // Must match every subpath (solid-js/web, solid-js/store, …), not just
      // the bare specifier, or solid-js/web's DOM runtime — which assumes
      // `document` exists — gets inlined into dist/index.js.
      external: [/^solid-js(\/|$)/]
    }
  }
});
