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
    // Vitest 5's own configDefaults.exclude dropped dist/cypress/etc, unlike
    // earlier versions: tsc --build's outDir is this package's own dist/, so
    // without this, Vitest also picks up and runs every compiled test file
    // it emits there.
    exclude: [...configDefaults.exclude, '**/dist/**'],
    coverage: {
      provider: 'v8'
    }
  }
});
