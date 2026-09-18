import solid from 'vite-plugin-solid';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid()],
  test: {
    name: 'dom',
    environment: 'happy-dom',
    setupFiles: ['@testing-library/jest-dom/vitest'],
    // ssr.test.tsx runs under vitest.ssr.config.ts instead: it needs
    // vite-plugin-solid's `ssr: true` transform (real SSR-generate output),
    // which happy-dom's browser resolve condition can't produce — solid-js
    // resolves to its client build there, where renderToString is a stub.
    exclude: [...configDefaults.exclude, 'src/ssr.test.tsx'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 85,
        statements: 80
      }
    }
  }
});
