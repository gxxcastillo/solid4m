import solid from 'vite-plugin-solid';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // hot: false skips solid-refresh's `if (import.meta.hot)` HMR guard, which
  // @vitest/coverage-v8 otherwise reports as an always-true, permanently
  // half-covered branch on every component (Vitest's Vite instance runs in
  // 'serve' mode, so the guard compiles in and is always true, with no way
  // to exercise its false path in a test run).
  plugins: [solid({ hot: false })],
  test: {
    environment: 'happy-dom',
    setupFiles: ['@testing-library/jest-dom/vitest'],
    // Vitest 5's own configDefaults.exclude dropped dist/cypress/etc, unlike
    // earlier versions — this package's own build (dist/ and dist/server/)
    // would otherwise also get picked up and run as tests.
    exclude: [...configDefaults.exclude, '**/dist/**'],
    coverage: {
      provider: 'v8'
    }
  }
});
