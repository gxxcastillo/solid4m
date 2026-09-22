import solid from 'vite-plugin-solid';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // hot: false skips solid-refresh's `if (import.meta.hot)` guard: Vitest's
  // Vite runs in 'serve' mode, so the guard is always true, which
  // @vitest/coverage-v8 reports as a permanently half-covered branch.
  plugins: [solid({ hot: false })],
  test: {
    environment: 'happy-dom',
    setupFiles: ['@testing-library/jest-dom/vitest'],
    // Vitest 5's configDefaults.exclude dropped dist/cypress/etc; without
    // this, Vitest would also run this package's own build output (dist/,
    // dist/server/) as tests.
    exclude: [...configDefaults.exclude, '**/dist/**', '**/.tsbuild/**'],
    coverage: {
      provider: 'v8'
    }
  }
});
