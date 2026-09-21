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
        find: 'solid4m/styles.css',
        replacement: resolve(__dirname, '../../packages/solid4m/src/index.ts')
      },
      {
        find: 'solid4m/themes',
        replacement: resolve(__dirname, '../../packages/solid4m/themes')
      },
      {
        find: '@gxxc/solid4m-examples',
        replacement: resolve(__dirname, '../../packages/examples/src/index.ts')
      },
      {
        find: 'solid4m',
        replacement: resolve(__dirname, '../../packages/solid4m/src/index.ts')
      }
    ]
  }
});
