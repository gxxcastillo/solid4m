import solid from 'vite-plugin-solid';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // hot: false skips solid-refresh's `if (import.meta.hot)` HMR guard, which
  // @vitest/coverage-v8 otherwise reports as an always-true, permanently
  // half-covered branch: Vitest's Vite instance runs in 'serve' mode, so the
  // guard compiles in true with no way to exercise its false path.
  plugins: [solid({ hot: false })],
  test: {
    environment: 'node',
    // Vitest 5's configDefaults.exclude dropped dist/cypress/etc. tsc
    // --build's outDir is this package's own dist/, so without this exclude
    // Vitest also runs every compiled test file it emits there.
    exclude: [...configDefaults.exclude, '**/dist/**'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 80,
        statements: 90
      }
    }
  }
});
