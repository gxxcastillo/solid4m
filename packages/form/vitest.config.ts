import solid from 'vite-plugin-solid';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // hot: false skips solid-refresh's `if (import.meta.hot)` HMR guard, which
  // @vitest/coverage-v8 otherwise reports as an always-true, permanently
  // half-covered branch: Vitest's Vite instance runs in 'serve' mode, so the
  // guard compiles in true with no way to exercise its false path.
  plugins: [solid({ hot: false })],
  test: {
    environment: 'happy-dom',
    setupFiles: ['@testing-library/jest-dom/vitest'],
    // Vitest 5's configDefaults.exclude dropped dist/cypress/etc. tsc
    // --build's outDir is this package's own dist/, so without this exclude
    // Vitest also runs every compiled *.test.jsx it emits there — and those
    // fail, since dist/ has no co-located *.module.css.
    exclude: [...configDefaults.exclude, '**/dist/**'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 85,
        statements: 75
      }
    }
  }
});
