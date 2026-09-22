import solid from 'vite-plugin-solid';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // hot: false skips solid-refresh's `if (import.meta.hot)` HMR guard, which
  // @vitest/coverage-v8 otherwise reports as an always-true, permanently
  // half-covered branch on every component: Vitest's Vite instance runs in
  // 'serve' mode, so the guard compiles in true with no way to exercise its
  // false path.
  plugins: [solid({ hot: false })],
  test: {
    name: 'dom',
    environment: 'happy-dom',
    setupFiles: ['@testing-library/jest-dom/vitest'],
    // ssr.test.tsx runs under vitest.ssr.config.ts instead: it needs
    // vite-plugin-solid's `ssr: true` transform (real SSR-generate output),
    // which happy-dom's browser resolve condition can't produce — solid-js
    // resolves to its client build there, where renderToString is a stub.
    // '**/dist/**' is explicit because Vitest 5's own configDefaults.exclude
    // dropped dist/cypress/etc, and tsc --build's outDir is this package's
    // own dist/.
    exclude: [...configDefaults.exclude, 'src/ssr.test.tsx', '**/dist/**'],
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
