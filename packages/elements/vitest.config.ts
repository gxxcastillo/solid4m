import solid from 'vite-plugin-solid';
import { configDefaults, coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // hot: false skips solid-refresh's `if (import.meta.hot)` HMR guard, which
  // @vitest/coverage-v8 otherwise reports as an always-true, permanently
  // half-covered branch on every component (Vitest's Vite instance runs in
  // 'serve' mode, so the guard compiles in and is always true, with no way
  // to exercise its false path in a test run). This is what dropped these
  // trivial pass-through wrappers to 50% branch coverage and failed the
  // threshold — confirmed by reproducing it with hot: true first.
  plugins: [solid({ hot: false })],
  test: {
    environment: 'happy-dom',
    setupFiles: ['@testing-library/jest-dom/vitest'],
    // Vitest 5's own configDefaults.exclude dropped dist/cypress/etc, unlike
    // earlier versions — tsc --build's outDir is this package's own dist/, so
    // without this, Vitest also picks up and runs every compiled test file
    // it emits there.
    exclude: [...configDefaults.exclude, '**/dist/**'],
    coverage: {
      provider: 'v8',
      // index.ts is a pure re-export barrel; excluded since it adds no testable logic.
      exclude: [...coverageConfigDefaults.exclude, 'src/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90
      }
    }
  }
});
