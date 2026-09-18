import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Plugin, defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import solid from 'vite-plugin-solid';

const __dirname = dirname(fileURLToPath(import.meta.url));

const bundledPackages = [
  '@gxxc/solid-formation-elements',
  '@gxxc/solid-formation-fields',
  '@gxxc/solid-formation-form',
  '@gxxc/solid-formation-state',
  '@gxxc/solid-formation-validation',
  'type-fest'
];

// Ship the theme stylesheets (token overrides) as standalone, importable files
// under dist/themes/. `themes/base.css` is also bundled into dist/style.css, but
// copying it lets consumers pull just the tokens if they want. Structural CSS
// (the CSS modules) is emitted separately by Vite as dist/style.css.
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

export default defineConfig({
  plugins: [solid(), dts({ rollupTypes: true, bundledPackages }), copyThemes()],
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
      external: ['solid-js']
    }
  }
});
