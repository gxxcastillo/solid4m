import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Plugin, defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import solid from 'vite-plugin-solid';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ship the theme stylesheets (token overrides) as standalone, importable files
// under dist/themes/. `themes/base.css` is also bundled into dist/index.css, but
// copying it lets consumers pull just the tokens if they want. Structural CSS
// (the CSS modules) is emitted separately by Vite as dist/index.css — named
// after the lib.fileName below, not the fixed `style.css` Vite 5 used to emit
// regardless of it. package.json's `./styles.css` export points at the real
// file rather than fighting Vite's naming; consumers only ever see the
// subpath, never the underlying dist filename.
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

// vite-plugin-solid only compiles hydratable output when its own `ssr` option
// is set, regardless of whether *this* build targets the DOM or the server —
// it picks dom-vs-ssr generate mode per module from Vite's own ssr transform
// flag, which vite.server.config.ts's `build.ssr` turns on and this file
// leaves off. A non-hydratable DOM build (the option this package used before
// it could be server-rendered at all) would mismatch the markup produced by
// that server build.
export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    dts({ exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'] }),
    copyThemes()
  ],
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
      // Matches the bare specifier and every subpath (solid-js/web,
      // solid-js/store, …) — the old bare-only pattern let solid-js/web and
      // solid-js/store get bundled into dist/index.js, inlining a second copy
      // of solid's DOM runtime that assumes `document` exists (B5).
      external: [/^solid-js(\/|$)/]
    }
  }
});
