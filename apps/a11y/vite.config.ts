import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: [
      {
        find: 'solid-formation/styles.css',
        replacement: resolve(__dirname, '../../packages/solid-formation/src/index.ts')
      },
      {
        find: 'solid-formation/themes',
        replacement: resolve(__dirname, '../../packages/solid-formation/themes')
      },
      {
        find: '@gxxc/solid-formation-examples',
        replacement: resolve(__dirname, '../../packages/examples/src/index.ts')
      },
      {
        find: 'solid-formation',
        replacement: resolve(__dirname, '../../packages/solid-formation/src/index.ts')
      }
    ]
  }
});
